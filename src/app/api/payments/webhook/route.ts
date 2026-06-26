import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkGameAchievements, checkReferralAchievement } from "@/lib/achievements/check";
import { sendNotification } from "@/lib/notifications/bot";

// POST /api/payments/webhook — ЮКасса webhook
export async function POST(req: NextRequest) {
  const body = await req.text();
  let event: {
    type: string;
    event: string;
    object: {
      id: string;
      status: string;
      metadata?: { paymentId?: string; userId?: string; gameId?: string };
    };
  };

  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "payment.succeeded") {
    return NextResponse.json({ ok: true });
  }

  const { metadata } = event.object;
  if (!metadata?.paymentId || !metadata?.userId || !metadata?.gameId) {
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  const { paymentId, userId, gameId } = metadata;

  // Идемпотентность: проверяем что платёж ещё PENDING
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "PENDING") {
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction(async (tx) => {
    // Обновить статус платежа
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "SUCCESS", providerPaymentId: event.object.id },
    });

    // Добавить участника в игру (онлайн-оплата = сразу подтверждён)
    await tx.gameParticipant.create({
      data: {
        gameId,
        userId,
        paymentId,
        confirmed: true,
      },
    });

    // Увеличить счётчик игроков
    const game = await tx.game.update({
      where: { id: gameId },
      data: { playersCount: { increment: 1 } },
    });

    // Если игра заполнена — сменить статус
    if (game.playersCount >= game.playersLimit) {
      await tx.game.update({
        where: { id: gameId },
        data: { status: "FULL" },
      });
    }

    // Реферальное начисление (15%)
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (user?.referredById) {
      const referralAmount = Math.round(payment.amount * 0.15);
      await tx.referral.create({
        data: {
          referrerId: user.referredById,
          referredId: userId,
          gameId,
          amount: referralAmount,
          status: "SUCCESS",
        },
      });
      await tx.user.update({
        where: { id: user.referredById },
        data: { referralBalance: { increment: referralAmount } },
      });
    }
  });

  // Проверить достижения после оплаты
  await checkGameAchievements(userId);

  // Проверить реферальное достижение
  const paidUser = await prisma.user.findUnique({ where: { id: userId } });
  if (paidUser?.referredById) {
    await checkReferralAchievement(paidUser.referredById);
  }

  // Уведомить игрока об успешной оплате
  const gameForNotify = await prisma.game.findUnique({ where: { id: gameId } });
  if (paidUser && gameForNotify) {
    const gameDate = new Date(gameForNotify.date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
    await sendNotification(
      paidUser.telegramId,
      `✅ <b>Оплата прошла!</b>\n\nТы в списке игроков на игру <b>${gameDate}</b> в <b>${gameForNotify.time}</b>.\n\nЖдём в Остров Lounge!`
    );

    // Уведомить админов об онлайн-оплате
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "OWNER"] } },
      select: { telegramId: true },
    });
    const userInfo = paidUser.username ? `@${paidUser.username}` : paidUser.displayName;
    const adminText = `💳 <b>Онлайн-оплата получена</b>\n\n${paidUser.displayName} (${userInfo}) оплатил игру <b>${gameDate}</b> в <b>${gameForNotify.time}</b>.\n\n✅ Участник автоматически подтверждён.`;
    for (const admin of admins) {
      await sendNotification(admin.telegramId, adminText);
    }
  }

  return NextResponse.json({ ok: true });
}

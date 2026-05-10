import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

  let referrerId: string | null = null;
  let referralAmount = 0;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "SUCCESS", providerPaymentId: event.object.id },
    });

    // Участник мог быть создан при нажатии «Оплатить онлайн» — обновляем, иначе создаём
    const existingParticipant = await tx.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
    });

    if (!existingParticipant) {
      await tx.gameParticipant.create({
        data: {
          gameId,
          userId,
          paymentId,
          paymentMethod: "YUKASSA",
          confirmed: true,
        },
      });

      const game = await tx.game.update({
        where: { id: gameId },
        data: { playersCount: { increment: 1 } },
      });
      if (game.playersCount >= game.playersLimit) {
        await tx.game.update({ where: { id: gameId }, data: { status: "FULL" } });
      }
    } else {
      await tx.gameParticipant.update({
        where: { gameId_userId: { gameId, userId } },
        data: { paymentId, paymentMethod: "YUKASSA", confirmed: true },
      });
    }

    // Реферальное начисление (15%) — только здесь для YUKASSA
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (user?.referredById) {
      referrerId = user.referredById;
      referralAmount = Math.round(payment.amount * 0.15);
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

  // Уведомить реферёра вне транзакции
  if (referrerId && referralAmount > 0) {
    const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
    if (referrer) {
      const rubles = (referralAmount / 100).toLocaleString("ru-RU");
      await sendNotification(referrer.telegramId, `Тебе начислено ${rubles} ₽ по реферальной системе`);
    }
  }

  return NextResponse.json({ ok: true });
}

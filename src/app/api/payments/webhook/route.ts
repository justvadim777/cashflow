import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { isYukassaIp } from "@/lib/payments/yukassa-ips";
import { verifyWebhookSignature, refundPayment } from "@/lib/payments/yukassa";
import { tryIncrementPlayers } from "@/lib/games/atomic-join";
import { checkGameAchievements, checkReferralAchievement } from "@/lib/achievements/check";

// POST /api/payments/webhook — ЮКасса webhook
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";
    if (!isYukassaIp(ip)) {
      return NextResponse.json({ error: "Forbidden IP" }, { status: 403 });
    }
  }

  const body = await req.text();

  const signature = req.headers.get("Signature") ?? "";
  if (process.env.YUKASSA_WEBHOOK_SECRET && !verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

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

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "PENDING") {
    return NextResponse.json({ ok: true });
  }

  const existingParticipant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId } },
  });

  if (!existingParticipant) {
    const captured = await tryIncrementPlayers(gameId);
    if (!captured) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "FAILED", providerPaymentId: event.object.id },
      });
      try {
        await refundPayment(event.object.id, payment.amount);
      } catch (err) {
        console.error("Auto-refund failed:", err);
      }
      return NextResponse.json({ ok: true });
    }
  }

  let referrerId: string | null = null;
  let referralAmount = 0;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "SUCCESS", providerPaymentId: event.object.id },
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
    } else {
      await tx.gameParticipant.update({
        where: { gameId_userId: { gameId, userId } },
        data: { paymentId, paymentMethod: "YUKASSA", confirmed: true },
      });
    }

    // Реферальное начисление (15%) только для YUKASSA
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
      await sendNotification(
        referrer.telegramId,
        `🤝 <b>Реферальный бонус!</b>\n\nТебе начислено <b>${rubles} ₽</b>`
      );
      await checkReferralAchievement(referrer.id);
    }
  }

  // Проверить достижения
  await checkGameAchievements(userId);

  return NextResponse.json({ ok: true });
}

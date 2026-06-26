import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { decrementPlayers } from "@/lib/games/atomic-join";
import { audit } from "@/lib/audit";
import { checkReferralAchievement } from "@/lib/achievements/check";

// PATCH /api/games/[id]/confirm — подтверждение/отклонение записи (ADMIN/HOST)
// body: { userId: string, action: "confirm" | "reject" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "ADMIN" && user.role !== "HOST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: gameId } = await params;
    const body = await _req.json();
    const { userId, action, amount } = body as {
      userId: string;
      action: "confirm" | "reject";
      amount?: number; // в рублях, опционально для CASH
    };

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
      include: { user: true, payment: true, game: true },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Защита от двойного confirm
    if (action === "confirm" && participant.confirmed) {
      return NextResponse.json({ error: "Already confirmed" }, { status: 409 });
    }

    await audit(
      action === "confirm" ? "PARTICIPANT_CONFIRM" : "PARTICIPANT_REJECT",
      user.telegramId,
      `game:${gameId} user:${userId}`
    );

    if (action === "confirm") {
      const manualPaidAmount =
        participant.paymentMethod === "CASH" && amount != null
          ? Math.round(amount * 100)
          : undefined;

      await prisma.gameParticipant.update({
        where: { gameId_userId: { gameId, userId } },
        data: { confirmed: true, ...(manualPaidAmount != null ? { manualPaidAmount } : {}) },
      });

      // Реферальный бонус для CASH-оплаты (YUKASSA обрабатывается в webhook)
      if (participant.paymentMethod === "CASH" && participant.user.referredById) {
        const gamePrice = participant.game.price;
        const referralAmount = Math.round(gamePrice * 0.15);
        if (referralAmount > 0) {
          await prisma.$transaction(async (tx) => {
            await tx.referral.create({
              data: {
                referrerId: participant.user.referredById!,
                referredId: userId,
                gameId,
                amount: referralAmount,
                status: "SUCCESS",
              },
            });
            await tx.user.update({
              where: { id: participant.user.referredById! },
              data: { referralBalance: { increment: referralAmount } },
            });
          });

          const referrer = await prisma.user.findUnique({
            where: { id: participant.user.referredById },
          });
          if (referrer) {
            const rubles = (referralAmount / 100).toLocaleString("ru-RU");
            await sendNotification(
              referrer.telegramId,
              `🤝 <b>Реферальный бонус!</b>\n\nТебе начислено <b>${rubles} ₽</b> за реферала ${participant.user.displayName}.`
            );
            await checkReferralAchievement(referrer.id);
          }
        }
      }

      const gameDate = new Date(participant.game.date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });

      await sendNotification(
        participant.user.telegramId,
        `✅ <b>Оплата подтверждена!</b>\n\nТы в списке игроков на игру <b>${gameDate}</b> в <b>${participant.game.time}</b>.\n\nЖдём в Остров Lounge!`
      );
    } else if (action === "reject") {
      await prisma.gameParticipant.delete({
        where: { gameId_userId: { gameId, userId } },
      });
      await decrementPlayers(gameId);

      await sendNotification(
        participant.user.telegramId,
        `❌ <b>Запись отклонена</b>\n\nТвоя запись на игру была отклонена. Свяжись с организатором для уточнения.`
      );
    }

    return NextResponse.json({ success: true });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { decrementPlayers } from "@/lib/games/atomic-join";
import { audit } from "@/lib/audit";

// PATCH /api/games/[id]/confirm — подтверждение/отклонение записи (ADMIN)
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
      include: { user: true, payment: true },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    await audit(
      action === "confirm" ? "PARTICIPANT_CONFIRM" : "PARTICIPANT_REJECT",
      user.telegramId,
      `game:${gameId} user:${userId}`
    );

    if (action === "confirm") {
      // manualPaidAmount: если CASH и передан amount (в рублях) → сохраняем в копейках
      const manualPaidAmount =
        participant.paymentMethod === "CASH" && amount != null
          ? Math.round(amount * 100)
          : undefined;

      await prisma.gameParticipant.update({
        where: { gameId_userId: { gameId, userId } },
        data: { confirmed: true, ...(manualPaidAmount != null ? { manualPaidAmount } : {}) },
      });

      // Реферальный бонус только для CASH-оплаты
      if (participant.paymentMethod === "CASH" && participant.user.referredById) {
        const referralAmount = Math.round((participant.payment?.amount ?? 0) * 0.15);
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
            await sendNotification(referrer.telegramId, `Тебе начислено ${rubles} ₽ по реферальной системе`);
          }
        }
      }

      await sendNotification(
        participant.user.telegramId,
        `Твоя запись на игру подтверждена. Ждём тебя в Остров Lounge!`
      );
    } else if (action === "reject") {
      await prisma.gameParticipant.delete({
        where: { gameId_userId: { gameId, userId } },
      });
      await decrementPlayers(gameId);

      await sendNotification(
        participant.user.telegramId,
        `Твоя запись на игру отклонена администратором.`
      );
    }

    return NextResponse.json({ success: true });
  });
}

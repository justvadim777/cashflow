import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { checkReferralAchievement } from "@/lib/achievements/check";

// PATCH /api/games/[id]/confirm — админ подтверждает или отклоняет участника
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "HOST" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { participantId, action } = await _req.json();

    if (!participantId || !["confirm", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const participant = await prisma.gameParticipant.findUnique({
      where: { id: participantId },
      include: { user: true, game: true },
    });

    if (!participant || participant.gameId !== gameId) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    if (action === "confirm") {
      await prisma.gameParticipant.update({
        where: { id: participantId },
        data: { confirmed: true },
      });

      // Реферальное начисление 15% от стоимости игры
      const paidUser = participant.user;
      if (paidUser.referredById) {
        const referralAmount = Math.round(participant.game.price * 0.15);
        await prisma.referral.create({
          data: {
            referrerId: paidUser.referredById,
            referredId: paidUser.id,
            gameId,
            amount: referralAmount,
            status: "SUCCESS",
          },
        });
        await prisma.user.update({
          where: { id: paidUser.referredById },
          data: { referralBalance: { increment: referralAmount } },
        });

        // Уведомление реферёру
        const referrer = await prisma.user.findUnique({ where: { id: paidUser.referredById } });
        if (referrer) {
          await sendNotification(
            referrer.telegramId,
            `🤝 <b>Реферальный бонус!</b>\n\nТебе начислено <b>${(referralAmount / 100).toLocaleString("ru-RU")} ₽</b> за реферала ${paidUser.displayName}.`
          );
          await checkReferralAchievement(paidUser.referredById);
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

      return NextResponse.json({ success: true, confirmed: true });
    }

    // reject — удалить участника и уменьшить счётчик
    await prisma.gameParticipant.delete({ where: { id: participantId } });

    const game = await prisma.game.update({
      where: { id: gameId },
      data: { playersCount: { decrement: 1 } },
    });

    // Если было FULL — открыть обратно
    if (game.status === "FULL") {
      await prisma.game.update({
        where: { id: gameId },
        data: { status: "OPEN" },
      });
    }

    await sendNotification(
      participant.user.telegramId,
      `❌ <b>Запись отклонена</b>\n\nТвоя запись на игру была отклонена. Свяжись с организатором для уточнения.`
    );

    return NextResponse.json({ success: true, rejected: true });
  });
}

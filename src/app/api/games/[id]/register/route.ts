import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";

// POST /api/games/[id]/register — записаться на игру (без оплаты)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const { id } = await params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: { createdBy: true },
    });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.status !== "OPEN") {
      return NextResponse.json({ error: "Запись закрыта" }, { status: 400 });
    }

    const existing = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId: id, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Вы уже записаны" }, { status: 400 });
    }

    await prisma.gameParticipant.create({
      data: { gameId: id, userId: user.id, confirmed: false },
    });

    const updated = await prisma.game.update({
      where: { id },
      data: { playersCount: { increment: 1 } },
    });

    if (updated.playersCount >= updated.playersLimit) {
      await prisma.game.update({
        where: { id },
        data: { status: "FULL" },
      });
    }

    // Уведомление админам и ведущему игры
    const gameDate = new Date(game.date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
    const userInfo = user.username ? `@${user.username}` : user.displayName;
    const notifyText = `🆕 <b>Новая запись на игру</b>\n\n${user.displayName} (${userInfo}) записался на игру <b>${gameDate}</b> в <b>${game.time}</b>.\n\nОжидает подтверждения оплаты.`;

    // Получить всех админов и ведущего
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "OWNER"] } },
      select: { telegramId: true, id: true },
    });

    const recipients = new Set<bigint>();
    admins.forEach((a) => recipients.add(a.telegramId));
    if (game.createdBy) {
      recipients.add(game.createdBy.telegramId);
    }

    for (const tid of recipients) {
      await sendNotification(tid, notifyText);
    }

    return NextResponse.json({ success: true });
  });
}

// DELETE /api/games/[id]/register — отменить запись
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const { id } = await params;

    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId: id, userId: user.id } },
    });

    if (!participant) {
      return NextResponse.json({ error: "Вы не записаны" }, { status: 400 });
    }

    await prisma.gameParticipant.delete({
      where: { id: participant.id },
    });

    const game = await prisma.game.update({
      where: { id },
      data: { playersCount: { decrement: 1 } },
    });

    if (game.status === "FULL") {
      await prisma.game.update({
        where: { id },
        data: { status: "OPEN" },
      });
    }

    return NextResponse.json({ success: true });
  });
}

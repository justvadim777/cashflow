import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { tryIncrementPlayers, decrementPlayers } from "@/lib/games/atomic-join";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/notifications/bot";

// POST /api/games/[id]/register — запись на игру (CASH, без онлайн-оплаты)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const rl = checkRateLimit(`register:${user.telegramId}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: gameId } = await params;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { createdBy: { select: { telegramId: true } } },
    });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if (game.status !== "OPEN") {
      return NextResponse.json({ error: "Запись закрыта" }, { status: 400 });
    }

    const existing = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Вы уже записаны" }, { status: 400 });
    }

    const captured = await tryIncrementPlayers(gameId);
    if (!captured) {
      return NextResponse.json({ error: "Game is full" }, { status: 409 });
    }

    const participant = await prisma.gameParticipant.create({
      data: {
        gameId,
        userId: user.id,
        paymentMethod: "CASH",
        confirmed: false,
      },
    });

    // Уведомление всем ADMIN/OWNER и ведущему игры
    const gameDate = new Date(game.date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
    const userInfo = user.username ? `@${user.username}` : user.displayName;
    const notifyText = `🆕 <b>Новая запись (оплата на месте)</b>\n\n${user.displayName} (${userInfo}) записался на игру <b>${gameDate}</b> в <b>${game.time}</b>.\n\n💵 Выбрал оплату наличными на месте. Подтвердите после получения оплаты.`;

    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "OWNER"] } },
      select: { telegramId: true },
    });

    const recipients = new Set<bigint>(admins.map((a) => a.telegramId));
    recipients.add(game.createdBy.telegramId);

    for (const tid of recipients) {
      await sendNotification(tid, notifyText);
    }

    return NextResponse.json({ participant }, { status: 201 });
  });
}

// DELETE /api/games/[id]/register — отмена записи
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const { id: gameId } = await params;

    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
      include: { payment: true },
    });

    if (!participant) {
      return NextResponse.json({ error: "Вы не записаны" }, { status: 400 });
    }

    if (participant.confirmed || participant.payment?.status === "SUCCESS") {
      return NextResponse.json(
        { error: "Запись оплачена. Используй заявку на возврат." },
        { status: 400 }
      );
    }

    await prisma.gameParticipant.delete({
      where: { gameId_userId: { gameId, userId: user.id } },
    });

    await decrementPlayers(gameId);

    return NextResponse.json({ success: true });
  });
}

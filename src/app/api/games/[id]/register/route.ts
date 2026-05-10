import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { tryIncrementPlayers, decrementPlayers } from "@/lib/games/atomic-join";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/games/[id]/register — CASH-запись (без онлайн-оплаты)
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

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if (game.status !== "OPEN") {
      return NextResponse.json({ error: "Game is not open for registration" }, { status: 409 });
    }

    const existing = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already registered" }, { status: 409 });
    }

    // Атомарно захватываем место
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
      return NextResponse.json({ error: "Not registered" }, { status: 404 });
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

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// POST /api/games/[id]/register — CASH-запись (без онлайн-оплаты)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
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

    if (game.playersCount >= game.playersLimit) {
      return NextResponse.json({ error: "Game is full" }, { status: 409 });
    }

    const participant = await prisma.$transaction(async (tx) => {
      const p = await tx.gameParticipant.create({
        data: {
          gameId,
          userId: user.id,
          paymentMethod: "CASH",
          confirmed: false,
        },
      });

      const updated = await tx.game.update({
        where: { id: gameId },
        data: { playersCount: { increment: 1 } },
      });

      if (updated.playersCount >= updated.playersLimit) {
        await tx.game.update({
          where: { id: gameId },
          data: { status: "FULL" },
        });
      }

      return p;
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

    await prisma.$transaction(async (tx) => {
      await tx.gameParticipant.delete({
        where: { gameId_userId: { gameId, userId: user.id } },
      });

      await tx.game.update({
        where: { id: gameId },
        data: {
          playersCount: { decrement: 1 },
          status: "OPEN",
        },
      });
    });

    return NextResponse.json({ success: true });
  });
}

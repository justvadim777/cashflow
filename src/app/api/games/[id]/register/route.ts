import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// POST /api/games/[id]/register — записаться на игру (без оплаты)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const { id } = await params;

    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (game.status !== "OPEN") {
      return NextResponse.json({ error: "Запись закрыта" }, { status: 400 });
    }

    // Проверка: уже записан
    const existing = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId: id, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Вы уже записаны" }, { status: 400 });
    }

    // Создать заявку (не подтверждена)
    await prisma.gameParticipant.create({
      data: {
        gameId: id,
        userId: user.id,
        confirmed: false,
      },
    });

    // Увеличить счётчик
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

    return NextResponse.json({ success: true });
  });
}

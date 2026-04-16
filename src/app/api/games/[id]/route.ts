import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/games/[id] — детали игры
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const { id } = await params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        participants: {
          select: {
            id: true,
            confirmed: true,
            userId: true,
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                username: true,
                totalPoints: true,
                telegramId: true,
              },
            },
          },
        },
        results: {
          where: { userId: user.id },
        },
        createdBy: {
          select: { id: true, displayName: true },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const isParticipant = game.participants.some((p: { userId: string }) => p.userId === user.id);

    return NextResponse.json({ game, isParticipant, userId: user.id });
  });
}

// PATCH /api/games/[id] — обновление игры (HOST / ADMIN)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const { id } = await params;

    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Ведущий видит только свои игры
    if (user.role === "HOST" && game.createdById !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role !== "HOST" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await _req.json();
    const { date, time, type, price, playersLimit, description, status } = body;

    const updated = await prisma.game.update({
      where: { id },
      data: {
        ...(date ? { date: new Date(date) } : {}),
        ...(time ? { time } : {}),
        ...(type ? { type } : {}),
        ...(price !== undefined ? { price: Math.round(price) } : {}),
        ...(playersLimit !== undefined ? { playersLimit } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({ game: updated });
  });
}

// DELETE /api/games/[id] — удаление игры (ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.game.delete({ where: { id } });

    return NextResponse.json({ success: true });
  });
}

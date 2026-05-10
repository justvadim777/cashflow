import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// POST /api/games/[id]/waitlist — встать в лист ожидания
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
    if (game.status !== "FULL") {
      return NextResponse.json({ error: "Game is not full — register directly" }, { status: 400 });
    }

    const existing = await prisma.gameWaitlist.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already in waitlist" }, { status: 409 });
    }

    const entry = await prisma.gameWaitlist.create({
      data: { gameId, userId: user.id },
    });

    return NextResponse.json({ entry }, { status: 201 });
  });
}

// DELETE /api/games/[id]/waitlist — выйти из листа ожидания
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const { id: gameId } = await params;

    const entry = await prisma.gameWaitlist.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
    });
    if (!entry) {
      return NextResponse.json({ error: "Not in waitlist" }, { status: 404 });
    }

    await prisma.gameWaitlist.delete({
      where: { gameId_userId: { gameId, userId: user.id } },
    });

    return NextResponse.json({ success: true });
  });
}

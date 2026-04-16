import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/games/next — ближайшая игра текущего пользователя
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const now = new Date();

    const participant = await prisma.gameParticipant.findFirst({
      where: {
        userId: user.id,
        game: {
          status: { in: ["OPEN", "FULL"] },
          date: { gte: now },
        },
      },
      include: {
        game: {
          select: { id: true, date: true, time: true, type: true },
        },
      },
      orderBy: { game: { date: "asc" } },
    });

    return NextResponse.json({
      nextGame: participant?.game || null,
    });
  });
}

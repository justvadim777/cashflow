import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/games/next — ближайшая предстоящая игра (учитывает date+time)
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const games = await prisma.game.findMany({
      where: { status: { in: ["OPEN", "FULL"] } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 20,
      include: {
        participants: {
          where: { userId: user.id },
          select: { confirmed: true, paymentMethod: true },
        },
      },
    });

    const now = new Date();
    const next = games.find((g) => {
      const [hh, mm] = g.time.split(":").map(Number);
      const startsAt = new Date(g.date);
      startsAt.setHours(hh, mm, 0, 0);
      return startsAt > now;
    });

    if (!next) {
      return NextResponse.json({ game: null });
    }

    return NextResponse.json({
      game: {
        id: next.id,
        date: next.date,
        time: next.time,
        type: next.type,
        price: next.price,
        playersCount: next.playersCount,
        playersLimit: next.playersLimit,
        status: next.status,
        isParticipant: next.participants.length > 0,
        isConfirmed: next.participants[0]?.confirmed ?? false,
      },
    });
  });
}

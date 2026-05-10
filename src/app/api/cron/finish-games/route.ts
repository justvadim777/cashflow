import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/cron/finish-games — завершить игры через 3 часа после начала
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Найти активные игры
  const activeGames = await prisma.game.findMany({
    where: { status: { in: ["OPEN", "FULL"] } },
  });

  let finished = 0;

  for (const game of activeGames) {
    // Собрать дату + время начала
    const gameDate = new Date(game.date);
    const [hours, minutes] = game.time.split(":").map(Number);
    gameDate.setHours(hours, minutes, 0, 0);

    // +3 часа = время окончания
    const endTime = new Date(gameDate.getTime() + 3 * 60 * 60 * 1000);

    if (now >= endTime) {
      await prisma.game.update({
        where: { id: game.id },
        data: { status: "FINISHED" },
      });
      finished++;
    }
  }

  return NextResponse.json({ finished, checked: activeGames.length });
}

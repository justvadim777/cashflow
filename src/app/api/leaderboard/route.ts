import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/leaderboard?period=all|week|month
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const url = new URL(_req.url);
    const period = url.searchParams.get("period") || "all";

    // Для week — агрегируем баллы за последние 7 дней из gameResults
    if (period === "week") {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      // Баллы за неделю по юзерам
      const weeklyResults = await prisma.gameResult.groupBy({
        by: ["userId"],
        where: { game: { date: { gte: weekStart } } },
        _sum: { totalPoints: true },
      });

      const weeklyMap = new Map(
        weeklyResults.map((r) => [r.userId, r._sum.totalPoints || 0])
      );

      // Все пользователи
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          totalPoints: true,
          monthlyPoints: true,
          level: true,
        },
      });

      const players = allUsers
        .map((u) => ({ ...u, weeklyPoints: weeklyMap.get(u.id) || 0 }))
        .sort((a, b) => b.weeklyPoints - a.weeklyPoints)
        .slice(0, 50);

      const userIndex = players.findIndex((p) => p.id === user.id);
      const userPosition = userIndex >= 0 ? userIndex + 1 : 0;

      return NextResponse.json({ players, userPosition, userId: user.id });
    }

    // all / month
    const orderField = period === "month" ? "monthlyPoints" : "totalPoints";

    const players = await prisma.user.findMany({
      orderBy: { [orderField]: "desc" },
      take: 50,
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        totalPoints: true,
        monthlyPoints: true,
        level: true,
      },
    });

    const userIndex = players.findIndex((p: { id: string }) => p.id === user.id);
    let userPosition = userIndex + 1;

    if (userIndex === -1) {
      const count = await prisma.user.count({
        where: { [orderField]: { gt: user[orderField] } },
      });
      userPosition = count + 1;
    }

    return NextResponse.json({ players, userPosition, userId: user.id });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/leaderboard?period=all|week|month
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const url = new URL(_req.url);
    const period = url.searchParams.get("period") || "all";

    let orderField: "totalPoints" | "monthlyPoints" = "totalPoints";
    if (period === "month") {
      orderField = "monthlyPoints";
    }

    // Для week — тоже используем totalPoints, можно доработать позже
    const players = await prisma.user.findMany({
      where: { role: "PLAYER" },
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

    // Найти позицию текущего пользователя
    const userIndex = players.findIndex((p: { id: string }) => p.id === user.id);
    let userPosition = userIndex + 1;

    if (userIndex === -1) {
      // Пользователь не в топ-50 — посчитаем его позицию
      const count = await prisma.user.count({
        where: {
          role: "PLAYER",
          [orderField]: { gt: user[orderField] },
        },
      });
      userPosition = count + 1;
    }

    return NextResponse.json({
      players,
      userPosition,
      userId: user.id,
    });
  });
}

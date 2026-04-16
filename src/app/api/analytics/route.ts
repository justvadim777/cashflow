import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { autoFinishGames } from "@/lib/games/auto-finish";

// GET /api/analytics — дашборд для ADMIN / OWNER
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Автозавершение игр через 3 часа
    await autoFinishGames();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      newUsersThisMonth,
      totalGames,
      finishedGames,
      activeGames,
      totalParticipants,
      confirmedParticipants,
      pendingParticipants,
      totalRevenue,
      monthRevenue,
      pendingWithdrawals,
      topPlayers,
      upcomingGames,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.game.count(),
      prisma.game.count({ where: { status: "FINISHED" } }),
      prisma.game.count({ where: { status: { in: ["OPEN", "FULL"] } } }),
      prisma.gameParticipant.count(),
      prisma.gameParticipant.count({ where: { confirmed: true } }),
      prisma.gameParticipant.count({ where: { confirmed: false } }),
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "SUCCESS", createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.withdrawalRequest.count({
        where: { status: { in: ["CREATED", "PROCESSING"] } },
      }),
      prisma.user.findMany({
        orderBy: { totalPoints: "desc" },
        take: 5,
        select: { displayName: true, totalPoints: true, level: true },
      }),
      prisma.game.findMany({
        where: { status: { in: ["OPEN", "FULL"] } },
        orderBy: { date: "asc" },
        take: 5,
        select: {
          id: true,
          date: true,
          time: true,
          type: true,
          status: true,
          playersCount: true,
          playersLimit: true,
        },
      }),
    ]);

    // Средний балл за игру
    const avgResult = await prisma.gameResult.aggregate({
      _avg: { totalPoints: true },
    });

    return NextResponse.json({
      totalUsers,
      newUsersThisMonth,
      totalGames,
      finishedGames,
      activeGames,
      totalParticipants,
      confirmedParticipants,
      pendingParticipants,
      totalRevenue: totalRevenue._sum.amount || 0,
      monthRevenue: monthRevenue._sum.amount || 0,
      pendingWithdrawals,
      avgPoints: Math.round(avgResult._avg.totalPoints || 0),
      topPlayers,
      upcomingGames,
    });
  });
}

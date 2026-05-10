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

    await autoFinishGames();

    const url = new URL(_req.url);
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");
    const start = startParam ? new Date(startParam) : new Date(0);
    const end = endParam ? new Date(endParam) : new Date();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      totalGames,
      finishedGames,
      activeGames,
      totalParticipants,
      confirmedParticipants,
      pendingParticipants,
      newPaidThisMonth,
      newPaidThisWeek,
      totalRevenue,
      monthRevenue,
      hookahRevenueTotal,
      hookahRevenueMonth,
      hookahGamesTotal,
      hookahGamesMonth,
      referralTotal,
      referralMonth,
      pendingWithdrawals,
      topPlayers,
      upcomingGames,
      paidCount,
      yukassaRevenue,
      cashRevenue,
    ] = await Promise.all([
      // Пользователи
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      // Игры
      prisma.game.count(),
      prisma.game.count({ where: { status: "FINISHED" } }),
      prisma.game.count({ where: { status: { in: ["OPEN", "FULL"] } } }),
      // Записи
      prisma.gameParticipant.count(),
      prisma.gameParticipant.count({ where: { confirmed: true } }),
      prisma.gameParticipant.count({ where: { confirmed: false } }),
      // Новые подтверждённые за месяц/неделю
      prisma.gameParticipant.count({ where: { confirmed: true, joinedAt: { gte: monthStart } } }),
      prisma.gameParticipant.count({ where: { confirmed: true, joinedAt: { gte: weekStart } } }),
      // Выручка онлайн всего и за месяц
      prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: "SUCCESS", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
      // Выручка кальянки
      prisma.gameResult.aggregate({ _sum: { hookahRevenue: true } }),
      prisma.gameResult.aggregate({ where: { game: { date: { gte: monthStart } } }, _sum: { hookahRevenue: true } }),
      prisma.gameResult.count({ where: { hookahRevenue: { gt: 0 } } }),
      prisma.gameResult.count({ where: { hookahRevenue: { gt: 0 }, game: { date: { gte: monthStart } } } }),
      // Реферальные выплаты
      prisma.referral.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
      prisma.referral.aggregate({ where: { status: "SUCCESS", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
      // Заявки на вывод
      prisma.withdrawalRequest.count({ where: { status: { in: ["CREATED", "PROCESSING"] } } }),
      // Топ игроков
      prisma.user.findMany({
        orderBy: { totalPoints: "desc" },
        take: 5,
        select: { displayName: true, totalPoints: true, level: true },
      }),
      // Ближайшие игры
      prisma.game.findMany({
        where: { status: { in: ["OPEN", "FULL"] } },
        orderBy: { date: "asc" },
        take: 5,
        select: { id: true, date: true, time: true, type: true, status: true, playersCount: true, playersLimit: true },
      }),
      // Счётчик оплат за период
      prisma.payment.count({ where: { status: "SUCCESS", createdAt: { gte: start, lte: end } } }),
      // ЮКасса-выручка за период
      prisma.payment.aggregate({ where: { status: "SUCCESS", createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      // CASH-выручка за период
      prisma.gameParticipant.aggregate({
        where: { paymentMethod: "CASH", confirmed: true, manualPaidAmount: { not: null }, joinedAt: { gte: start, lte: end } },
        _sum: { manualPaidAmount: true },
      }),
    ]);

    // firstPaidCount — первая оплата юзера (один SQL-запрос)
    const firstPaidRows: Array<{ count: bigint }> = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS count
      FROM payments p
      WHERE p.status = 'SUCCESS'
        AND p.created_at >= ${start}
        AND p.created_at <= ${end}
        AND NOT EXISTS (
          SELECT 1 FROM payments p2
          WHERE p2.user_id = p.user_id
            AND p2.status = 'SUCCESS'
            AND p2.created_at < p.created_at
        )
    `;
    const firstPaidCount = Number(firstPaidRows[0]?.count ?? 0);

    const avgResult = await prisma.gameResult.aggregate({ _avg: { totalPoints: true } });

    const hookahTotal = hookahRevenueTotal._sum.hookahRevenue || 0;
    const hookahMonth = hookahRevenueMonth._sum.hookahRevenue || 0;
    const hookahAvgTotal = hookahGamesTotal > 0 ? Math.round(hookahTotal / hookahGamesTotal) : 0;
    const hookahAvgMonth = hookahGamesMonth > 0 ? Math.round(hookahMonth / hookahGamesMonth) : 0;

    const yukassaRev = yukassaRevenue._sum.amount ?? 0;
    const cashRev = cashRevenue._sum.manualPaidAmount ?? 0;

    return NextResponse.json({
      // Пользователи
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      // Игры
      totalGames,
      finishedGames,
      activeGames,
      // Записи
      totalParticipants,
      confirmedParticipants,
      pendingParticipants,
      newPaidThisMonth,
      newPaidThisWeek,
      // Выручка (общая)
      totalRevenue: totalRevenue._sum.amount || 0,
      monthRevenue: monthRevenue._sum.amount || 0,
      // Кальянка
      hookahRevenueTotal: hookahTotal,
      hookahRevenueMonth: hookahMonth,
      hookahAvgTotal,
      hookahAvgMonth,
      // Рефералы
      referralTotal: referralTotal._sum.amount || 0,
      referralMonth: referralMonth._sum.amount || 0,
      pendingWithdrawals,
      // Рейтинг и игры
      avgPoints: Math.round(avgResult._avg.totalPoints || 0),
      topPlayers,
      upcomingGames,
      // Выручка за период (start..end)
      yukassaRevenue: yukassaRev,
      cashRevenue: cashRev,
      periodRevenue: yukassaRev + cashRev,
      paidCount,
      firstPaidCount,
    });
  });
}

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
      cashParticipantsTotal,
      cashParticipantsMonth,
      hookahRevenueTotal,
      hookahRevenueMonth,
      hookahGamesTotal,
      hookahGamesMonth,
      referralTotal,
      referralMonth,
      pendingWithdrawals,
      topPlayers,
      upcomingGames,
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
      // Новые оплаченные (подтверждённые) за месяц/неделю
      prisma.gameParticipant.count({ where: { confirmed: true, joinedAt: { gte: monthStart } } }),
      prisma.gameParticipant.count({ where: { confirmed: true, joinedAt: { gte: weekStart } } }),
      // Выручка по онлайн-оплатам
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "SUCCESS", createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      // Количество оплативших наличными (confirmed=true, paymentId=null)
      prisma.gameParticipant.count({
        where: { confirmed: true, paymentId: null },
      }),
      prisma.gameParticipant.count({
        where: { confirmed: true, paymentId: null, joinedAt: { gte: monthStart } },
      }),
      // Выручка кальянки
      prisma.gameResult.aggregate({
        _sum: { hookahRevenue: true },
      }),
      prisma.gameResult.aggregate({
        where: { game: { date: { gte: monthStart } } },
        _sum: { hookahRevenue: true },
      }),
      // Количество игр с выручкой кальянки (для среднего чека)
      prisma.gameResult.count({
        where: { hookahRevenue: { gt: 0 } },
      }),
      prisma.gameResult.count({
        where: { hookahRevenue: { gt: 0 }, game: { date: { gte: monthStart } } },
      }),
      // Реферальные выплаты
      prisma.referral.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.referral.aggregate({
        where: { status: "SUCCESS", createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      // Заявки на вывод
      prisma.withdrawalRequest.count({
        where: { status: { in: ["CREATED", "PROCESSING"] } },
      }),
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

    // Сумма наличных — берём участников без paymentId и суммируем цену их игр
    const cashParticipantsWithGames = await prisma.gameParticipant.findMany({
      where: { confirmed: true, paymentId: null },
      include: { game: { select: { price: true } } },
    });
    const cashRevenueTotal = cashParticipantsWithGames.reduce((sum, p) => sum + p.game.price, 0);

    const cashParticipantsMonthWithGames = await prisma.gameParticipant.findMany({
      where: { confirmed: true, paymentId: null, joinedAt: { gte: monthStart } },
      include: { game: { select: { price: true } } },
    });
    const cashRevenueMonth = cashParticipantsMonthWithGames.reduce((sum, p) => sum + p.game.price, 0);

    const hookahTotal = hookahRevenueTotal._sum.hookahRevenue || 0;
    const hookahMonth = hookahRevenueMonth._sum.hookahRevenue || 0;
    const hookahAvgTotal = hookahGamesTotal > 0 ? Math.round(hookahTotal / hookahGamesTotal) : 0;
    const hookahAvgMonth = hookahGamesMonth > 0 ? Math.round(hookahMonth / hookahGamesMonth) : 0;

    const onlineRevenueTotal = totalRevenue._sum.amount || 0;
    const onlineRevenueMonth = monthRevenue._sum.amount || 0;

    return NextResponse.json({
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
      // Онлайн-оплаты (ЮКасса)
      totalRevenue: onlineRevenueTotal,
      monthRevenue: onlineRevenueMonth,
      // Наличные
      cashParticipantsTotal,
      cashParticipantsMonth,
      cashRevenueTotal,
      cashRevenueMonth,
      // Итоговая выручка (онлайн + наличные)
      totalRevenueAll: onlineRevenueTotal + cashRevenueTotal,
      monthRevenueAll: onlineRevenueMonth + cashRevenueMonth,
      hookahRevenueTotal: hookahTotal,
      hookahRevenueMonth: hookahMonth,
      hookahAvgTotal,
      hookahAvgMonth,
      referralTotal: referralTotal._sum.amount || 0,
      referralMonth: referralMonth._sum.amount || 0,
      pendingWithdrawals,
      avgPoints: Math.round(avgResult._avg.totalPoints || 0),
      topPlayers,
      upcomingGames,
    });
  });
}

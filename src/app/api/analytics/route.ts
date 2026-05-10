import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/analytics — дашборд для ADMIN / OWNER
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(_req.url);
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");
    const start = startParam ? new Date(startParam) : new Date(0);
    const end = endParam ? new Date(endParam) : new Date();

    const [
      totalUsers,
      totalGames,
      activeGames,
      recentPayments,
      pendingWithdrawals,
      paidCount,
      yukassaRevenue,
      cashRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.game.count({ where: { status: { in: ["OPEN", "FULL"] } } }),
      prisma.payment.findMany({
        where: { status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { displayName: true } },
          game: { select: { date: true, type: true } },
        },
      }),
      prisma.withdrawalRequest.findMany({
        where: { status: { in: ["CREATED", "PROCESSING"] } },
        include: { user: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Счётчик оплат за период
      prisma.payment.count({
        where: { status: "SUCCESS", createdAt: { gte: start, lte: end } },
      }),
      // ЮКасса-выручка за период
      prisma.payment.aggregate({
        where: { status: "SUCCESS", createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      // CASH-выручка за период
      prisma.gameParticipant.aggregate({
        where: {
          paymentMethod: "CASH",
          confirmed: true,
          manualPaidAmount: { not: null },
          joinedAt: { gte: start, lte: end },
        },
        _sum: { manualPaidAmount: true },
      }),
    ]);

    // firstPaidCount — оплаты, где это первая оплата юзера (один SQL-запрос)
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

    const yukassaRev = yukassaRevenue._sum.amount ?? 0;
    const cashRev = cashRevenue._sum.manualPaidAmount ?? 0;

    return NextResponse.json({
      totalUsers,
      totalGames,
      activeGames,
      recentPayments,
      pendingWithdrawals,
      // Выручка
      yukassaRevenue: yukassaRev,
      cashRevenue: cashRev,
      totalRevenue: yukassaRev + cashRev,
      // Оплаты за период
      paidCount,
      firstPaidCount,
    });
  });
}

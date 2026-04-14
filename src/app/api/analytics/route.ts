import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/analytics — дашборд для ADMIN / OWNER
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalUsers,
      totalGames,
      totalRevenue,
      activeGames,
      recentPayments,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
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
        include: {
          user: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalGames,
      totalRevenue: totalRevenue._sum.amount || 0,
      activeGames,
      recentPayments,
      pendingWithdrawals,
    });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/referral — данные по рефералам пользователя
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    // Все пользователи, привязанные к этому пригласителю
    const invitedUsers = await prisma.user.findMany({
      where: { referredById: user.id },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        username: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Реферальные начисления (оплаты)
    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      include: {
        referred: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
        game: { select: { date: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Сумма начислений по каждому приглашённому
    const earningsByUser = new Map<string, number>();
    for (const r of referrals) {
      if (r.status === "SUCCESS") {
        earningsByUser.set(r.referredId, (earningsByUser.get(r.referredId) || 0) + r.amount);
      }
    }

    const totalEarned = referrals
      .filter((r: { status: string }) => r.status === "SUCCESS")
      .reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);

    // Список приглашённых с суммой и количеством оплат
    const invited = invitedUsers.map((u) => {
      const paidCount = referrals.filter((r) => r.referredId === u.id).length;
      return {
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        username: u.username,
        createdAt: u.createdAt,
        earned: earningsByUser.get(u.id) || 0,
        paidGames: paidCount,
      };
    });

    return NextResponse.json({
      referralCode: user.referralCode,
      referralBalance: user.referralBalance,
      totalEarned,
      invited,
      referrals,
    });
  });
}

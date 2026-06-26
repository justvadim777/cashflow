import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/referral — данные по рефералам пользователя
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const [allReferrals, referralEarnings] = await Promise.all([
      prisma.user.findMany({
        where: { referredById: user.id },
        include: {
          payments: { where: { status: "SUCCESS" }, select: { amount: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.referral.findMany({
        where: { referrerId: user.id },
        select: { referredId: true, amount: true },
      }),
    ]);

    const earningsByRef = new Map<string, number>();
    for (const r of referralEarnings) {
      earningsByRef.set(r.referredId, (earningsByRef.get(r.referredId) ?? 0) + r.amount);
    }

    const referrals = allReferrals.map((ref) => ({
      id: ref.id,
      displayName: ref.displayName,
      username: ref.username,
      avatarUrl: ref.avatarUrl,
      joinedAt: ref.createdAt,
      hasPaid: ref.payments.length > 0,
      totalPaid: ref.payments.reduce((s, p) => s + p.amount, 0),
      earnedFromHim: earningsByRef.get(ref.id) ?? 0,
    }));

    const totalEarned = referralEarnings.reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({
      referralCode: user.referralCode,
      totalCount: referrals.length,
      paidCount: referrals.filter((r) => r.hasPaid).length,
      totalEarned,
      balance: user.referralBalance,
      referrals,
    });
  });
}

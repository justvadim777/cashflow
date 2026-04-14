import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/referral — данные по рефералам пользователя
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      include: {
        referred: {
          select: { displayName: true, avatarUrl: true, username: true },
        },
        game: {
          select: { date: true, type: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalEarned = referrals
      .filter((r: { status: string }) => r.status === "SUCCESS")
      .reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);

    return NextResponse.json({
      referralCode: user.referralCode,
      referralBalance: user.referralBalance,
      totalEarned,
      referrals,
    });
  });
}

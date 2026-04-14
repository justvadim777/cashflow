import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// POST /api/referral/withdraw — заявка на вывод
export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const { amount } = await _req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (amount > user.referralBalance) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const withdrawal = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { referralBalance: { decrement: amount } },
      });

      return tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          amount,
          status: "CREATED",
        },
      });
    });

    return NextResponse.json({ withdrawal }, { status: 201 });
  });
}

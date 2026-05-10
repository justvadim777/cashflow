import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/cron/monthly-reset — сброс monthlyPoints (вызывать 1-го числа каждого месяца)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.user.updateMany({
    data: { monthlyPoints: 0 },
  });

  return NextResponse.json({
    reset: true,
    usersAffected: result.count,
  });
}

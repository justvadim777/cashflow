import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/cron/finish-games — завершить игры, у которых дата прошла
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.game.updateMany({
    where: {
      date: { lt: new Date() },
      status: { in: ["OPEN", "FULL"] },
    },
    data: { status: "FINISHED" },
  });

  return NextResponse.json({ ok: true, finished: result.count });
}

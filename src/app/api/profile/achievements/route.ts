import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/profile/achievements — достижения текущего пользователя
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const achievements = await prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: "desc" },
    });

    return NextResponse.json({ achievements });
  });
}

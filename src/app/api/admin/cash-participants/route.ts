import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";

// GET /api/admin/cash-participants — список неподтверждённых CASH-записей
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "ADMIN" && user.role !== "HOST" && user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const participants = await prisma.gameParticipant.findMany({
      where: { paymentMethod: "CASH" },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        game: { select: { id: true, date: true, time: true, status: true } },
      },
      orderBy: { joinedAt: "desc" },
    });

    return NextResponse.json({ participants });
  });
}

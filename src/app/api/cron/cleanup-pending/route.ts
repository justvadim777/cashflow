import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrementPlayers } from "@/lib/games/atomic-join";
import { cancelPayment } from "@/lib/payments/yukassa";

// POST /api/cron/cleanup-pending — удаление протухших YUKASSA-PENDING записей (>30 мин)
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000);

  const stale = await prisma.gameParticipant.findMany({
    where: {
      confirmed: false,
      paymentMethod: "YUKASSA",
      joinedAt: { lt: cutoff },
      payment: { status: "PENDING" },
    },
    include: { payment: true },
  });

  let removed = 0;

  for (const participant of stale) {
    await prisma.gameParticipant.delete({
      where: { id: participant.id },
    });
    await decrementPlayers(participant.gameId);
    if (participant.payment) {
      if (participant.payment.providerPaymentId) {
        try {
          await cancelPayment(participant.payment.providerPaymentId);
        } catch {
          // Best-effort: log but don't block cleanup
          console.error("YuKassa cancel failed for payment", participant.payment.providerPaymentId);
        }
      }
      await prisma.payment.update({
        where: { id: participant.payment.id },
        data: { status: "FAILED" },
      });
    }
    removed++;
  }

  return NextResponse.json({ ok: true, removed });
}

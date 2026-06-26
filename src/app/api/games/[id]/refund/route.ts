import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/games/[id]/refund — игрок создаёт заявку на возврат
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    const rl = checkRateLimit(`refund:${user.telegramId}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id: gameId } = await params;
    const body = await _req.json();
    const { reason } = body as { reason?: string };

    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
      include: { payment: true },
    });

    if (!participant) {
      return NextResponse.json({ error: "Not registered for this game" }, { status: 404 });
    }

    if (!participant.payment || participant.payment.status !== "SUCCESS") {
      return NextResponse.json({ error: "No successful payment to refund" }, { status: 400 });
    }

    const existing = await prisma.refundRequest.findFirst({
      where: { userId: user.id, gameId, status: { in: ["CREATED", "PROCESSING"] } },
    });
    if (existing) {
      return NextResponse.json({ error: "Refund request already exists" }, { status: 409 });
    }

    const refund = await prisma.refundRequest.create({
      data: {
        userId: user.id,
        gameId,
        paymentId: participant.payment.id,
        amount: participant.payment.amount,
        reason: reason || null,
      },
    });

    // Уведомить всех ADMIN и OWNER
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "OWNER"] } },
    });
    const gameDomain = await prisma.game.findUnique({ where: { id: gameId } });
    const dateStr = gameDomain
      ? new Date(gameDomain.date).toLocaleDateString("ru-RU")
      : gameId;

    for (const admin of admins) {
      await sendNotification(
        admin.telegramId,
        `Новая заявка на возврат от ${user.displayName} на игру ${dateStr} — ${(refund.amount / 100).toLocaleString("ru-RU")} ₽`
      );
    }

    return NextResponse.json({ refund }, { status: 201 });
  });
}

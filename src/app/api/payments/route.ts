import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { createPayment } from "@/lib/payments/yukassa";

// POST /api/payments — создание платежа для записи на игру
export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const { gameId } = await _req.json();

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if (game.status !== "OPEN") {
      return NextResponse.json({ error: "Game is not open" }, { status: 400 });
    }

    // Проверка: не записан ли уже
    const existing = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already registered" }, { status: 400 });
    }

    // Проверка: есть места
    if (game.playersCount >= game.playersLimit) {
      return NextResponse.json({ error: "Game is full" }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        gameId,
        amount: game.price,
        status: "PENDING",
      },
    });

    const returnUrl = `${process.env.NEXT_PUBLIC_TG_APP_URL}/games/${gameId}`;

    const yuKassaPayment = await createPayment({
      amount: game.price,
      description: `Игра Cashflow ${game.type} — ${game.date.toLocaleDateString("ru-RU")}`,
      returnUrl,
      metadata: {
        paymentId: payment.id,
        userId: user.id,
        gameId,
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: yuKassaPayment.id },
    });

    return NextResponse.json({
      paymentUrl: yuKassaPayment.confirmation?.confirmation_url,
      paymentId: payment.id,
    });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { NOTIFICATION_TEMPLATES } from "@/lib/notifications/templates";
import crypto from "crypto";

// POST /api/referral/coupon — создать купон из реферального баланса
export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const { amount } = await _req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Неверная сумма" }, { status: 400 });
    }

    if (user.referralBalance < amount) {
      return NextResponse.json({ error: "Недостаточно средств" }, { status: 400 });
    }

    // Генерация кода купона
    const couponCode = `CF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Списать с баланса
    await prisma.user.update({
      where: { id: user.id },
      data: { referralBalance: { decrement: amount } },
    });

    // Уведомление
    const amountRub = (amount / 100).toLocaleString("ru-RU");
    await sendNotification(
      user.telegramId,
      NOTIFICATION_TEMPLATES.COUPON_CREATED(`${amountRub} ₽`)
    );

    return NextResponse.json({
      couponCode,
      amount,
      message: `Купон ${couponCode} на ${amountRub} ₽ создан. Покажи его в Остров Lounge.`,
    });
  });
}

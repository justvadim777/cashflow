import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotification, sendNotificationWithButton } from "@/lib/notifications/bot";
import { NOTIFICATION_TEMPLATES } from "@/lib/notifications/templates";

// POST /api/notifications/cron — вызывается по расписанию
// Обрабатывает: напоминания за 48ч, 24ч, 2ч, неактивность 30 дней
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_TG_APP_URL || "";

  // 1. Напоминание за 24ч записанным
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStart = new Date(tomorrow.toDateString());
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  const gamesIn24h = await prisma.game.findMany({
    where: {
      date: { gte: tomorrowStart, lt: tomorrowEnd },
      status: { in: ["OPEN", "FULL"] },
    },
    include: {
      participants: {
        include: { user: true },
      },
    },
  });

  for (const game of gamesIn24h) {
    for (const p of game.participants) {
      await sendNotification(
        p.user.telegramId,
        NOTIFICATION_TEMPLATES.REMINDER_24H(game.time)
      );
    }
  }

  // 2. Напоминание за 2ч записанным
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const in2hStart = new Date(in2h.toDateString());
  const in2hEnd = new Date(in2hStart.getTime() + 24 * 60 * 60 * 1000);

  const gamesIn2h = await prisma.game.findMany({
    where: {
      date: { gte: in2hStart, lt: in2hEnd },
      status: { in: ["OPEN", "FULL"] },
    },
    include: {
      participants: {
        include: { user: true },
      },
    },
  });

  for (const game of gamesIn2h) {
    // Простая проверка: время игры через ~2ч
    const [h] = game.time.split(":").map(Number);
    const currentH = now.getHours();
    if (Math.abs(h - currentH - 2) <= 1) {
      for (const p of game.participants) {
        await sendNotification(
          p.user.telegramId,
          NOTIFICATION_TEMPLATES.REMINDER_2H()
        );
      }
    }
  }

  // 3. Неактивные 30 дней
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const inactiveUsers = await prisma.user.findMany({
    where: {
      participations: {
        every: { joinedAt: { lt: thirtyDaysAgo } },
      },
      role: "PLAYER",
    },
    take: 50,
  });

  for (const u of inactiveUsers) {
    await sendNotificationWithButton(
      u.telegramId,
      NOTIFICATION_TEMPLATES.INACTIVE_30_DAYS(),
      "Записаться на игру",
      `${appUrl}/games`
    );
  }

  return NextResponse.json({
    processed: {
      reminders24h: gamesIn24h.length,
      reminders2h: gamesIn2h.length,
      inactive: inactiveUsers.length,
    },
  });
}

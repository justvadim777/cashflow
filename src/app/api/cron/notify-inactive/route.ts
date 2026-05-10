import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { NOTIFICATION_TEMPLATES } from "@/lib/notifications/templates";

// POST /api/cron/notify-inactive — напоминание юзерам, кто не играл 30+ дней
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  // Юзеры, у которых НЕТ Payment SUCCESS или GameResult за последние 30 дней
  const inactive = await prisma.user.findMany({
    where: {
      payments: { none: { status: "SUCCESS", createdAt: { gte: thirtyDaysAgo } } },
      gameResults: { none: { createdAt: { gte: thirtyDaysAgo } } },
      // Исключить совсем новых (регистрация < 7 дней) — они ещё не "неактивные"
      createdAt: { lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    },
    select: { id: true, telegramId: true },
  });

  let sent = 0;
  for (const user of inactive) {
    // Дедупликация: gameId = '0' как сентинел для "не привязано к игре"
    const alreadySent = await prisma.notificationLog.findUnique({
      where: { userId_gameId_type: { userId: user.id, gameId: "0", type: "INACTIVE_30D" } },
    });
    if (!alreadySent) {
      await sendNotification(user.telegramId, NOTIFICATION_TEMPLATES.INACTIVE_30_DAYS());
      await prisma.notificationLog.create({
        data: { userId: user.id, gameId: "0", type: "INACTIVE_30D" },
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}

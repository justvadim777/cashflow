import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { NOTIFICATION_TEMPLATES } from "@/lib/notifications/templates";

function verifyCronAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.NEXTAUTH_SECRET}`;
}

function getGameStartsAt(game: { date: Date; time: string }): Date {
  const [hh, mm] = game.time.split(":").map(Number);
  const d = new Date(game.date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

// POST /api/cron/notify-upcoming — напоминания за 48ч/24ч/2ч
export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  console.log("[cron] notify-upcoming start", { now });

  // Загружаем все OPEN/FULL игры в ближайшие 50ч (с запасом)
  const lookahead = new Date(now.getTime() + 50 * 3600 * 1000);
  const games = await prisma.game.findMany({
    where: {
      status: { in: ["OPEN", "FULL"] },
      date: { lte: lookahead },
    },
    include: {
      participants: {
        where: { confirmed: true },
        include: { user: true },
      },
    },
  });

  let pre2h = 0;
  let pre24h = 0;
  let pre48h = 0;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  for (const game of games) {
    const startsAt = getGameStartsAt(game);
    const diffMs = startsAt.getTime() - now.getTime();
    const diffH = diffMs / 3600000;

    const is2h = diffH >= 1.75 && diffH < 2.25;
    const is24h = diffH >= 23.75 && diffH < 24.25;
    const is48h = diffH >= 47.75 && diffH < 48.25;

    if (!is2h && !is24h && !is48h) continue;

    if (is48h) {
      // Уведомить активных игроков (не записанных на игру)
      const participantIds = new Set(game.participants.map((p) => p.userId));
      const activePlayers = await prisma.user.findMany({
        where: {
          id: { notIn: Array.from(participantIds) },
          OR: [
            { payments: { some: { status: "SUCCESS", createdAt: { gte: thirtyDaysAgo } } } },
            { gameResults: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          ],
        },
        select: { id: true, telegramId: true },
      });

      for (const player of activePlayers) {
        const alreadySent = await prisma.notificationLog.findUnique({
          where: { userId_gameId_type: { userId: player.id, gameId: game.id, type: "PRE_48H" } },
        });
        if (!alreadySent) {
          await sendNotification(player.telegramId, NOTIFICATION_TEMPLATES.REMINDER_48H_NOT_REGISTERED());
          await prisma.notificationLog.create({
            data: { userId: player.id, gameId: game.id, type: "PRE_48H" },
          });
          pre48h++;
        }
      }
    } else {
      const type = is24h ? "PRE_24H" : "PRE_2H";
      for (const p of game.participants) {
        const alreadySent = await prisma.notificationLog.findUnique({
          where: { userId_gameId_type: { userId: p.userId, gameId: game.id, type } },
        });
        if (!alreadySent) {
          const text =
            type === "PRE_24H"
              ? NOTIFICATION_TEMPLATES.REMINDER_24H(game.time)
              : NOTIFICATION_TEMPLATES.REMINDER_2H();
          await sendNotification(p.user.telegramId, text);
          await prisma.notificationLog.create({
            data: { userId: p.userId, gameId: game.id, type },
          });
          if (type === "PRE_24H") pre24h++;
          else pre2h++;
        }
      }
    }
  }

  console.log("[cron] sent", { pre2h, pre24h, pre48h });
  return NextResponse.json({ ok: true, pre2h, pre24h, pre48h });
}

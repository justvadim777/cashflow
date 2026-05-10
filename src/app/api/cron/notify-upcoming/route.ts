import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { NOTIFICATION_TEMPLATES } from "@/lib/notifications/templates";

function verifyCronAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.NEXTAUTH_SECRET}`;
}

// POST /api/cron/notify-upcoming — напоминания за 48ч/24ч/2ч
export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Определяем временные окна
  const windows = [
    {
      type: "PRE_48H",
      from: new Date(now.getTime() + 47 * 3600 * 1000),
      to: new Date(now.getTime() + 49 * 3600 * 1000),
      confirmedOnly: false,
    },
    {
      type: "PRE_24H",
      from: new Date(now.getTime() + 23 * 3600 * 1000),
      to: new Date(now.getTime() + 25 * 3600 * 1000),
      confirmedOnly: true,
    },
    {
      type: "PRE_2H",
      from: new Date(now.getTime() + 1.5 * 3600 * 1000),
      to: new Date(now.getTime() + 2.5 * 3600 * 1000),
      confirmedOnly: true,
    },
  ];

  let sent = 0;

  for (const window of windows) {
    const games = await prisma.game.findMany({
      where: {
        date: { gte: window.from, lte: window.to },
        status: { in: ["OPEN", "FULL"] },
      },
      include: {
        participants: {
          where: window.confirmedOnly ? { confirmed: true } : undefined,
          include: { user: true },
        },
      },
    });

    for (const game of games) {
      if (window.type === "PRE_48H") {
        // 48ч: уведомить активных игроков, кто НЕ записан
        const participantIds = new Set(game.participants.map((p) => p.userId));
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        const activePlayers = await prisma.user.findMany({
          where: {
            role: "PLAYER",
            createdAt: { gte: thirtyDaysAgo },
            id: { notIn: Array.from(participantIds) },
          },
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
            sent++;
          }
        }
      } else {
        for (const p of game.participants) {
          const alreadySent = await prisma.notificationLog.findUnique({
            where: { userId_gameId_type: { userId: p.userId, gameId: game.id, type: window.type } },
          });
          if (!alreadySent) {
            const text =
              window.type === "PRE_24H"
                ? NOTIFICATION_TEMPLATES.REMINDER_24H(game.time)
                : NOTIFICATION_TEMPLATES.REMINDER_2H();
            await sendNotification(p.user.telegramId, text);
            await prisma.notificationLog.create({
              data: { userId: p.userId, gameId: game.id, type: window.type },
            });
            sent++;
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";

// POST /api/cron/expire-waitlist — истечение 30-минутного окна оплаты для waitlist
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000);

  // Записи в waitlist, у которых notifiedAt > 30 минут назад и пользователь не записался
  const expired = await prisma.gameWaitlist.findMany({
    where: {
      notifiedAt: { lt: cutoff, not: null },
    },
    include: {
      user: true,
      game: { select: { id: true, status: true } },
    },
  });

  let processed = 0;

  for (const entry of expired) {
    // Проверяем: стал ли пользователь участником
    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId: entry.gameId, userId: entry.userId } },
    });

    if (!participant) {
      // Удаляем из листа и передаём следующему
      await prisma.gameWaitlist.delete({ where: { id: entry.id } });

      // Найти следующего в очереди с null notifiedAt
      const next = await prisma.gameWaitlist.findFirst({
        where: { gameId: entry.gameId, notifiedAt: null },
        orderBy: { joinedAt: "asc" },
        include: { user: true },
      });

      if (next) {
        await prisma.gameWaitlist.update({
          where: { id: next.id },
          data: { notifiedAt: new Date() },
        });
        await sendNotification(
          next.user.telegramId,
          `Освободилось место в игре! Оплати в течение 30 минут, иначе место перейдёт следующему.`
        );
      }

      processed++;
    } else {
      // Пользователь записался — просто удаляем из waitlist
      await prisma.gameWaitlist.delete({ where: { id: entry.id } });
    }
  }

  return NextResponse.json({ ok: true, processed });
}

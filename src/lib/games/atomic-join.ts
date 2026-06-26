import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";

// Атомарно увеличивает players_count только если есть место.
// Возвращает true если место было захвачено.
export async function tryIncrementPlayers(gameId: string): Promise<boolean> {
  const result = await prisma.$executeRaw`
    UPDATE games
    SET players_count = players_count + 1,
        status = CASE WHEN players_count + 1 >= players_limit THEN 'FULL' ELSE status END
    WHERE id = ${gameId}
      AND status = 'OPEN'
      AND players_count < players_limit
  `;
  return result === 1;
}

// Атомарно уменьшает players_count и уведомляет следующего из waitlist.
export async function decrementPlayers(gameId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE games
    SET players_count = GREATEST(players_count - 1, 0),
        status = CASE WHEN status = 'FULL' THEN 'OPEN' ELSE status END
    WHERE id = ${gameId}
  `;

  // Уведомить первого из waitlist кто ещё не notified
  const next = await prisma.gameWaitlist.findFirst({
    where: { gameId, notifiedAt: null },
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
}

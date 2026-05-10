import { prisma } from "@/lib/db";

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

// Атомарно уменьшает players_count и при необходимости возвращает статус OPEN.
export async function decrementPlayers(gameId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE games
    SET players_count = GREATEST(players_count - 1, 0),
        status = CASE WHEN status = 'FULL' THEN 'OPEN' ELSE status END
    WHERE id = ${gameId}
  `;
}

import { prisma } from "@/lib/db";

// Автоматически завершить игры, прошедшие 3+ часа назад
export async function autoFinishGames(): Promise<number> {
  const now = new Date();

  const activeGames = await prisma.game.findMany({
    where: { status: { in: ["OPEN", "FULL"] } },
  });

  let finished = 0;

  for (const game of activeGames) {
    const gameDate = new Date(game.date);
    const [hours, minutes] = game.time.split(":").map(Number);
    gameDate.setHours(hours, minutes, 0, 0);

    const endTime = new Date(gameDate.getTime() + 3 * 60 * 60 * 1000);

    if (now >= endTime) {
      await prisma.game.update({
        where: { id: game.id },
        data: { status: "FINISHED" },
      });
      finished++;
    }
  }

  return finished;
}

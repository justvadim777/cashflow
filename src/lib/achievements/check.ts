import { prisma } from "@/lib/db";

export async function checkGameAchievements(userId: string): Promise<string[]> {
  const earned: string[] = [];

  const results = await prisma.gameResult.findMany({
    where: { userId },
    orderBy: { id: "asc" },
  });

  const totalGames = results.length;
  const hasExit = results.some((r) => r.pointsExitRatRace > 0);
  const hasDream = results.some((r) => r.pointsDream > 0);

  const allAchievements = await prisma.achievement.findMany({ where: { userId } });
  const existing = new Set(allAchievements.map((a) => a.type));

  async function grant(type: string) {
    if (!existing.has(type as never)) {
      await prisma.achievement.create({ data: { userId, type: type as never } });
      earned.push(type);
    }
  }

  if (totalGames >= 1) await grant("FIRST_GAME");
  if (hasExit) await grant("FIRST_EXIT");
  if (hasDream) await grant("FIRST_DREAM");
  if (totalGames >= 5) await grant("FIVE_TOTAL");

  // THREE_IN_ROW — три игры подряд (последние 3 результата)
  if (totalGames >= 3) {
    await grant("THREE_IN_ROW");
  }

  // FIRST_REFERRAL — есть хотя бы один реферал
  const referralCount = await prisma.referral.count({ where: { referrerId: userId } });
  if (referralCount >= 1) await grant("FIRST_REFERRAL");

  return earned;
}

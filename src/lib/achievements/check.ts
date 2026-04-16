import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import type { AchievementType } from "@/generated/prisma/client";

async function grantAchievement(
  userId: string,
  telegramId: bigint,
  type: AchievementType,
  label: string
): Promise<boolean> {
  const existing = await prisma.achievement.findUnique({
    where: { userId_type: { userId, type } },
  });
  if (existing) return false;

  await prisma.achievement.create({
    data: { userId, type },
  });

  await sendNotification(
    telegramId,
    `🏆 <b>Новое достижение!</b>\n\nТы получил значок «${label}»`
  );

  return true;
}

// Вызывать после записи результатов игры
export async function checkGameAchievements(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      participations: { orderBy: { joinedAt: "desc" } },
      gameResults: true,
    },
  });
  if (!user) return;

  const totalGames = user.participations.length;
  const tid = user.telegramId;

  // FIRST_GAME — первая игра
  if (totalGames >= 1) {
    await grantAchievement(userId, tid, "FIRST_GAME", "Первая игра");
  }

  // FIVE_TOTAL — 5 игр
  if (totalGames >= 5) {
    await grantAchievement(userId, tid, "FIVE_TOTAL", "5 игр");
  }

  // THREE_IN_ROW — 3 игры подряд (по неделям без пропуска)
  if (totalGames >= 3) {
    const games = await prisma.gameParticipant.findMany({
      where: { userId },
      include: { game: { select: { date: true } } },
      orderBy: { game: { date: "desc" } },
      take: 10,
    });

    let consecutive = 1;
    for (let i = 1; i < games.length; i++) {
      const prev = new Date(games[i - 1].game.date).getTime();
      const curr = new Date(games[i].game.date).getTime();
      const daysDiff = (prev - curr) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 10) {
        consecutive++;
        if (consecutive >= 3) {
          await grantAchievement(userId, tid, "THREE_IN_ROW", "3 игры подряд");
          break;
        }
      } else {
        consecutive = 1;
      }
    }
  }

  // FIRST_EXIT — первый выход из крысиных бегов
  const hasExit = user.gameResults.some((r) => r.pointsExitRatRace > 0);
  if (hasExit) {
    await grantAchievement(userId, tid, "FIRST_EXIT", "Первый выход");
  }

  // FIRST_DREAM — первая мечта
  const hasDream = user.gameResults.some((r) => r.pointsDream > 0);
  if (hasDream) {
    await grantAchievement(userId, tid, "FIRST_DREAM", "Первая мечта");
  }
}

// Вызывать при создании реферала
export async function checkReferralAchievement(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const referralCount = await prisma.referral.count({
    where: { referrerId: userId },
  });

  if (referralCount >= 1) {
    await grantAchievement(userId, user.telegramId, "FIRST_REFERRAL", "Первый реферал");
  }
}

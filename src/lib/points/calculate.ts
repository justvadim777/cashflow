import type { UserLevel } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

interface SkillScores {
  skillFinance: number;
  skillStrategy: number;
  skillOpportunity: number;
  skillDecision: number;
  skillFocus: number;
  skillCommunication: number;
  skillLeadership: number;
  skillAdaptation: number;
  skillLearning: number;
  skillEngagement: number;
}

interface GamePoints {
  pointsExitRatRace: number;  // +10
  pointsLiabilities: number;  // +5
  pointsDream: number;         // +10
  pointsBestIncome: number;    // +10
  pointsIncomeGrowth: number;  // +5 каждые 50k
}

interface ExtraPoints {
  pointsSecret: number;       // +5
  pointsOrder: number;        // +10
  pointsSubscription: number; // +5
  pointsVideoReview: number;  // +5
  pointsStories: number;      // +5
}

export type ResultInput = SkillScores & GamePoints & ExtraPoints;

export function calculateTotalPoints(input: ResultInput): number {
  const skills =
    input.skillFinance +
    input.skillStrategy +
    input.skillOpportunity +
    input.skillDecision +
    input.skillFocus +
    input.skillCommunication +
    input.skillLeadership +
    input.skillAdaptation +
    input.skillLearning +
    input.skillEngagement;

  const gamePoints =
    input.pointsExitRatRace +
    input.pointsLiabilities +
    input.pointsDream +
    input.pointsBestIncome +
    input.pointsIncomeGrowth;

  const extraPoints =
    input.pointsSecret +
    input.pointsOrder +
    input.pointsSubscription +
    input.pointsVideoReview +
    input.pointsStories;

  return skills + gamePoints + extraPoints;
}

export function calculateLevel(totalPoints: number): UserLevel {
  if (totalPoints >= 2001) return "CAPITALIST";
  if (totalPoints >= 501) return "INVESTOR";
  if (totalPoints >= 151) return "PLAYER";
  return "NEWBIE";
}

const LEVEL_NAMES: Record<UserLevel, string> = {
  NEWBIE: "Новичок",
  PLAYER: "Игрок",
  INVESTOR: "Инвестор",
  CAPITALIST: "Капиталист",
};

export function getLevelName(level: UserLevel): string {
  return LEVEL_NAMES[level];
}

export async function recalcUserStatsAfterResult(userId: string): Promise<{
  totalPoints: number;
  monthlyPoints: number;
  newLevel: UserLevel;
  levelUp: boolean;
}> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const allResults = await prisma.gameResult.findMany({
    where: { userId },
    select: { totalPoints: true, id: true },
  });
  const totalPoints = allResults.reduce((s, r) => s + r.totalPoints, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyResults = await prisma.gameResult.findMany({
    where: { userId, game: { date: { gte: startOfMonth } } },
    select: { totalPoints: true },
  });
  const monthlyPoints = monthlyResults.reduce((s, r) => s + r.totalPoints, 0);

  const newLevel = calculateLevel(totalPoints);
  const levelUp = newLevel !== user.level;

  await prisma.user.update({
    where: { id: userId },
    data: { totalPoints, monthlyPoints, level: newLevel },
  });

  if (levelUp) {
    await prisma.notificationLog.upsert({
      where: { userId_gameId_type: { userId, gameId: "system", type: "LEVEL_UP" } },
      create: { userId, gameId: "system", type: "LEVEL_UP" },
      update: { sentAt: new Date() },
    }).catch(() => {
      // ignore unique constraint — create separately
    });
  }

  return { totalPoints, monthlyPoints, newLevel, levelUp };
}

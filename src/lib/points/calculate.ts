import type { UserLevel } from "@/generated/prisma/client";

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

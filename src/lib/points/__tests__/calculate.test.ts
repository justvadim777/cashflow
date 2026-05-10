import { describe, it, expect } from "vitest";
import { calculateTotalPoints, calculateLevel } from "../calculate";

const baseInput = {
  skillFinance: 0, skillStrategy: 0, skillOpportunity: 0,
  skillDecision: 0, skillFocus: 0, skillCommunication: 0,
  skillLeadership: 0, skillAdaptation: 0, skillLearning: 0, skillEngagement: 0,
  pointsExitRatRace: 0, pointsLiabilities: 0, pointsDream: 0,
  pointsBestIncome: 0, pointsIncomeGrowth: 0,
  pointsSecret: 0, pointsOrder: 0, pointsSubscription: 0,
  pointsVideoReview: 0, pointsStories: 0,
};

describe("calculateTotalPoints", () => {
  it("returns 0 for all zeros", () => {
    expect(calculateTotalPoints(baseInput)).toBe(0);
  });

  it("sums all skill scores", () => {
    const input = { ...baseInput, skillFinance: 8, skillStrategy: 7 };
    expect(calculateTotalPoints(input)).toBe(15);
  });

  it("sums game points", () => {
    const input = { ...baseInput, pointsExitRatRace: 10, pointsDream: 10, pointsBestIncome: 10 };
    expect(calculateTotalPoints(input)).toBe(30);
  });

  it("sums extra points", () => {
    const input = { ...baseInput, pointsOrder: 10, pointsSecret: 5 };
    expect(calculateTotalPoints(input)).toBe(15);
  });

  it("sums all fields", () => {
    const input = {
      skillFinance: 10, skillStrategy: 10, skillOpportunity: 10,
      skillDecision: 10, skillFocus: 10, skillCommunication: 10,
      skillLeadership: 10, skillAdaptation: 10, skillLearning: 10, skillEngagement: 10,
      pointsExitRatRace: 10, pointsLiabilities: 5, pointsDream: 10,
      pointsBestIncome: 10, pointsIncomeGrowth: 5,
      pointsSecret: 5, pointsOrder: 10, pointsSubscription: 5,
      pointsVideoReview: 5, pointsStories: 5,
    };
    // 10 skills×10=100 + (10+5+10+10+5)=40 game + (5+10+5+5+5)=30 extra = 170
    expect(calculateTotalPoints(input)).toBe(170);
  });
});

describe("calculateLevel", () => {
  it("returns NEWBIE for 0-150", () => {
    expect(calculateLevel(0)).toBe("NEWBIE");
    expect(calculateLevel(150)).toBe("NEWBIE");
  });

  it("returns PLAYER for 151-500", () => {
    expect(calculateLevel(151)).toBe("PLAYER");
    expect(calculateLevel(500)).toBe("PLAYER");
  });

  it("returns INVESTOR for 501-2000", () => {
    expect(calculateLevel(501)).toBe("INVESTOR");
    expect(calculateLevel(2000)).toBe("INVESTOR");
  });

  it("returns CAPITALIST for 2001+", () => {
    expect(calculateLevel(2001)).toBe("CAPITALIST");
    expect(calculateLevel(99999)).toBe("CAPITALIST");
  });
});

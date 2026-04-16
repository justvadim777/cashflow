import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { calculateTotalPoints, calculateLevel } from "@/lib/points/calculate";
import type { ResultInput } from "@/lib/points/calculate";
import { checkGameAchievements } from "@/lib/achievements/check";

// POST /api/results — ввод результатов (HOST / ADMIN)
export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "HOST" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await _req.json();
    const { gameId, userId, ...scores } = body;

    if (!gameId || !userId) {
      return NextResponse.json({ error: "Missing gameId or userId" }, { status: 400 });
    }

    // Ведущий видит только свои игры
    if (user.role === "HOST") {
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game || game.createdById !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Проверка: участник в игре
    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
    });
    if (!participant) {
      return NextResponse.json({ error: "User is not a participant" }, { status: 400 });
    }

    const resultInput: ResultInput = {
      skillFinance: scores.skillFinance || 0,
      skillStrategy: scores.skillStrategy || 0,
      skillOpportunity: scores.skillOpportunity || 0,
      skillDecision: scores.skillDecision || 0,
      skillFocus: scores.skillFocus || 0,
      skillCommunication: scores.skillCommunication || 0,
      skillLeadership: scores.skillLeadership || 0,
      skillAdaptation: scores.skillAdaptation || 0,
      skillLearning: scores.skillLearning || 0,
      skillEngagement: scores.skillEngagement || 0,
      pointsExitRatRace: scores.pointsExitRatRace || 0,
      pointsLiabilities: scores.pointsLiabilities || 0,
      pointsDream: scores.pointsDream || 0,
      pointsBestIncome: scores.pointsBestIncome || 0,
      pointsIncomeGrowth: scores.pointsIncomeGrowth || 0,
      pointsSecret: scores.pointsSecret || 0,
      pointsOrder: scores.pointsOrder || 0,
      pointsSubscription: scores.pointsSubscription || 0,
      pointsVideoReview: scores.pointsVideoReview || 0,
      pointsStories: scores.pointsStories || 0,
    };

    const totalPoints = calculateTotalPoints(resultInput);

    const result = await prisma.gameResult.upsert({
      where: { gameId_userId: { gameId, userId } },
      create: {
        gameId,
        userId,
        ...resultInput,
        totalPoints,
      },
      update: {
        ...resultInput,
        totalPoints,
      },
    });

    // Пересчитать общие баллы пользователя
    const allResults = await prisma.gameResult.findMany({
      where: { userId },
      select: { totalPoints: true },
    });
    const userTotalPoints = allResults.reduce((sum: number, r: { totalPoints: number }) => sum + r.totalPoints, 0);
    const newLevel = calculateLevel(userTotalPoints);

    // Пересчитать месячные баллы (результаты текущего месяца)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyResults = await prisma.gameResult.findMany({
      where: {
        userId,
        game: { date: { gte: monthStart } },
      },
      select: { totalPoints: true },
    });
    const userMonthlyPoints = monthlyResults.reduce(
      (sum: number, r: { totalPoints: number }) => sum + r.totalPoints,
      0
    );

    const previousUser = await prisma.user.findUnique({ where: { id: userId } });
    const previousLevel = previousUser?.level;

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: userTotalPoints,
        monthlyPoints: userMonthlyPoints,
        level: newLevel,
      },
    });

    // Уведомление о новом уровне
    if (previousLevel && previousLevel !== newLevel && previousUser) {
      const { sendNotification } = await import("@/lib/notifications/bot");
      const { NOTIFICATION_TEMPLATES } = await import("@/lib/notifications/templates");
      const levelLabels: Record<string, string> = {
        NEWBIE: "Новичок",
        PLAYER: "Игрок",
        INVESTOR: "Инвестор",
        CAPITALIST: "Капиталист",
      };
      await sendNotification(
        previousUser.telegramId,
        NOTIFICATION_TEMPLATES.LEVEL_UP(levelLabels[newLevel] || newLevel)
      );
    }

    // Проверить достижения после обновления результатов
    await checkGameAchievements(userId);

    return NextResponse.json({ result, userTotalPoints, newLevel });
  });
}

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
    const hookahRevenue = scores.hookahRevenue || 0;

    const result = await prisma.gameResult.upsert({
      where: { gameId_userId: { gameId, userId } },
      create: {
        gameId,
        userId,
        ...resultInput,
        totalPoints,
        hookahRevenue,
      },
      update: {
        ...resultInput,
        totalPoints,
        hookahRevenue,
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

    const { sendNotification, sendNotificationWithButton } = await import("@/lib/notifications/bot");
    const { NOTIFICATION_TEMPLATES } = await import("@/lib/notifications/templates");
    const levelLabels: Record<string, string> = {
      NEWBIE: "Новичок",
      PLAYER: "Игрок",
      INVESTOR: "Инвестор",
      CAPITALIST: "Капиталист",
    };

    // Позиция в рейтинге
    const rank = await prisma.user.count({
      where: { totalPoints: { gt: userTotalPoints } },
    }) + 1;

    // Уведомление с результатом игры
    if (previousUser) {
      let message = NOTIFICATION_TEMPLATES.GAME_RESULT(
        totalPoints,
        rank,
        levelLabels[newLevel] || newLevel
      );

      // Смена уровня
      if (previousLevel && previousLevel !== newLevel) {
        message += `\n\n${NOTIFICATION_TEMPLATES.LEVEL_UP(levelLabels[newLevel] || newLevel)}`;
      }

      await sendNotification(previousUser.telegramId, message);
    }

    // Upsell: после первой BASE игры → предложить MAIN
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (game?.type === "BASE" && previousUser) {
      const baseGamesCount = await prisma.gameResult.count({
        where: { userId, game: { type: "BASE" } },
      });
      if (baseGamesCount === 1) {
        const appUrl = process.env.NEXT_PUBLIC_TG_APP_URL || "";
        await sendNotificationWithButton(
          previousUser.telegramId,
          NOTIFICATION_TEMPLATES.UPSELL_MAIN(),
          "Записаться в Продвинутую",
          `${appUrl}/games`
        );
      }
    }

    // Проверить достижения после обновления результатов
    await checkGameAchievements(userId);

    return NextResponse.json({ result, userTotalPoints, newLevel });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { calculateTotalPoints, recalcUserStatsAfterResult, getLevelName } from "@/lib/points/calculate";
import type { ResultInput } from "@/lib/points/calculate";
import { checkGameAchievements } from "@/lib/achievements/check";
import { sendNotification } from "@/lib/notifications/bot";
import { NOTIFICATION_TEMPLATES } from "@/lib/notifications/templates";

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

    if (user.role === "HOST") {
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game || game.createdById !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

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
      create: { gameId, userId, ...resultInput, totalPoints },
      update: { ...resultInput, totalPoints },
    });

    // Пересчёт уровня и баллов
    const { totalPoints: userTotal, newLevel, levelUp } = await recalcUserStatsAfterResult(userId);

    // Место в общем рейтинге
    const rank =
      (await prisma.user.count({ where: { totalPoints: { gt: userTotal } } })) + 1;

    // Пуш игроку с результатом
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (targetUser) {
      await sendNotification(
        targetUser.telegramId,
        NOTIFICATION_TEMPLATES.GAME_RESULT(totalPoints, rank)
      );

      if (levelUp) {
        await sendNotification(
          targetUser.telegramId,
          NOTIFICATION_TEMPLATES.LEVEL_UP(getLevelName(newLevel))
        );
      }
    }

    // Проверка достижений
    const newAchievements = await checkGameAchievements(userId);

    return NextResponse.json({ result, userTotalPoints: userTotal, newLevel, rank, newAchievements });
  });
}

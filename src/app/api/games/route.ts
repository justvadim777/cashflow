import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import type { GameType } from "@/generated/prisma/client";

// GET /api/games — список игр
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    const url = new URL(_req.url);
    const type = url.searchParams.get("type") as GameType | null;
    const status = url.searchParams.get("status");

    const games = await prisma.game.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status === "active" ? { status: { in: ["OPEN", "FULL"] } } : {}),
        ...(status === "finished" ? { status: "FINISHED" } : {}),
      },
      include: {
        participants: {
          select: {
            id: true,
            confirmed: true,
            userId: true,
            user: {
              select: { id: true, displayName: true, avatarUrl: true, username: true },
            },
          },
        },
        _count: { select: { participants: true } },
      },
      orderBy: { date: "asc" },
    });

    const serialized = games.map((game: { price: number } & Record<string, unknown>) => ({
      ...game,
      price: game.price,
    }));

    return NextResponse.json({ games: serialized, userId: user.id });
  });
}

// POST /api/games — создание игры (HOST / ADMIN)
export async function POST(req: NextRequest) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "HOST" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await _req.json();
    const { date, time, type, price, playersLimit, description } = body;

    if (!date || !time || !price || !playersLimit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const game = await prisma.game.create({
      data: {
        date: new Date(date),
        time,
        type: type || "BASE",
        price: Math.round(price),
        playersLimit,
        description: description || null,
        createdById: user.id,
      },
    });

    return NextResponse.json({ game }, { status: 201 });
  });
}

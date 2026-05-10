import { NextRequest, NextResponse } from "next/server";
import { validateInitData } from "./validate";
import { prisma } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

export interface AuthenticatedRequest {
  user: User;
  initData: ReturnType<typeof validateInitData>;
}

// TTL-кэш для ограничения частоты синхронизации Telegram-данных — 1 час
const syncCache = new Map<string, number>();
const SYNC_TTL_MS = 60 * 60 * 1000;

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, auth: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const initDataHeader = req.headers.get("x-telegram-init-data");
  if (!initDataHeader) {
    return NextResponse.json({ error: "Missing init data" }, { status: 401 });
  }

  const initData = validateInitData(initDataHeader);
  if (!initData) {
    return NextResponse.json({ error: "Invalid init data" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(initData.user.id) },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Синхронизировать username/displayName не чаще раза в час
  const cacheKey = String(initData.user.id);
  const lastSync = syncCache.get(cacheKey) ?? 0;
  if (Date.now() - lastSync > SYNC_TTL_MS) {
    const tgUser = initData.user;
    const freshUsername = tgUser.username ?? null;
    const freshDisplayName =
      [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || user.displayName;
    const freshAvatar = tgUser.photo_url ?? null;

    if (
      user.username !== freshUsername ||
      user.displayName !== freshDisplayName ||
      (freshAvatar && user.avatarUrl !== freshAvatar)
    ) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: freshUsername,
          displayName: freshDisplayName,
          ...(freshAvatar ? { avatarUrl: freshAvatar } : {}),
        },
      });
    }
    syncCache.set(cacheKey, Date.now());
  }

  return handler(req, { user, initData });
}

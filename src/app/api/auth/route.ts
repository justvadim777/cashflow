import { NextRequest, NextResponse } from "next/server";
import { validateInitData } from "@/lib/telegram/validate";
import { prisma } from "@/lib/db";
import { getRoleByTelegramId } from "@/lib/telegram/roles";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const initData = validateInitData(body.initData);

  if (!initData) {
    return NextResponse.json({ error: "Invalid init data" }, { status: 401 });
  }

  const { user: tgUser, startParam } = initData;
  const telegramId = BigInt(tgUser.id);

  const rl = checkRateLimit(`auth:${telegramId}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    const displayName = [tgUser.first_name, tgUser.last_name]
      .filter(Boolean)
      .join(" ");

    const referralCode = crypto.randomBytes(4).toString("hex");
    const role = getRoleByTelegramId(telegramId);

    let referredById: string | undefined;
    if (startParam?.startsWith("ref_")) {
      const code = startParam.replace("ref_", "");
      const referrer = await prisma.user.findUnique({
        where: { referralCode: code },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    await audit("ROLE_CHANGE", telegramId, `new user ${telegramId}`, { role });
    user = await prisma.user.create({
      data: {
        telegramId,
        username: tgUser.username || null,
        displayName,
        avatarUrl: tgUser.photo_url || null,
        referralCode,
        referredById,
        role,
      },
    });
  } else {
    const updates: {
      role?: ReturnType<typeof getRoleByTelegramId>;
      referredById?: string;
      username?: string | null;
      displayName?: string;
      avatarUrl?: string | null;
    } = {};

    // Повысить роль если env-конфиг указывает на более высокую
    const envRole = getRoleByTelegramId(telegramId);
    const roleOrder: Record<string, number> = { PLAYER: 0, HOST: 1, ADMIN: 2, OWNER: 3 };
    if (roleOrder[envRole] > roleOrder[user.role]) {
      updates.role = envRole;
    }

    // Привязать реферала если ещё не привязан и есть startParam
    if (!user.referredById && startParam?.startsWith("ref_")) {
      const code = startParam.replace("ref_", "");
      const referrer = await prisma.user.findUnique({
        where: { referralCode: code },
      });
      if (referrer && referrer.id !== user.id) {
        updates.referredById = referrer.id;
      }
    }

    // Синхронизировать актуальные Telegram-данные
    const freshDisplayName =
      [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || user.displayName;
    const freshUsername = tgUser.username ?? null;
    const freshAvatar = tgUser.photo_url ?? null;

    if (user.username !== freshUsername) updates.username = freshUsername;
    if (user.displayName !== freshDisplayName) updates.displayName = freshDisplayName;
    if (freshAvatar && user.avatarUrl !== freshAvatar) updates.avatarUrl = freshAvatar;

    if (Object.keys(updates).length > 0) {
      user = await prisma.user.update({
        where: { telegramId },
        data: updates,
      });
    }
  }

  return NextResponse.json({
    user: {
      ...user,
      telegramId: user.telegramId.toString(),
      referralBalance: user.referralBalance,
    },
  });
}

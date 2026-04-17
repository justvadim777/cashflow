import { NextRequest, NextResponse } from "next/server";
import { validateInitData } from "@/lib/telegram/validate";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import type { UserRole } from "@/generated/prisma/client";

// Telegram ID → роль при регистрации
const ADMIN_IDS: Record<string, UserRole> = {
  "616176317": "ADMIN",
  "5712505670": "ADMIN",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const initData = validateInitData(body.initData);

  if (!initData) {
    return NextResponse.json({ error: "Invalid init data" }, { status: 401 });
  }

  const { user: tgUser, startParam } = initData;
  const telegramId = BigInt(tgUser.id);

  let user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    const displayName = [tgUser.first_name, tgUser.last_name]
      .filter(Boolean)
      .join(" ");

    const referralCode = crypto.randomBytes(4).toString("hex");
    const assignedRole = ADMIN_IDS[tgUser.id.toString()] || "PLAYER";

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

    user = await prisma.user.create({
      data: {
        telegramId,
        username: tgUser.username || null,
        displayName,
        avatarUrl: tgUser.photo_url || null,
        referralCode,
        referredById,
        role: assignedRole,
      },
    });
  } else {
    // Пользователь уже есть — проверяем обновления
    const updates: { role?: UserRole; referredById?: string } = {};

    // Обновить роль, если админский ID и ещё PLAYER
    if (ADMIN_IDS[tgUser.id.toString()] && user.role === "PLAYER") {
      updates.role = ADMIN_IDS[tgUser.id.toString()];
    }

    // Привязать реферала, если ещё не привязан и есть startParam
    if (!user.referredById && startParam?.startsWith("ref_")) {
      const code = startParam.replace("ref_", "");
      const referrer = await prisma.user.findUnique({
        where: { referralCode: code },
      });
      if (referrer && referrer.id !== user.id) {
        updates.referredById = referrer.id;
      }
    }

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

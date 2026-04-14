import { NextRequest, NextResponse } from "next/server";
import { validateInitData } from "@/lib/telegram/validate";
import { prisma } from "@/lib/db";
import crypto from "crypto";

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
      },
    });
  }

  return NextResponse.json({
    user: {
      ...user,
      telegramId: user.telegramId.toString(),
      referralBalance: user.referralBalance,
    },
  });
}

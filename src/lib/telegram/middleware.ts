import { NextRequest, NextResponse } from "next/server";
import { validateInitData } from "./validate";
import { prisma } from "@/lib/db";
import type { User } from "@/generated/prisma/client";

export interface AuthenticatedRequest {
  user: User;
  initData: ReturnType<typeof validateInitData>;
}

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

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(initData.user.id) },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return handler(req, { user, initData });
}

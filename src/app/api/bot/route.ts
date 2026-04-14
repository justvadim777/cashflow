import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/notifications/bot";
import { webhookCallback } from "grammy";

// Telegram Bot Webhook handler
export async function POST(req: NextRequest) {
  // Проверка секретного токена
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_BOT_SECRET && secret !== process.env.TELEGRAM_BOT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bot = getBot();
    const handler = webhookCallback(bot, "std/http");
    return await handler(req);
  } catch (error) {
    console.error("Bot webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}

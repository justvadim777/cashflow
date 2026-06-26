import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/notifications/bot";
import { webhookCallback } from "grammy";

// Telegram Bot Webhook handler
export async function POST(req: NextRequest) {
  // В production TELEGRAM_BOT_SECRET обязателен
  if (process.env.NODE_ENV === "production" && !process.env.TELEGRAM_BOT_SECRET) {
    console.error("TELEGRAM_BOT_SECRET is required in production");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

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

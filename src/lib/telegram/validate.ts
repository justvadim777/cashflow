import crypto from "crypto";
import type { ValidatedInitData, TelegramUser } from "@/types/telegram";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export function validateInitData(initData: string): ValidatedInitData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;

  const user: TelegramUser = JSON.parse(userRaw);
  const authDate = Number(params.get("auth_date") || 0);

  // Проверка: initData не старше 1 часа
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 3600) return null;

  return {
    user,
    authDate,
    hash,
    queryId: params.get("query_id") || undefined,
    startParam: params.get("start_param") || undefined,
  };
}

import type { UserRole } from "@/generated/prisma/client";

const parseIds = (env?: string): Set<string> =>
  new Set((env ?? "").split(",").map((s) => s.trim()).filter(Boolean));

const OWNER_IDS = parseIds(process.env.OWNER_TELEGRAM_IDS);
const ADMIN_IDS = parseIds(process.env.ADMIN_TELEGRAM_IDS);
const HOST_IDS = parseIds(process.env.HOST_TELEGRAM_IDS);

export function getRoleByTelegramId(id: string | number | bigint): UserRole {
  const s = id.toString();
  if (ADMIN_IDS.has(s)) return "ADMIN";
  if (OWNER_IDS.has(s)) return "OWNER";
  if (HOST_IDS.has(s)) return "HOST";
  return "PLAYER";
}

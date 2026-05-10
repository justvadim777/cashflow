import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function audit(
  action: string,
  actorTelegramId: bigint | number,
  target?: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorTelegramId: BigInt(actorTelegramId),
        action,
        target: target ?? null,
        payload: payload !== undefined ? (payload as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch {
    // Аудит не должен прерывать основной поток
    console.error("Audit log failed:", action);
  }
}

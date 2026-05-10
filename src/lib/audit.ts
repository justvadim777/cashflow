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
        payload: payload ?? null,
      },
    });
  } catch {
    // Аудит не должен прерывать основной поток
    console.error("Audit log failed:", action);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/telegram";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/bot";
import { audit } from "@/lib/audit";

// PATCH /api/admin/refunds/[id] — обновление статуса возврата (ADMIN/OWNER)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await _req.json();
    const { status } = body as { status: "PROCESSING" | "DONE" };

    if (!status || !["PROCESSING", "DONE"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const refund = await prisma.refundRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!refund) {
      return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
    }

    await audit("REFUND_STATUS_CHANGE", user.telegramId, `refund:${id}`, { status });

    const updated = await prisma.refundRequest.update({
      where: { id },
      data: {
        status,
        processedAt: status === "DONE" ? new Date() : undefined,
      },
    });

    const msg =
      status === "PROCESSING"
        ? `Твоя заявка на возврат ${(refund.amount / 100).toLocaleString("ru-RU")} ₽ принята в обработку`
        : `Возврат ${(refund.amount / 100).toLocaleString("ru-RU")} ₽ выполнен`;

    await sendNotification(refund.user.telegramId, msg);

    return NextResponse.json({ refund: updated });
  });
}

// GET /api/admin/refunds/[id] — список возвратов (можно передать id=all)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (_req, { user }) => {
    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (id === "all") {
      const refunds = await prisma.refundRequest.findMany({
        include: {
          user: { select: { displayName: true, telegramId: true } },
          game: { select: { date: true, time: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ refunds });
    }

    const refund = await prisma.refundRequest.findUnique({
      where: { id },
      include: {
        user: { select: { displayName: true, telegramId: true } },
        game: { select: { date: true, time: true } },
      },
    });

    if (!refund) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ refund });
  });
}

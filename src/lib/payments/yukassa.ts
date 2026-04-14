import crypto from "crypto";

const SHOP_ID = process.env.YUKASSA_SHOP_ID!;
const SECRET_KEY = process.env.YUKASSA_SECRET_KEY!;

interface CreatePaymentParams {
  amount: number; // в копейках
  description: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}

interface YuKassaPayment {
  id: string;
  status: string;
  amount: { value: string; currency: string };
  confirmation?: { confirmation_url: string };
  metadata?: Record<string, string>;
}

export async function createPayment(params: CreatePaymentParams): Promise<YuKassaPayment> {
  const idempotencyKey = crypto.randomUUID();
  const amountValue = (params.amount / 100).toFixed(2);

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": idempotencyKey,
      Authorization: `Basic ${Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: { value: amountValue, currency: "RUB" },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: params.returnUrl,
      },
      description: params.description,
      metadata: params.metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YuKassa error: ${response.status} ${error}`);
  }

  return response.json();
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  // ЮКасса использует IP whitelist для webhook-ов
  // Дополнительная проверка через secret если настроено
  if (!process.env.YUKASSA_WEBHOOK_SECRET) return true;

  const expected = crypto
    .createHmac("sha256", process.env.YUKASSA_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

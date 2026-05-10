import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";

process.env.YUKASSA_WEBHOOK_SECRET = "test_secret_key";

const { verifyWebhookSignature } = await import("../yukassa");

describe("verifyWebhookSignature", () => {
  it("returns true for valid signature", () => {
    const body = JSON.stringify({ event: "payment.succeeded" });
    const sig = crypto
      .createHmac("sha256", "test_secret_key")
      .update(body)
      .digest("hex");
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const body = JSON.stringify({ event: "payment.succeeded" });
    expect(verifyWebhookSignature(body, "invalidsignature123")).toBe(false);
  });

  it("returns true when no secret set", () => {
    const original = process.env.YUKASSA_WEBHOOK_SECRET;
    delete process.env.YUKASSA_WEBHOOK_SECRET;
    expect(verifyWebhookSignature("any", "any")).toBe(true);
    process.env.YUKASSA_WEBHOOK_SECRET = original;
  });
});

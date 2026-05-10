import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Мокаем TELEGRAM_BOT_TOKEN перед импортом модуля
process.env.TELEGRAM_BOT_TOKEN = "test_token_123";

const { validateInitData } = await import("../validate");

function makeInitData(overrides: Record<string, string> = {}, token = "test_token_123") {
  const authDate = Math.floor(Date.now() / 1000);
  const user = JSON.stringify({ id: 123456789, first_name: "Test", username: "test" });

  const params = new URLSearchParams({
    user,
    auth_date: String(authDate),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    ...overrides,
  });

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  params.set("hash", hash);
  return params.toString();
}

describe("validateInitData", () => {
  it("validates correct initData", () => {
    const result = validateInitData(makeInitData());
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe(123456789);
  });

  it("rejects tampered hash", () => {
    const data = makeInitData();
    const tampered = data.replace(/hash=[^&]+/, "hash=invalidhash");
    expect(validateInitData(tampered)).toBeNull();
  });

  it("rejects missing hash", () => {
    const params = new URLSearchParams({ user: "{}", auth_date: String(Date.now() / 1000) });
    expect(validateInitData(params.toString())).toBeNull();
  });

  it("rejects expired auth_date (>1 hour ago)", () => {
    const oldDate = Math.floor(Date.now() / 1000) - 3700;
    const data = makeInitData({ auth_date: String(oldDate) });
    expect(validateInitData(data)).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.YUKASSA_SHOP_ID = "test_shop";
process.env.YUKASSA_SECRET_KEY = "test_key";

const { cancelPayment, refundPayment } = await import("../yukassa");

describe("cancelPayment", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("calls the cancel endpoint with correct path", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await cancelPayment("pay_123");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.yookassa.ru/v3/payments/pay_123/cancel",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("error", { status: 422 }));

    await expect(cancelPayment("pay_bad")).rejects.toThrow("YuKassa cancel error: 422");
  });
});

describe("refundPayment", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("calls the refunds endpoint with correct amount", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await refundPayment("pay_456", 70000);

    const [url, opts] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.yookassa.ru/v3/refunds");
    const body = JSON.parse(opts.body as string);
    expect(body.payment_id).toBe("pay_456");
    expect(body.amount.value).toBe("700.00");
    expect(body.amount.currency).toBe("RUB");
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("err", { status: 400 }));

    await expect(refundPayment("pay_bad", 100)).rejects.toThrow("YuKassa refund error: 400");
  });
});

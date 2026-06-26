import { describe, it, expect } from "vitest";
import { isYukassaIp } from "../yukassa-ips";

describe("isYukassaIp", () => {
  it("accepts IP in 185.71.76.0/27 range", () => {
    expect(isYukassaIp("185.71.76.1")).toBe(true);
    expect(isYukassaIp("185.71.76.31")).toBe(true);
  });

  it("accepts IP in 77.75.153.0/25 range", () => {
    expect(isYukassaIp("77.75.153.1")).toBe(true);
    expect(isYukassaIp("77.75.153.127")).toBe(true);
  });

  it("accepts exact IPs", () => {
    expect(isYukassaIp("77.75.156.11")).toBe(true);
    expect(isYukassaIp("77.75.156.35")).toBe(true);
  });

  it("rejects IP outside all ranges", () => {
    expect(isYukassaIp("1.1.1.1")).toBe(false);
    expect(isYukassaIp("185.71.76.32")).toBe(false);
    expect(isYukassaIp("77.75.153.128")).toBe(false);
  });

  it("handles invalid IP gracefully", () => {
    expect(isYukassaIp("not-an-ip")).toBe(false);
    expect(isYukassaIp("")).toBe(false);
  });
});

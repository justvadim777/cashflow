import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем модуль целиком для unit-теста без реальной БД
vi.mock("@/lib/db", () => ({
  prisma: {
    $executeRaw: vi.fn(),
    gameWaitlist: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications/bot", () => ({
  sendNotification: vi.fn(),
}));

const { tryIncrementPlayers, decrementPlayers } = await import("../atomic-join");
const { prisma } = await import("@/lib/db");

describe("tryIncrementPlayers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when row was updated (result === 1)", async () => {
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);
    const result = await tryIncrementPlayers("game-123");
    expect(result).toBe(true);
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
  });

  it("returns false when no rows updated (game full or not open)", async () => {
    vi.mocked(prisma.$executeRaw).mockResolvedValue(0);
    const result = await tryIncrementPlayers("game-456");
    expect(result).toBe(false);
  });
});

describe("decrementPlayers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes decrement query", async () => {
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);
    await decrementPlayers("game-123");
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
  });

  it("checks waitlist after decrement", async () => {
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1);
    vi.mocked(prisma.gameWaitlist.findFirst).mockResolvedValue(null);
    await decrementPlayers("game-789");
    expect(prisma.gameWaitlist.findFirst).toHaveBeenCalledOnce();
  });
});

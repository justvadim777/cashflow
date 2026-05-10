/**
 * E2E-тест реферальной цепочки против прода.
 * Запуск: DATABASE_URL="..." TELEGRAM_BOT_TOKEN="..." ADMIN_TELEGRAM_IDS="..." npx tsx scripts/test-referrals.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { forgeInitData } from "./lib/forge-init-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const PROD = "https://72-56-250-40.sslip.io";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_TG_ID = Number(process.env.ADMIN_TELEGRAM_IDS!.split(",")[0]);

const REFERRER_TG_ID = 999800001;
const REFERRED_TG_ID = 999800002;

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
}
function fail(label: string, detail?: string) {
  console.error(`  ❌ ${label}${detail ? `: ${detail}` : ""}`);
  failed++;
}

async function clearTestData() {
  const tgIds = [REFERRER_TG_ID, REFERRED_TG_ID].map(BigInt);
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await prisma.notificationLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.withdrawalRequest.deleteMany({ where: { userId: { in: ids } } });
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: { in: ids } }, { referredId: { in: ids } }] } });
    await prisma.gameResult.deleteMany({ where: { userId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { userId: { in: ids } } });
    await prisma.gameParticipant.deleteMany({ where: { userId: { in: ids } } });
    await prisma.achievement.deleteMany({ where: { userId: { in: ids } } });
  }
  // Игры удаляем ДО пользователей (FK games.created_by_id)
  await prisma.game.deleteMany({ where: { id: { startsWith: "ref-test-" } } });
  if (ids.length) {
    await prisma.user.deleteMany({ where: { telegramId: { in: tgIds } } });
  }
}

async function api(path: string, init: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${PROD}${path}`, init);
  const text = await r.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep as string */ }
  return { status: r.status, body };
}

async function main() {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  if (!ADMIN_TG_ID) throw new Error("ADMIN_TELEGRAM_IDS not set");

  // ── Очистка ──────────────────────────────────────────────────────────────────
  console.log("[1/8] Очистка тестовых данных...");
  await clearTestData();
  console.log("  OK");

  // ── Шаг 1: Регистрация реферёра ───────────────────────────────────────────────
  console.log("[2/8] Регистрация реферёра...");
  const referrerInit = forgeInitData(TOKEN, {
    id: REFERRER_TG_ID,
    first_name: "Referrer",
    username: "test_referrer",
  });
  const reg1 = await api("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData: referrerInit }),
  }) as { status: number; body: { user?: { id: string; referralCode: string } } };

  if (reg1.status !== 200 || !reg1.body.user) {
    fail("Регистрация реферёра", `status=${reg1.status}`);
    await cleanup();
    return;
  }
  const referralCode = reg1.body.user.referralCode;
  const referrerId = reg1.body.user.id;
  ok(`Реферёр создан: id=${referrerId}, code=${referralCode}`);

  // ── Шаг 2: Регистрация реферала с start_param ─────────────────────────────────
  console.log("[3/8] Регистрация реферала через start_param...");
  const referredInit = forgeInitData(
    TOKEN,
    { id: REFERRED_TG_ID, first_name: "Referred", username: "test_referred" },
    `ref_${referralCode}`
  );
  const reg2 = await api("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData: referredInit }),
  }) as { status: number; body: { user?: { id: string; referredById?: string } } };

  if (reg2.status !== 200 || reg2.body.user?.referredById !== referrerId) {
    fail("start_param → referredById", `got ${reg2.body.user?.referredById}, expected ${referrerId}`);
  } else {
    ok(`referredById выставлен: ${reg2.body.user.referredById}`);
  }

  // ── Шаг 3: Создать игру и записать реферала (CASH) ───────────────────────────
  console.log("[4/8] Создание игры + участник CASH...");
  const game = await prisma.game.create({
    data: {
      id: "ref-test-game-1",
      date: new Date(Date.now() + 7 * 86400 * 1000),
      time: "19:00",
      type: "BASE",
      price: 70000,
      playersLimit: 6,
      createdById: referrerId,
    },
  });

  const refUser = await prisma.user.findUnique({ where: { telegramId: BigInt(REFERRED_TG_ID) } });
  if (!refUser) {
    fail("Реферал не найден в БД"); await cleanup(); return;
  }
  await prisma.gameParticipant.create({
    data: {
      gameId: game.id,
      userId: refUser.id,
      paymentMethod: "CASH",
      confirmed: false,
    },
  });
  ok(`Участник создан: userId=${refUser.id}, gameId=${game.id}`);

  // ── Шаг 4: Админ подтверждает CASH ────────────────────────────────────────────
  console.log("[5/8] CASH confirm...");
  const adminInit = forgeInitData(TOKEN, {
    id: ADMIN_TG_ID,
    first_name: "Admin",
    username: "admin_e2e",
  });

  const confirm = await api(`/api/games/${game.id}/confirm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-telegram-init-data": adminInit },
    body: JSON.stringify({ userId: refUser.id, action: "confirm", amount: 700 }),
  }) as { status: number; body: unknown };

  if (confirm.status !== 200) {
    fail("CASH confirm", `status=${confirm.status} body=${JSON.stringify(confirm.body).slice(0, 150)}`);
    await cleanup(); return;
  }

  await new Promise((r) => setTimeout(r, 500));

  // Проверяем Referral запись
  const referralRow = await prisma.referral.findFirst({
    where: { referrerId, referredId: refUser.id, gameId: game.id },
  });
  if (!referralRow) {
    fail("Referral запись не создалась после CASH confirm");
  } else if (referralRow.amount !== 10500) {
    fail("Сумма реферала", `${referralRow.amount}, ожидаем 10500 (15% от 70000)`);
  } else {
    ok(`Referral создан: amount=${referralRow.amount} копеек`);
  }

  // Проверяем referralBalance реферёра
  const referrerAfter = await prisma.user.findUnique({ where: { id: referrerId } });
  if (referrerAfter?.referralBalance !== 10500) {
    fail("referralBalance", `${referrerAfter?.referralBalance}, ожидаем 10500`);
  } else {
    ok(`referralBalance обновлён: ${referrerAfter.referralBalance}`);
  }

  // ── Шаг 5: Двойной confirm — должен вернуть 409 ───────────────────────────────
  console.log("[6/8] Двойной confirm (защита от дублирования)...");
  const reConfirm = await api(`/api/games/${game.id}/confirm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-telegram-init-data": adminInit },
    body: JSON.stringify({ userId: refUser.id, action: "confirm", amount: 700 }),
  }) as { status: number; body: unknown };

  const allRefs = await prisma.referral.count({ where: { referrerId, referredId: refUser.id } });
  if (reConfirm.status === 409) {
    ok(`Двойной confirm отклонён (409), записей Referral: ${allRefs}`);
  } else if (allRefs === 1) {
    ok(`Дубликат не создался (Referral count=1), status=${reConfirm.status}`);
  } else {
    fail("Дубликат создался", `allRefs=${allRefs}, reConfirm.status=${reConfirm.status}`);
  }

  // ── Шаг 6: GET /api/referral ──────────────────────────────────────────────────
  console.log("[7/8] GET /api/referral...");
  const refList = await api("/api/referral", {
    headers: { "x-telegram-init-data": referrerInit },
  }) as { status: number; body: { totalCount?: number; balance?: number; paidCount?: number; referrals?: unknown[] } };

  if (refList.status !== 200) {
    fail("GET /api/referral", `status=${refList.status}`);
  } else {
    const b = refList.body;
    if ((b.totalCount ?? 0) < 1) fail("totalCount", `${b.totalCount}`);
    else ok(`totalCount=${b.totalCount}`);

    if (b.balance !== 10500) fail("balance", `${b.balance}, ожидаем 10500`);
    else ok(`balance=${b.balance}`);
  }

  // ── Шаг 7: Заявка на вывод ────────────────────────────────────────────────────
  console.log("[8/8] Заявка на вывод...");
  const withdraw = await api("/api/referral/withdraw", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-telegram-init-data": referrerInit },
    body: JSON.stringify({ amount: 10500 }),
  }) as { status: number; body: { withdrawal?: { id: string; status: string } } };

  if (withdraw.status !== 201 || !withdraw.body.withdrawal) {
    fail("Withdrawal request", `status=${withdraw.status}`);
  } else {
    ok(`Withdrawal создан: id=${withdraw.body.withdrawal.id}, status=${withdraw.body.withdrawal.status}`);
  }

  // ── Итоги ─────────────────────────────────────────────────────────────────────
  await cleanup();
  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Пройдено: ${passed}   ❌ Провалено: ${failed}`);
  if (failed > 0) process.exit(1);
  else { console.log("=== ВСЁ ОК ==="); process.exit(0); }
}

async function cleanup() {
  await clearTestData();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Fatal:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});

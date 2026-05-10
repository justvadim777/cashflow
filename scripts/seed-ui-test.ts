/**
 * Засевает прод тестовыми данными для UI-тестов Playwright.
 * Запуск: DATABASE_URL="..." npx tsx scripts/seed-ui-test.ts
 * Удаление: DATABASE_URL="..." npx tsx scripts/seed-ui-test.ts --cleanup
 */
import { Client } from "pg";

const DB_URL = process.env.DATABASE_URL!;
const CLEANUP = process.argv.includes("--cleanup");
const ADMIN_USER_ID = "cmnyo69g10000bzxx7lgdqffo"; // Вадим

async function main() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  if (CLEANUP) {
    await cleanup(db);
    await db.end();
    return;
  }

  await seed(db);
  await db.end();
}

async function cleanup(db: Client) {
  console.log("🧹 Удаляем тестовые данные...");
  await db.query(`DELETE FROM game_results WHERE game_id LIKE 'ui-test-%'`);
  await db.query(`DELETE FROM payments WHERE game_id LIKE 'ui-test-%'`);
  await db.query(`DELETE FROM game_participants WHERE game_id LIKE 'ui-test-%'`);
  await db.query(`DELETE FROM games WHERE id LIKE 'ui-test-%'`);
  await db.query(`DELETE FROM users WHERE id LIKE 'ui-test-%'`);
  console.log("✅ Тестовые данные удалены");
}

async function seed(db: Client) {
  console.log("🌱 Засеиваем тестовые данные...");

  // === Пользователи ===
  const users = [
    { id: "ui-test-user-001", tgId: 999000001, name: "UI Test",   username: "ui_test",    role: "PLAYER", mp: 0,    code: "uitest01" },
    { id: "ui-test-top-001",  tgId: 999000002, name: "Top Player", username: "top_player", role: "PLAYER", mp: 9999, code: "toptst01" },
    { id: "ui-test-user-002", tgId: 999000003, name: "Player 2",   username: null,         role: "PLAYER", mp: 0,    code: "uitst002" },
    { id: "ui-test-user-003", tgId: 999000004, name: "Player 3",   username: null,         role: "PLAYER", mp: 0,    code: "uitst003" },
    { id: "ui-test-user-004", tgId: 999000005, name: "Player 4",   username: null,         role: "PLAYER", mp: 0,    code: "uitst004" },
    { id: "ui-test-user-005", tgId: 999000006, name: "Player 5",   username: null,         role: "PLAYER", mp: 0,    code: "uitst005" },
    { id: "ui-test-user-006", tgId: 999000007, name: "Player 6",   username: null,         role: "PLAYER", mp: 0,    code: "uitst006" },
  ];

  for (const u of users) {
    await db.query(
      `INSERT INTO users (id, telegram_id, username, display_name, role, monthly_points, referral_code)
       VALUES ($1, $2, $3, $4, $5::\"UserRole\", $6, $7)
       ON CONFLICT (telegram_id) DO UPDATE SET monthly_points = EXCLUDED.monthly_points`,
      [u.id, u.tgId, u.username, u.name, u.role, u.mp, u.code]
    );
  }
  console.log("  ✅ 7 пользователей");

  // === Игры ===
  const now = new Date("2026-05-10T00:00:00Z");
  const tomorrow  = new Date("2026-05-11T00:00:00Z");
  const dayAfter  = new Date("2026-05-12T00:00:00Z");
  const nextWeek  = new Date("2026-05-17T00:00:00Z");
  const yesterday = new Date("2026-05-09T00:00:00Z");

  const games = [
    { id: "ui-test-game-full",     date: tomorrow,  time: "19:00", type: "MAIN", limit: 6, count: 6, status: "FULL",     price: 70000 },
    { id: "ui-test-game-low",      date: dayAfter,  time: "19:00", type: "BASE", limit: 6, count: 4, status: "OPEN",     price: 50000 },
    { id: "ui-test-game-normal",   date: nextWeek,  time: "19:00", type: "BASE", limit: 6, count: 1, status: "OPEN",     price: 50000 },
    { id: "ui-test-game-finished", date: yesterday, time: "19:00", type: "BASE", limit: 6, count: 6, status: "FINISHED", price: 50000 },
  ];

  for (const g of games) {
    await db.query(
      `INSERT INTO games (id, date, time, type, price, players_limit, players_count, status, created_by_id)
       VALUES ($1, $2, $3, $4::\"GameType\", $5, $6, $7, $8::\"GameStatus\", $9)
       ON CONFLICT (id) DO NOTHING`,
      [g.id, g.date, g.time, g.type, g.price, g.limit, g.count, g.status, ADMIN_USER_ID]
    );
  }
  console.log("  ✅ 4 игры");

  // === Участники полной игры (6/6 с топ-игроком) ===
  const fullParticipants = [
    "ui-test-top-001",
    "ui-test-user-002", "ui-test-user-003",
    "ui-test-user-004", "ui-test-user-005", "ui-test-user-006",
  ];
  for (const uid of fullParticipants) {
    await db.query(
      `INSERT INTO game_participants (id, game_id, user_id, payment_method, confirmed)
       VALUES (gen_random_uuid()::text, 'ui-test-game-full', $1, 'YUKASSA', true)
       ON CONFLICT DO NOTHING`,
      [uid]
    );
  }

  // === Участники игры с малым количеством мест (4/6) ===
  const lowParticipants = ["ui-test-user-002", "ui-test-user-003", "ui-test-user-004", "ui-test-user-005"];
  for (const uid of lowParticipants) {
    await db.query(
      `INSERT INTO game_participants (id, game_id, user_id, payment_method, confirmed)
       VALUES (gen_random_uuid()::text, 'ui-test-game-low', $1, 'YUKASSA', true)
       ON CONFLICT DO NOTHING`,
      [uid]
    );
  }

  // === CASH-запись не подтверждённая — тест-юзер в low-seats игре ===
  await db.query(
    `INSERT INTO game_participants (id, game_id, user_id, payment_method, confirmed)
     VALUES ('ui-test-part-cash', 'ui-test-game-low', 'ui-test-user-001', 'CASH', false)
     ON CONFLICT (id) DO NOTHING`
  );

  // === Участник обычной игры (1/6) ===
  await db.query(
    `INSERT INTO game_participants (id, game_id, user_id, payment_method, confirmed)
     VALUES (gen_random_uuid()::text, 'ui-test-game-normal', 'ui-test-user-002', 'YUKASSA', true)
     ON CONFLICT DO NOTHING`
  );
  console.log("  ✅ Участники игр");

  // === Платежи (2 первичных + 1 повторный = paidCount=3, firstPaidCount=2) ===
  await db.query(
    `INSERT INTO payments (id, user_id, game_id, amount, status)
     VALUES
       ('ui-test-pay-001', 'ui-test-user-002', 'ui-test-game-full', 70000, 'SUCCESS'),
       ('ui-test-pay-002', 'ui-test-user-003', 'ui-test-game-full', 70000, 'SUCCESS'),
       ('ui-test-pay-003', 'ui-test-user-002', 'ui-test-game-low',  50000, 'SUCCESS')
     ON CONFLICT (id) DO NOTHING`
  );
  console.log("  ✅ 3 платежа (2 первичных, 1 повторный)");

  console.log("🎉 Seed завершён");
}

main().catch((e) => { console.error(e); process.exit(1); });

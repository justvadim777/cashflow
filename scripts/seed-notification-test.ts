/**
 * Засевает прод тестовыми играми для проверки уведомлений.
 * Создаёт игры точно в окнах +2ч, +24ч, +48ч от запуска.
 * ЗАПУСКАТЬ НА СЕРВЕРЕ через: doppler run -- npx tsx scripts/seed-notification-test.ts
 * Очистка: добавить --cleanup
 */
import "dotenv/config";
import { Client } from "pg";
import crypto from "crypto";

const DB_URL = process.env.DATABASE_URL!;
const CLEANUP = process.argv.includes("--cleanup");

// UTC time helpers — сервер UTC
function plusUTC(hours: number): { date: string; time: string } {
  const d = new Date(Date.now() + hours * 3600 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const dateStr = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString();
  return { date: dateStr, time: `${hh}:${mm}` };
}

async function main() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  if (CLEANUP) {
    console.log("🧹 Очистка тестовых данных уведомлений...");
    await db.query(`DELETE FROM notification_logs WHERE game_id LIKE 'notif-test-%' OR game_id = '0'`);
    await db.query(`DELETE FROM game_participants WHERE game_id LIKE 'notif-test-%'`);
    await db.query(`DELETE FROM game_results WHERE game_id = 'notif-test-recent-result'`);
    await db.query(`DELETE FROM games WHERE id LIKE 'notif-test-%'`);
    // Удалить тест-юзера синхронизации username
    await db.query(`DELETE FROM users WHERE telegram_id = 999000123`);
    console.log("✅ Готово");
    await db.end();
    return;
  }

  // Найти ADMIN юзера (Вадим)
  const adminTgIds = process.env.ADMIN_TELEGRAM_IDS?.split(",").map((s) => s.trim()) ?? [];
  if (!adminTgIds.length) {
    throw new Error("ADMIN_TELEGRAM_IDS is not set");
  }
  const adminTgId = BigInt(adminTgIds[0]);

  const { rows: adminRows } = await db.query<{ id: string }>(
    `SELECT id FROM users WHERE telegram_id = $1`,
    [adminTgId]
  );
  if (!adminRows.length) {
    throw new Error(`Admin user with telegramId ${adminTgId} not found in DB. Run the app first.`);
  }
  const adminId = adminRows[0].id;
  console.log(`✓ Admin: id=${adminId}, telegramId=${adminTgId}`);

  // Очистить предыдущие тест-данные
  await db.query(`DELETE FROM notification_logs WHERE game_id LIKE 'notif-test-%'`);
  await db.query(`DELETE FROM game_participants WHERE game_id LIKE 'notif-test-%'`);
  await db.query(`DELETE FROM games WHERE id LIKE 'notif-test-%'`);

  // Создать 3 игры — точно в окнах cron (±15 мин)
  const windows = [
    { hours: 2,  label: "PRE_2H",  participant: true  },
    { hours: 24, label: "PRE_24H", participant: true  },
    { hours: 48, label: "PRE_48H", participant: false },
  ] as const;

  for (const { hours, label, participant } of windows) {
    const { date, time } = plusUTC(hours);
    const id = `notif-test-${label}`;

    await db.query(
      `INSERT INTO games (id, date, time, type, price, players_limit, players_count, status, created_by_id)
       VALUES ($1, $2, $3, 'BASE'::"GameType", 70000, 6, $4, 'OPEN'::"GameStatus", $5)
       ON CONFLICT (id) DO UPDATE SET date=$2, time=$3, status='OPEN'::"GameStatus"`,
      [id, date, time, participant ? 1 : 0, adminId]
    );
    console.log(`  ✓ Game ${id}: ${date.slice(0, 10)} ${time} (${hours}h from now UTC)`);

    if (participant) {
      const partId = `notif-test-part-${label}`;
      await db.query(
        `INSERT INTO game_participants (id, game_id, user_id, payment_method, confirmed)
         VALUES ($1, $2, $3, 'CASH', true)
         ON CONFLICT (id) DO NOTHING`,
        [partId, id, adminId]
      );
      console.log(`  ✓ Admin registered as confirmed participant`);
    }
  }

  // Обеспечить активность юзера за 30 дней (нужно для PRE_48H — "active player")
  // Берём любую FINISHED игру или создаём заглушку
  const { rows: finishedGames } = await db.query<{ id: string }>(
    `SELECT id FROM games WHERE status = 'FINISHED'::"GameStatus" LIMIT 1`
  );

  let recentGameId: string;
  if (finishedGames.length) {
    recentGameId = finishedGames[0].id;
  } else {
    recentGameId = "notif-test-recent-result";
    const recentDate = new Date(Date.now() - 5 * 86400 * 1000).toISOString();
    await db.query(
      `INSERT INTO games (id, date, time, type, price, players_limit, players_count, status, created_by_id)
       VALUES ($1, $2, '19:00', 'BASE'::"GameType", 70000, 6, 1, 'FINISHED'::"GameStatus", $3)
       ON CONFLICT (id) DO NOTHING`,
      [recentGameId, recentDate, adminId]
    );
  }

  // Уберём старый game_result если был
  await db.query(
    `DELETE FROM game_results WHERE game_id = $1 AND user_id = $2`,
    [recentGameId, adminId]
  );
  const grId = crypto.randomBytes(6).toString("hex");
  await db.query(
    `INSERT INTO game_results (id, game_id, user_id, total_points) VALUES ($1, $2, $3, 50)
     ON CONFLICT DO NOTHING`,
    [grId, recentGameId, adminId]
  );
  console.log(`  ✓ GameResult создан (активность за 30 дней)`);

  // Убрать старые INACTIVE_30D дедупликационные записи для чистого теста
  await db.query(
    `DELETE FROM notification_logs WHERE user_id = $1 AND type = 'INACTIVE_30D'`,
    [adminId]
  );

  console.log("\n🎉 Seed завершён. Теперь запускай cron!");
  console.log(`   Игры попадут в окна: PRE_2H=${plusUTC(2).time}, PRE_24H=${plusUTC(24).time}, PRE_48H=${plusUTC(48).time} (UTC)`);

  await db.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

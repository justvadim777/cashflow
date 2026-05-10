/**
 * Одноразовый скрипт обновления устаревших username/displayName/avatar.
 * Берёт всех юзеров с активностью за последние 7 дней → дёргает Bot API.
 * Запуск: DATABASE_URL="..." TELEGRAM_BOT_TOKEN="..." npx tsx scripts/refresh-usernames.ts
 *
 * НЕ ЗАПУСКАТЬ В ПРОДАКШНЕ без ревью — Bot API имеет rate limits.
 */
import { Client } from "pg";

const DB_URL = process.env.DATABASE_URL!;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

interface TgChatResult {
  ok: boolean;
  result?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo?: { small_file_id: string };
  };
}

async function getChat(tgId: bigint): Promise<TgChatResult> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: tgId.toString() }),
  });
  return res.json() as Promise<TgChatResult>;
}

async function main() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  const { rows } = await db.query<{ id: string; telegram_id: bigint; username: string | null; display_name: string }>(
    `SELECT id, telegram_id, username, display_name FROM users
     WHERE created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC`
  );

  console.log(`Found ${rows.length} recently active users`);

  let updated = 0;
  for (const row of rows) {
    const chat = await getChat(row.telegram_id);
    if (!chat.ok || !chat.result) continue;

    const freshUsername = chat.result.username ?? null;
    const freshDisplayName =
      [chat.result.first_name, chat.result.last_name].filter(Boolean).join(" ") || row.display_name;

    if (row.username !== freshUsername || row.display_name !== freshDisplayName) {
      await db.query(
        `UPDATE users SET username = $1, display_name = $2 WHERE id = $3`,
        [freshUsername, freshDisplayName, row.id]
      );
      console.log(`  Updated ${row.id}: "${row.username}" → "${freshUsername}", "${row.display_name}" → "${freshDisplayName}"`);
      updated++;
    }

    // Уважаем rate limits Telegram Bot API
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`Done. Updated ${updated}/${rows.length} users.`);
  await db.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

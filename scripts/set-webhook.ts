/**
 * Регистрация webhook в Telegram.
 * Использование: npx tsx scripts/set-webhook.ts https://your-domain.com
 */
import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_BOT_SECRET;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

const domain = process.argv[2];
if (!domain) {
  console.error("Usage: npx tsx scripts/set-webhook.ts https://your-domain.com");
  process.exit(1);
}

const webhookUrl = `${domain}/api/bot`;

async function setWebhook() {
  const params: Record<string, string> = { url: webhookUrl };
  if (secret) {
    params.secret_token = secret;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );

  const data = await res.json();
  console.log("setWebhook response:", JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log(`\nWebhook установлен: ${webhookUrl}`);
  } else {
    console.error("\nОшибка установки webhook");
    process.exit(1);
  }

  // Установить команды меню
  const cmdRes = await fetch(
    `https://api.telegram.org/bot${token}/setMyCommands`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Начать" },
          { command: "games", description: "Ближайшие игры" },
          { command: "profile", description: "Мой профиль" },
          { command: "leaderboard", description: "Рейтинг игроков" },
          { command: "referral", description: "Реферальная программа" },
          { command: "info", description: "О проекте" },
          { command: "help", description: "Помощь" },
        ],
      }),
    }
  );

  const cmdData = await cmdRes.json();
  console.log("setMyCommands:", cmdData.ok ? "OK" : "FAILED");
}

setWebhook();

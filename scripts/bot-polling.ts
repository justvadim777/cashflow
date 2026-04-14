/**
 * Запуск бота в polling-режиме для локальной разработки.
 * Использование: npx tsx scripts/bot-polling.ts
 */
import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set in .env");
  process.exit(1);
}

const appUrl = process.env.NEXT_PUBLIC_TG_APP_URL || "";

const bot = new Bot(token);

// /start и /start ref_CODE
bot.command("start", async (ctx) => {
  const startParam = ctx.match;
  const name = ctx.from?.first_name || "Игрок";

  let text = `Привет, <b>${name}</b>! 👋\n\n`;
  text += `Добро пожаловать в <b>Cashflow</b> — систему записи и рейтинга игр «Денежный поток» в Остров Lounge.\n\n`;
  text += `🎲 Записывайся на игры\n`;
  text += `🏆 Следи за рейтингом\n`;
  text += `⭐ Получай баллы и достижения\n`;
  text += `🤝 Приглашай друзей и зарабатывай\n\n`;

  if (startParam?.startsWith("ref_")) {
    text += `✅ Реферальный код принят!\n\n`;
  }

  if (appUrl) {
    const keyboard = new InlineKeyboard().webApp("Открыть Cashflow", appUrl);
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  } else {
    text += `⚠️ Mini App URL не настроен (NEXT_PUBLIC_TG_APP_URL)`;
    await ctx.reply(text, { parse_mode: "HTML" });
  }
});

// /help
bot.command("help", async (ctx) => {
  const text =
    `<b>Команды бота:</b>\n\n` +
    `/start — Начать работу с ботом\n` +
    `/games — Ближайшие игры\n` +
    `/profile — Мой профиль\n` +
    `/leaderboard — Рейтинг игроков\n` +
    `/referral — Реферальная программа\n` +
    `/info — О проекте\n` +
    `/help — Список команд`;

  await ctx.reply(text, { parse_mode: "HTML" });
});

// /games
bot.command("games", async (ctx) => {
  if (appUrl) {
    const keyboard = new InlineKeyboard().webApp("Смотреть игры", `${appUrl}/games`);
    await ctx.reply("🎲 <b>Ближайшие игры Cashflow</b>\n\nЗаписывайся на ближайшую игру!", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply("🎲 Игры доступны в Mini App (настройте NEXT_PUBLIC_TG_APP_URL)");
  }
});

// /profile
bot.command("profile", async (ctx) => {
  if (appUrl) {
    const keyboard = new InlineKeyboard().webApp("Мой профиль", `${appUrl}/profile`);
    await ctx.reply("👤 <b>Твой профиль</b>\n\nБаллы, достижения и уровень.", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply("👤 Профиль доступен в Mini App");
  }
});

// /leaderboard
bot.command("leaderboard", async (ctx) => {
  if (appUrl) {
    const keyboard = new InlineKeyboard().webApp("Рейтинг", `${appUrl}/leaderboard`);
    await ctx.reply("🏆 <b>Рейтинг игроков</b>\n\nУзнай свою позицию!", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply("🏆 Рейтинг доступен в Mini App");
  }
});

// /referral
bot.command("referral", async (ctx) => {
  if (appUrl) {
    const keyboard = new InlineKeyboard().webApp("Рефералы", `${appUrl}/referral`);
    await ctx.reply("🤝 <b>Реферальная программа</b>\n\n15% с каждой оплаты друга!", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply("🤝 Реферальная программа доступна в Mini App");
  }
});

// /info
bot.command("info", async (ctx) => {
  if (appUrl) {
    const keyboard = new InlineKeyboard().webApp("Подробнее", `${appUrl}/info`);
    await ctx.reply("ℹ️ <b>О Cashflow</b>\n\nНастольная бизнес-игра Кийосаки в Остров Lounge!", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply("ℹ️ Информация доступна в Mini App");
  }
});

// Любое текстовое сообщение
bot.on("message:text", async (ctx) => {
  if (appUrl) {
    const keyboard = new InlineKeyboard().webApp("Открыть Cashflow", appUrl);
    await ctx.reply("Используй команды из меню или открой приложение 👇", {
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply("Используй /help для списка команд");
  }
});

// Удалить старый webhook перед polling
async function start() {
  console.log("Удаляю webhook...");
  await bot.api.deleteWebhook();

  // Установить команды меню
  await bot.api.setMyCommands([
    { command: "start", description: "Начать" },
    { command: "games", description: "Ближайшие игры" },
    { command: "profile", description: "Мой профиль" },
    { command: "leaderboard", description: "Рейтинг игроков" },
    { command: "referral", description: "Реферальная программа" },
    { command: "info", description: "О проекте" },
    { command: "help", description: "Помощь" },
  ]);
  console.log("Команды меню установлены.");

  console.log("Бот запущен в polling-режиме. Ctrl+C для остановки.");
  bot.start();
}

start().catch((err) => {
  console.error("Ошибка запуска бота:", err);
  process.exit(1);
});

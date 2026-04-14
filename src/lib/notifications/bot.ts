import { Bot, InlineKeyboard } from "grammy";

let bot: Bot | null = null;

export function getBot(): Bot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
    bot = new Bot(token);
    registerHandlers(bot);
  }
  return bot;
}

function registerHandlers(bot: Bot) {
  const appUrl = process.env.NEXT_PUBLIC_TG_APP_URL || "https://t.me/your_bot/app";

  // /start и /start ref_CODE
  bot.command("start", async (ctx) => {
    const startParam = ctx.match; // ref_XXXXXXXX
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

    const keyboard = new InlineKeyboard()
      .webApp("Открыть Cashflow", appUrl);

    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
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
    const keyboard = new InlineKeyboard()
      .webApp("Смотреть игры", `${appUrl}/games`);

    await ctx.reply(
      "🎲 <b>Ближайшие игры Cashflow</b>\n\nЗаписывайся на ближайшую игру и приходи в Остров Lounge!",
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  });

  // /profile
  bot.command("profile", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .webApp("Мой профиль", `${appUrl}/profile`);

    await ctx.reply(
      "👤 <b>Твой профиль</b>\n\nСмотри свои баллы, достижения и уровень.",
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  });

  // /leaderboard
  bot.command("leaderboard", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .webApp("Рейтинг", `${appUrl}/leaderboard`);

    await ctx.reply(
      "🏆 <b>Рейтинг игроков</b>\n\nУзнай свою позицию среди всех участников!",
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  });

  // /referral
  bot.command("referral", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .webApp("Реферальная программа", `${appUrl}/referral`);

    await ctx.reply(
      "🤝 <b>Реферальная программа</b>\n\nПриглашай друзей и получай 15% с каждой их оплаты!",
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  });

  // /info
  bot.command("info", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .webApp("Подробнее", `${appUrl}/info`);

    await ctx.reply(
      "ℹ️ <b>О Cashflow</b>\n\nНастольная бизнес-игра по мотивам книги Роберта Кийосаки. Учись инвестировать и строить пассивный доход в реальной игре!",
      { parse_mode: "HTML", reply_markup: keyboard }
    );
  });

  // Любое текстовое сообщение
  bot.on("message:text", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .webApp("Открыть Cashflow", appUrl);

    await ctx.reply(
      "Используй команды из меню или открой приложение 👇",
      { reply_markup: keyboard }
    );
  });
}

export async function sendNotification(
  telegramId: bigint | number,
  text: string
): Promise<void> {
  try {
    await getBot().api.sendMessage(Number(telegramId), text, {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error(`Failed to send notification to ${telegramId}:`, error);
  }
}

export async function sendNotificationWithButton(
  telegramId: bigint | number,
  text: string,
  buttonText: string,
  buttonUrl: string
): Promise<void> {
  try {
    await getBot().api.sendMessage(Number(telegramId), text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: buttonText, url: buttonUrl }]],
      },
    });
  } catch (error) {
    console.error(`Failed to send notification to ${telegramId}:`, error);
  }
}

export const NOTIFICATION_TEMPLATES = {
  REGISTRATION: () =>
    `Ты зарегистрирован в Cashflow. Запишись на ближайшую игру и получи свой первый опыт в настольной бизнес-игре!`,

  PAYMENT_SUCCESS: (date: string) =>
    `Оплата прошла. Ты в списке игроков на игру ${date}. Ждём в Остров Lounge`,

  REMINDER_48H_NOT_REGISTERED: () =>
    `Через 2 дня игра Cashflow. Остались места — успей записаться`,

  REMINDER_24H: (time: string) =>
    `Напоминаем: у тебя игра Cashflow завтра в ${time}`,

  REMINDER_2H: () =>
    `Игра начинается через 2 часа. Ждём в Остров Lounge`,

  GAME_RESULT: (points: number, rank: number, level: string) =>
    `Твой результат: <b>${points}</b> баллов\nТвоё место в топе: <b>#${rank}</b>\nТвой уровень: <b>${level}</b>`,

  LEVEL_UP: (level: string) =>
    `🎉 Поздравляем с переходом на уровень <b>${level}</b>!`,

  UPSELL_MAIN: () =>
    `Ты прошёл базовый уровень. Готов сыграть в основной лиге с более сильными игроками?`,

  REFERRAL_EARNED: (amount: string) =>
    `Тебе начислено ${amount} по реферальной системе`,

  COUPON_CREATED: (amount: string) =>
    `Твой купон на ${amount} готов. Покажи его в Остров Lounge`,

  WITHDRAWAL_CREATED: () =>
    `Заявка на вывод принята`,

  WITHDRAWAL_DONE: () =>
    `Заявка на вывод выполнена`,

  INACTIVE_30_DAYS: () =>
    `Ты давно не играл в Cashflow. Самое время вернуться`,
} as const;

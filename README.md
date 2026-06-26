# Cashflow — Telegram Mini App

Система записи, оплаты и рейтинга игр «Денежный поток» для заведения «Остров Lounge».

**Стек:** Next.js 16 App Router · TypeScript strict · Prisma 7 · PostgreSQL · grammy · ЮКасса · Tailwind CSS v4 · Zustand

---

## Быстрый старт (локально)

### Требования
- Node.js 20+
- PostgreSQL 16+
- Doppler CLI (для env vars) или `.env` файл

### Установка

```bash
git clone <repo>
cd cashflow
npm install
```

### Настройка окружения

Скопируй `.env.example` в `.env` и заполни переменные:

```bash
cp .env.example .env
```

Ключевые переменные:
- `DATABASE_URL` — подключение к PostgreSQL
- `TELEGRAM_BOT_TOKEN` — токен бота из @BotFather
- `TELEGRAM_BOT_SECRET` — секрет для webhook (любая строка)
- `NEXTAUTH_SECRET` — секрет сессий (генерировать: `openssl rand -hex 32`)
- `ADMIN_TELEGRAM_IDS` — telegram_id администраторов через запятую

### Миграции и запуск

```bash
npx prisma migrate dev    # применить миграции
npx prisma generate       # сгенерировать клиент
npm run dev               # запустить dev-сервер (с doppler)
# или без doppler:
npx next dev
```

### Локальный бот (polling)

```bash
npm run bot
```

---

## Деплой на VPS (Ubuntu 22/24)

### 1. Первоначальная настройка

```bash
bash deploy/setup.sh your-domain.com
```

Скрипт установит: Node.js 20, PostgreSQL, Nginx + SSL (certbot), создаст systemd-сервис `cashflow.service`, настроит crontab.

### 2. Заполни `.env.production`

```bash
nano /opt/cashflow/.env.production
```

### 3. Деплой обновлений

```bash
bash /opt/cashflow/deploy/deploy.sh
```

Скрипт выполнит: `npm ci` → `prisma generate` → `prisma migrate deploy` → `next build` → restart сервиса → set webhook.

---

## Команды бота

| Команда | Описание |
|---------|---------|
| `/start` | Начать работу |
| `/games` | Ближайшие игры |
| `/profile` | Мой профиль |
| `/leaderboard` | Рейтинг |
| `/referral` | Реферальная программа |
| `/info` | О проекте |
| `/help` | Список команд |

---

## Роли

| Роль | Доступ |
|------|--------|
| PLAYER | Dashboard, игры, профиль, рейтинг, рефералка |
| HOST | + Создание игр, ввод результатов (только своих игр) |
| ADMIN | Полный доступ + управление юзерами, подтверждение CASH-записей |
| OWNER | Финансы + аналитика (read-only) |

Роли задаются в `.env`:
```
ADMIN_TELEGRAM_IDS=123456,789012
OWNER_TELEGRAM_IDS=111111
HOST_TELEGRAM_IDS=222222,333333
```

---

## API роуты

### Публичные (с Telegram auth)
- `POST /api/auth` — авторизация через initData
- `GET /api/games` — список игр
- `GET /api/games/[id]` — детали игры
- `POST /api/games/[id]/register` — запись (CASH)
- `DELETE /api/games/[id]/register` — отмена записи
- `POST /api/games/[id]/refund` — заявка на возврат
- `POST /api/games/[id]/waitlist` — встать в очередь
- `DELETE /api/games/[id]/waitlist` — выйти из очереди
- `POST /api/payments` — создать платёж ЮКасса
- `GET /api/leaderboard` — рейтинг
- `GET /api/referral` — данные рефералки
- `POST /api/referral/withdraw` — заявка на вывод

### Для HOST/ADMIN
- `POST /api/games` — создать игру
- `PATCH /api/games/[id]` — обновить игру
- `POST /api/results` — сохранить результат
- `PATCH /api/games/[id]/confirm` — подтвердить/отклонить CASH-запись

### Для ADMIN/OWNER
- `GET /api/analytics` — аналитика
- `GET /api/admin/refunds/all` — список возвратов
- `PATCH /api/admin/refunds/[id]` — обновить статус возврата
- `GET /api/admin/cash-participants` — CASH-записи

### Cron (Bearer NEXTAUTH_SECRET)
- `POST /api/cron/notify-upcoming` — напоминания 48ч/24ч/2ч
- `POST /api/cron/cleanup-pending` — очистка PENDING >30мин
- `POST /api/cron/finish-games` — завершение прошедших игр
- `POST /api/cron/expire-waitlist` — истечение очереди

### Webhooks
- `POST /api/payments/webhook` — ЮКасса (IP whitelist + опциональная подпись)
- `POST /api/bot` — Telegram Bot webhook

---

## Тесты

```bash
npm test              # vitest run
npm run test -- --ui  # UI интерфейс
```

---

## Восстановление БД

Смотри [deploy/RESTORE.md](deploy/RESTORE.md).

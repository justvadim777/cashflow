# CLAUDE.md — Cashflow Telegram Web App

## Обзор проекта
Telegram Mini App для «Остров Lounge» — система записи, оплаты и рейтинга
живых настольных игр «Денежный поток» (Кийосаки).

**Не путать** с проектом Cashflow 101 (цифровая игра) — это отдельный продукт.

---

## Стек
- **Frontend:** React + TypeScript + Vite (или Next.js 15 App Router)
- **UI:** Tailwind CSS + Telegram UI Kit (@tma.js/sdk)
- **State:** Zustand
- **Backend:** Next.js API Routes (или Fastify)
- **DB:** PostgreSQL + Prisma
- **Auth:** Telegram WebApp.initData (валидация HMAC на сервере)
- **Payments:** ЮКасса (основная) / Telegram Payments
- **Notifications:** Telegram Bot API (telegraf или grammy)
- **Animations:** Framer Motion

---

## Роли

| Роль | Доступ |
|------|--------|
| Player | dashboard, игры, профиль, топ, рефералка, инфо |
| Ведущий | + создание/редактирование игр, ввод результатов |
| Admin | полный доступ + управление юзерами и финансами |
| Owner | только финансы + аналитика (read-only) |

---

## Архитектура

```
/app
  /api
    /auth             # Telegram initData validation
    /games            # CRUD игр
    /payments         # Webhook ЮКасса
    /results          # Ввод результатов
    /referral         # Реферальная логика
    /analytics        # Дашборд владельца
    /notifications    # Telegram Bot отправка
  /(twa)              # Mini App страницы
    /dashboard
    /games
    /profile
    /leaderboard
    /referral
    /info
    /admin            # Роли: admin, owner, ведущий
/components
  /game
  /leaderboard
  /referral
  /admin
  /ui
/lib
  /telegram           # initData валидация, bot API
  /payments           # ЮКасса интеграция
  /points             # Логика начисления баллов
  /notifications      # Шаблоны уведомлений
/prisma
  schema.prisma
/store
/types
```

---

## Prisma схема (ключевые модели)

### Enums
```prisma
enum UserRole       { PLAYER HOST ADMIN OWNER }
enum GameType       { BASE MAIN }
enum GameStatus     { OPEN FULL FINISHED }
enum PaymentStatus  { PENDING SUCCESS FAILED }
enum WithdrawalStatus { CREATED PROCESSING DONE }
enum AchievementType {
  FIRST_GAME FIRST_EXIT FIRST_DREAM
  THREE_IN_ROW FIVE_TOTAL FIRST_REFERRAL
}
```

### User
```
id, telegram_id (unique), username, display_name
avatar_url, role (UserRole)
total_points, monthly_points
level (NEWBIE / PLAYER / INVESTOR / CAPITALIST)
referral_code (unique), referred_by_id
referral_balance (копейки), created_at
```

### Game
```
id, date, time, type (GameType)
price (копейки: 70000 = 700₽), players_limit, players_count
status (GameStatus)
description (optional), created_by_id, created_at
```

### GameParticipant
```
id, game_id, user_id, payment_id, joined_at
```

### Payment
```
id, user_id, game_id
amount (копейки), status (PaymentStatus)
provider_payment_id, created_at
```

### GameResult
```
id, game_id, user_id

# Навыки (1-10)
skill_finance, skill_strategy, skill_opportunity
skill_decision, skill_focus, skill_communication
skill_leadership, skill_adaptation, skill_learning, skill_engagement

# Игровые баллы
points_exit_rat_race   # выход из бегов +10
points_liabilities     # пассивы закрыты +5
points_dream           # мечта куплена +10
points_best_income     # лучший доход +10
points_income_growth   # рост дохода +5/50k

# Дополнительные баллы
points_secret          # +5
points_order           # заказ в заведении +10
points_subscription    # +5
points_video_review    # +5
points_stories         # +5

total_points
```

### Referral
```
id, referrer_id, referred_id
game_id, amount (копейки, 15%), status, created_at
```

### WithdrawalRequest
```
id, user_id, amount (копейки)
status (WithdrawalStatus), created_at
```

### Achievement
```
id, user_id, type (AchievementType), earned_at
```

---

## Уровни игроков

| Уровень | Баллы |
|---------|-------|
| Новичок | 0–150 |
| Игрок | 151–500 |
| Инвестор | 501–2000 |
| Капиталист | 2001+ |

---

## Логика начисления баллов

### Навыки (ведущий ставит 1-10, влияют на рейтинг напрямую)
10 навыков: финансовая грамотность, стратегия, поиск возможностей,
принятие решений, концентрация, коммуникация, лидерство, адаптация,
обучение, вовлечённость.

Итог:
```
total = sum(all_skills) + game_points + extra_points
```

### Игровые баллы
- Выход из крысиных бегов → +10
- Пассивы закрыты → +5
- Мечта куплена → +10
- Лучший доход в игре → +10
- Рост дохода → +5 каждые 50k

### Дополнительные баллы
- Секретный балл → +5
- Заказ в заведении → +10
- Подписка → +5
- Видео-отзыв → +5
- Сторис → +5

---

## Реферальная система
- У каждого уникальная ссылка: `t.me/BOT_NAME?start=ref_CODE`
- 15% с каждой успешной оплаты реферала → начисляется на referral_balance
- Баланс можно:
  - **Вывести** — заявка → статусы: CREATED → PROCESSING → DONE
  - **Купон** — генерация кода, показать в заведении

---

## Уведомления (Telegram Bot)

| Триггер | Текст |
|---------|-------|
| Регистрация | «Ты зарегистрирован в Cashflow. Запишись на ближайшую игру...» |
| Оплата прошла | «Оплата прошла. Ты в списке игроков на игру [дата]. Ждём в Остров Lounge» |
| За 48ч (не записан) | «Через 2 дня игра Cashflow. Остались места — успей записаться» |
| За 24ч (записан) | «Напоминаем: у тебя игра Cashflow завтра в [время]» |
| За 2ч (записан) | «Игра начинается через 2 часа. Ждём в Остров Lounge» |
| После игры | «Твой результат: [X] баллов. Рейтинг: [Y]. Место в топе: [Z]» |
| Новый уровень | «Поздравляем с переходом на уровень [level]!» |
| После BASE (апселл) | «Готов сыграть в основной лиге? → Записаться в MAIN» |
| Реферал оплатил | «Тебе начислено [X ₽] по реферальной системе» |
| Купон создан | «Твой купон на [X ₽] готов. Покажи его в Остров Lounge» |
| Вывод создан | «Заявка на вывод принята» |
| Вывод выполнен | «Заявка на вывод выполнена» |
| 30 дней без игры | «Ты давно не играл в Cashflow. Самое время вернуться» |

---

## UX-флоу

### Онбординг
1. Открытие Mini App → получить telegram_id, username, имя
2. Если нет в базе → создать юзера → предложить никнейм (или подтянуть из TG)
3. Показать Dashboard

### Запись на игру
1. Dashboard → «Игры»
2. Выбор типа: BASE / MAIN
3. Фильтр: Активные / Завершённые
4. Список карточек: дата, время, тип, места, триггеры
5. Триггер «Осталось мало мест» — если свободных < 50%
6. Триггер «Топ игроки участвуют» — если в игре есть игрок из ТОП-5 месяца
7. Клик по игре → список участников (аватары + никнеймы) + кнопка оплаты
8. Оплата → webhook → GameParticipant + уведомление

### Ввод результатов (ведущий)
1. Выбрать игру
2. Выбрать игрока
3. Ввести: навыки (1-10) + игровые баллы + дополнительные + выручка кальянки
4. Система считает итог автоматически
5. Сохранить → обновить total_points / monthly_points / level → уведомление игроку

---

## Дизайн

### Референс
Предоставлен скриншот: два экрана — Leaderboard + Profile с Achievements.

### Цвета
```
Background:        #1A0A2E  (тёмно-фиолетовый)
Card background:   #1E1035  (чуть светлее фона)
Accent primary:    #A855F7  (фиолетовый)
Accent gradient:   #7B2FBE → #A855F7
Gold:              #F59E0B  (монеты, корона, топ)
Text primary:      #FFFFFF
Text secondary:    #9CA3AF
Positive delta:    #34D399  (зелёный — рост позиции)
Negative delta:    #F87171  (красный — падение)
Border/divider:    rgba(255,255,255,0.06)
```

### Tailwind config (кастомные токены)
```js
theme: {
  extend: {
    colors: {
      bg:      '#1A0A2E',
      card:    '#1E1035',
      accent:  '#A855F7',
      gold:    '#F59E0B',
      success: '#34D399',
      danger:  '#F87171',
    }
  }
}
```

### Leaderboard экран
- Переключатель периодов: All time / Last week / Last month (табы)
- Pill «my current position» с фиолетовым фоном — позиция текущего юзера
- **Подиум топ-3:**
  - 2-е место слева, 1-е по центру (выше + корона 👑), 3-е справа
  - Аватары в кружках с обводкой (золото / серебро / бронза)
  - Бейдж с номером позиции на аватаре
  - Зелёный тег с дельтой изменения позиции (+1, +4)
  - Под аватаром: никнейм + баллы
- **Список (4+ место):**
  - Строки: номер | аватар | никнейм + баллы | иконки достижений
  - Маленькая стрелка роста/падения рядом с номером

### Profile экран
- Позиция в рейтинге (слева) + баллы крупно золотом (справа)
- Аватар по центру с кольцом-градиентом
- Никнейм + уровень (с chevron)
- Кнопка «View Leaderboard» — фиолетовая с иконкой щита
- Табы: Achievements / Rewards / Goals / Referral
- **Badges:** иконки в кружках, заблокированные — серые с замком
- **Points earned:** карточки-события (иконка + баллы + описание + дата)

### Общие компоненты
- Карточки: border-radius 16-20px, лёгкий backdrop-blur
- Кнопки: border-radius 12px, фиолетовый градиент
- Аватары: всегда в круглой рамке
- Декор фона: редкие звёздочки/крестики (✦) SVG, opacity 0.3
- Шрифт: Inter (или system-ui), bold для цифр и заголовков
- Bottom navigation: 3 пункта (home / shield(активный) / star)

### Приоритет компонентов
1. `LeaderboardScreen` — подиум топ-3 + список
2. `ProfileScreen` — шапка + табы + Achievements
3. `BottomNav` — 3 пункта
4. `AchievementBadge` — locked / unlocked состояния
5. `PointsEventCard` — карточка начисления баллов

---

## Правила разработки

### Telegram Mini App
- Всегда инициализировать `@tma.js/sdk` первым делом в `main.tsx`
- Проверять `WebApp.initData` HMAC на сервере для каждого API запроса
- Использовать `WebApp.MainButton`, `WebApp.BackButton`, `WebApp.HapticFeedback`
- Back button управлять через роутер, не захардкоживать
- Учитывать safe area insets (bottom padding на iPhone)

### Платежи
- Все суммы в базе в **копейках** (70000 = 700₽)
- Webhook ЮКасса → проверять подпись → обновить Payment → добавить в игру
- Идемпотентность: один платёж = одна запись GameParticipant

### Безопасность
- Роли проверять **на сервере**, не доверять клиенту
- `telegram_id` из initData — единственный источник истины
- Ведущий видит только свои игры

### Код
- TypeScript strict mode (`"strict": true`)
- Никаких `any` — если тип неизвестен, создать интерфейс
- Async/await везде, никаких `.then().catch()`
- Named exports для компонентов, default только для страниц
- Игровая логика (баллы, уровни) — чистые функции в `/lib/points/`

---

## ENV переменные

```
DATABASE_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_SECRET=
YUKASSA_SHOP_ID=
YUKASSA_SECRET_KEY=
NEXTAUTH_SECRET=
NEXT_PUBLIC_TG_APP_URL=
```

---

## Команды

```bash
npm run dev
npm run build
npx prisma migrate dev --name <name>
npx prisma studio
```

---

## Приоритет разработки

1. Prisma схема + начальная миграция
2. Telegram auth middleware (initData HMAC валидация)
3. API: games CRUD
4. API: payments webhook (ЮКасса)
5. Frontend: Dashboard → Games → Profile
6. Leaderboard + логика баллов/уровней
7. Referral system
8. Admin панель (ввод результатов, аналитика)
9. Telegram Bot уведомления (все триггеры)
10. Onboarding + Info блок (5 экранов)

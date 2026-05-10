import { test, expect, Page } from "@playwright/test";
import { forgeInitData } from "../../scripts/lib/forge-init-data";

const PROD = "https://72-56-250-40.sslip.io";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
// Вадим — существующий ADMIN в БД
const ADMIN_TG_ID = 5712505670;

const TEST_USER  = { id: 999000001, first_name: "UI",    last_name: "Test",  username: "ui_test"    };
const ADMIN_USER = { id: ADMIN_TG_ID, first_name: "Vadim", username: "vadim" };

async function openAsTelegramWebApp(page: Page, user: { id: number; first_name: string; last_name?: string; username?: string }, path = "/dashboard") {
  const initData = forgeInitData(BOT_TOKEN, user);

  // Эмулируем window.Telegram.WebApp до загрузки страницы
  await page.addInitScript((data) => {
    (window as unknown as Record<string, unknown>).Telegram = {
      WebApp: {
        initData: data,
        initDataUnsafe: { user: JSON.parse(new URLSearchParams(data).get("user") ?? "{}") },
        ready: () => {},
        expand: () => {},
        MainButton: { setText: () => {}, show: () => {}, hide: () => {}, onClick: () => {} },
        BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
        HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} },
        openTelegramLink: (u: string) => { (window as unknown as Record<string, unknown>).__lastLink = u; },
        platform: "android",
        version: "7.0",
        themeParams: { bg_color: "#1A0A2E" },
        colorScheme: "dark",
      },
    };
  }, initData);

  await page.setExtraHTTPHeaders({ "x-telegram-init-data": initData });

  // URL с hash для retrieveRawInitData() из @tma.js/sdk
  const url = `${PROD}${path}#tgWebAppData=${encodeURIComponent(initData)}&tgWebAppVersion=7.0&tgWebAppPlatform=android`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  // Дополнительное время на React-рендер и auth-запрос
  await page.waitForTimeout(2000);
}

// ─── Пункт 1+2: Плашки на карточке игры ──────────────────────────────────────
test("1+2. Плашка «Осталось мало мест» + «В игре участвуют топовые игроки»", async ({ page }) => {
  await openAsTelegramWebApp(page, TEST_USER, "/games");
  await page.screenshot({ path: "test-screenshots/01-games-list.png", fullPage: true });

  // Плашка «Осталось мало мест» — игра ui-test-game-low (4/6, <50% свободно)
  const lowSeats = page.locator("text=/Осталось мало мест/i").first();
  await expect(lowSeats).toBeVisible({ timeout: 8000 });

  // Плашка «топовые игроки» — игра ui-test-game-full (есть top_player с monthlyPoints=9999)
  const topBadge = page.locator("text=/В игре участвуют топовые игроки/i").first();
  await expect(topBadge).toBeVisible({ timeout: 5000 });

  const box = await lowSeats.boundingBox();
  if (box && box.width > 0 && box.height > 0) {
    await page.screenshot({ path: "test-screenshots/01-low-seats.png", clip: box });
  }
});

// ─── Пункт 3: Cron эндпоинты ─────────────────────────────────────────────────
test("3. Cron notify-upcoming / notify-inactive / finish-games", async ({ request }) => {
  const SECRET = process.env.NEXTAUTH_SECRET!;
  for (const path of ["/api/cron/notify-upcoming", "/api/cron/notify-inactive"]) {
    const r = await request.post(`${PROD}${path}`, { headers: { Authorization: `Bearer ${SECRET}` } });
    expect(r.status(), `${path} должен вернуть 200`).toBe(200);
    const body = await r.json();
    expect(body.ok, `${path} body.ok должен быть true`).toBeTruthy();
  }
  // finish-games возвращает {finished, checked} вместо {ok}
  const r = await request.post(`${PROD}/api/cron/finish-games`, { headers: { Authorization: `Bearer ${SECRET}` } });
  expect(r.status(), "/api/cron/finish-games должен вернуть 200").toBe(200);
  const body = await r.json();
  expect(typeof body.checked === "number" || typeof body.finished === "number" || body.ok !== undefined,
    "finish-games должен вернуть {finished, checked} или {ok}").toBeTruthy();
});

// ─── Пункт 4: Реферальная программа ─────────────────────────────────────────
test("4. Реферальная программа — счётчики рефералов", async ({ page }) => {
  await openAsTelegramWebApp(page, TEST_USER, "/referral");
  await page.screenshot({ path: "test-screenshots/04-referral.png", fullPage: true });

  // Страница реферальной программы должна быть загружена
  const html = await page.content();
  expect(html, "Должны быть поля реферальной статистики").toMatch(/реферал|Всего|Оплатили|Баланс/i);
});

// ─── Пункт 5: Баннер подписки ─────────────────────────────────────────────────
test("5. Баннер подписки на канал при первом входе", async ({ page }) => {
  // Новый пользователь — баннер не закрывался, localStorage пустой
  await openAsTelegramWebApp(page, { id: 999000099, first_name: "New", username: "newuser_test" }, "/dashboard");
  await page.screenshot({ path: "test-screenshots/05-subscribe-banner.png", fullPage: true });

  const banner = page.locator("text=/Подпишись на наш Telegram-канал/i").first();
  await expect(banner).toBeVisible({ timeout: 8000 });

  // Закрыть крестиком и проверить что пропал
  const closeBtn = page.locator('button:has-text("×"), [aria-label*="Закрыть" i]').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(500);
    await expect(banner).not.toBeVisible();
    await page.screenshot({ path: "test-screenshots/05-banner-closed.png", fullPage: true });
  }
});

// ─── Пункт 6: Кнопки каналов ──────────────────────────────────────────────────
test("6. Кнопки «Канал Cashflow» и «Канал Острова» на дашборде", async ({ page }) => {
  await openAsTelegramWebApp(page, TEST_USER, "/dashboard");
  await page.screenshot({ path: "test-screenshots/06-channel-buttons.png", fullPage: true });

  await expect(page.locator("text=/Канал Cashflow/i").first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=/Канал Острова/i").first()).toBeVisible({ timeout: 5000 });
});

// ─── Пункты 7+8: Аналитика ────────────────────────────────────────────────────
test("7+8. Аналитика: Оплаченные / Новые оплаченные / выручка ЮКасса+Наличные", async ({ page }) => {
  await openAsTelegramWebApp(page, ADMIN_USER, "/admin");
  await page.screenshot({ path: "test-screenshots/07-admin-main.png", fullPage: true });

  // Найти раздел аналитики (вкладка или ссылка)
  const analyticsTab = page.locator("text=/Аналитика/i").first();
  if (await analyticsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await analyticsTab.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: "test-screenshots/07-analytics.png", fullPage: true });

  const html = await page.content();
  expect(html, "Должен быть счётчик «Оплаченные»").toMatch(/Оплаченные/i);
  expect(html, "Должен быть счётчик «Новые оплаченные»").toMatch(/Новые оплаченные/i);
  expect(html, "Должны быть поля выручки").toMatch(/ЮКасса|Наличные|Итого/i);
});

// ─── Пункт 8: Поле суммы при CASH-подтверждении ───────────────────────────────
test("8. Поле ввода суммы при подтверждении CASH-записи", async ({ page }) => {
  await openAsTelegramWebApp(page, ADMIN_USER, "/admin");
  await page.screenshot({ path: "test-screenshots/08-admin-enter.png", fullPage: true });

  // Найти раздел заявок
  const zayvkiTab = page.locator("text=/Заявки|Записи|Участники/i").first();
  if (await zayvkiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await zayvkiTab.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: "test-screenshots/08-cash-confirm.png", fullPage: true });

  // Должно быть поле ввода суммы (для CASH-участника)
  const amountInput = page.locator('input[type="number"]').first();
  await expect(amountInput).toBeVisible({ timeout: 8000 });
});

// ─── Пункт 9: Ближайшая игра ──────────────────────────────────────────────────
test("9. Ближайшая игра — корректная дата и время", async ({ page }) => {
  await openAsTelegramWebApp(page, TEST_USER, "/dashboard");
  await page.screenshot({ path: "test-screenshots/09-next-game.png", fullPage: true });

  const html = await page.content();
  // Должно быть время в формате HH:MM
  expect(html, "Должно быть время игры").toMatch(/\d{1,2}:\d{2}/);

  // Не должна показываться прошедшая игра (вчерашняя)
  expect(html, "Не должна быть вчерашняя дата 09.05").not.toMatch(/9 мая|09\.05|ui-test-game-finished/i);
});

import "dotenv/config";

const PROD = "https://72-56-250-40.sslip.io";
const SECRET = process.env.NEXTAUTH_SECRET;

type Check = { name: string; ok: boolean; details: string };
const results: Check[] = [];

async function jsonGet(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers });
  return { status: r.status, body: await r.text() };
}

async function main() {
  // 1+2. /api/games hasTopPlayer field shape
  const games = await jsonGet(`${PROD}/api/games`, { "x-telegram-init-data": "dummy" });
  results.push({
    name: "1+2. /api/games hasTopPlayer field shape",
    ok: games.status === 401 || /hasTopPlayer/.test(games.body),
    details: `status=${games.status}, body has hasTopPlayer: ${/hasTopPlayer/.test(games.body)}`,
  });

  // 3. Cron — три эндпоинта (GET → 405, POST → 200)
  for (const [name, path] of [
    ["notify-upcoming", "/api/cron/notify-upcoming"],
    ["notify-inactive", "/api/cron/notify-inactive"],
    ["finish-games", "/api/cron/finish-games"],
  ] as [string, string][]) {
    // Try POST with secret
    const r = await fetch(`${PROD}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const body = await r.text();
    results.push({
      name: `3. cron ${name}`,
      ok: r.status === 200,
      details: `status=${r.status}, body=${body.slice(0, 200)}`,
    });
  }

  // 4. Реферальная — схема ответа
  const ref = await jsonGet(`${PROD}/api/referral`, { "x-telegram-init-data": "dummy" });
  const hasRef = ["totalCount", "paidCount", "balance", "referrals"].every((k) =>
    ref.body.includes(`"${k}"`)
  );
  results.push({
    name: "4. /api/referral новая схема ответа",
    ok: ref.status === 401 || hasRef,
    details: `status=${ref.status}, has all keys: ${hasRef}`,
  });

  // 5+6. Env переменные на проде
  const { execSync } = await import("child_process");
  try {
    const env = execSync(
      `ssh -o StrictHostKeyChecking=no root@72.56.250.40 "grep -E 'TG_CHANNEL_URL|TG_LOUNGE_URL' /opt/cashflow/.env"`,
      { encoding: "utf8" }
    );
    results.push({
      name: "5+6. NEXT_PUBLIC_TG_*_URL на проде",
      ok: /TG_CHANNEL_URL/.test(env) && /TG_LOUNGE_URL/.test(env),
      details: env.trim(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ name: "5+6. env vars", ok: false, details: msg });
  }

  // 7+8. Аналитика
  const analytics = await jsonGet(`${PROD}/api/analytics`, { "x-telegram-init-data": "dummy" });
  const hasAnalytics = ["paidCount", "firstPaidCount", "yukassaRevenue", "cashRevenue", "periodRevenue"].every(
    (k) => analytics.body.includes(`"${k}"`)
  );
  results.push({
    name: "7+8. /api/analytics с раздельными счётчиками и выручкой",
    ok: analytics.status === 401 || hasAnalytics,
    details: `status=${analytics.status}, has all keys: ${hasAnalytics}`,
  });

  // 8. БД — manual_paid_amount
  try {
    const col = execSync(
      `ssh -o StrictHostKeyChecking=no root@72.56.250.40 "sudo -u postgres psql cashflow -tAc \\"SELECT column_name FROM information_schema.columns WHERE table_name='game_participants' AND column_name='manual_paid_amount'\\"" `,
      { encoding: "utf8" }
    );
    results.push({
      name: "8. Колонка manual_paid_amount в game_participants",
      ok: col.trim() === "manual_paid_amount",
      details: col.trim() || "(empty)",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ name: "8. manual_paid_amount column", ok: false, details: msg });
  }

  // 9. /api/games/next
  const next = await jsonGet(`${PROD}/api/games/next`, { "x-telegram-init-data": "dummy" });
  results.push({
    name: "9. /api/games/next жив",
    ok: next.status === 401 || next.status === 200,
    details: `status=${next.status}`,
  });

  // === Результаты ===
  console.log("\n=== Verify Phase 4 ===\n");
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}\n   ${r.details}\n`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Total: ${results.length}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

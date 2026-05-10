import "dotenv/config";

const PROD = "https://72-56-250-40.sslip.io";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS ?? "").split(",").filter(Boolean);

async function notifyAdmins(text: string) {
  for (const id of ADMIN_IDS) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: id, text, parse_mode: "HTML" }),
    });
  }
}

async function main() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  // HTTP root
  const t0 = Date.now();
  const r = await fetch(`${PROD}/`).catch((e: Error) => ({ status: 0, _err: e.message } as never));
  checks.push({
    name: "HTTP root",
    ok: r.status === 200 || r.status === 307 || r.status === 308,
    detail: `${r.status}, ${Date.now() - t0}ms`,
  });

  // Bot getMe
  const me = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`).then((r) => r.json() as Promise<{ ok: boolean; result: { username: string }; description: string }>);
  checks.push({
    name: "Telegram bot getMe",
    ok: me.ok === true,
    detail: me.ok ? `@${me.result.username}` : me.description,
  });

  // Webhook info — auto-reregister if missing
  const wh = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`).then((r) =>
    r.json() as Promise<{ ok: boolean; result: { url: string; pending_update_count: number; last_error_message?: string } }>
  );
  const webhookOk = wh.ok && wh.result.url?.includes("72-56-250-40");
  if (!webhookOk) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${PROD}/api/bot` }),
    });
  }
  checks.push({
    name: "Telegram webhook",
    ok: webhookOk,
    detail: `${wh.result.url} pending=${wh.result.pending_update_count} last_error=${wh.result.last_error_message ?? "none"}`,
  });

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    const text =
      `🚨 <b>Cashflow alert</b>\n\n` +
      failed.map((c) => `❌ ${c.name}: ${c.detail}`).join("\n") +
      `\n\nВремя: ${new Date().toISOString()}`;
    await notifyAdmins(text);
    console.error(text);
    process.exit(1);
  }

  console.log("✅ All checks passed", checks);
}

main();

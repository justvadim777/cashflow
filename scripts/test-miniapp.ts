import { chromium, Browser, Page } from "playwright";

const URL = "https://72-56-250-40.sslip.io";

async function test() {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Telegram-Android/10.13.3",
    viewport: { width: 360, height: 740 },
  });
  const page: Page = await context.newPage();

  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const allRequests: { url: string; status: number; type: string }[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) => failedRequests.push(`${req.url()}: ${req.failure()?.errorText}`));
  page.on("response", (res) =>
    allRequests.push({ url: res.url(), status: res.status(), type: res.request().resourceType() })
  );

  console.log(`[test] navigating to ${URL}`);
  let navError: string | null = null;
  try {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e: unknown) {
    navError = e instanceof Error ? e.message : String(e);
  }

  await page.waitForTimeout(3000);

  const title = await page.title().catch(() => "(no title)");
  const bodyText = await page.locator("body").innerText().catch(() => "(no body)");

  console.log("\n=== Test result ===");
  console.log("Nav error:", navError ?? "none");
  console.log("Title:", title);
  console.log("Body length:", bodyText.length);
  console.log("Body preview:", bodyText.slice(0, 400));
  console.log("\nFailed requests:", failedRequests.length);
  failedRequests.forEach((r) => console.log("  ❌", r));
  console.log("\nConsole errors:", consoleErrors.length);
  consoleErrors.forEach((e) => console.log("  ❌", e));
  console.log("\nNon-200 responses:");
  const non200 = allRequests.filter((r) => r.status >= 400);
  if (non200.length === 0) {
    console.log("  (none)");
  } else {
    non200.forEach((r) => console.log(`  ${r.status} ${r.type} ${r.url}`));
  }

  await browser.close();

  // 401 on API endpoints is expected — no Telegram initData in headless browser
  const realNon200 = non200.filter((r) => !(r.status === 401 && r.url.includes("/api/")));
  const realErrors = consoleErrors.filter((e) => !e.includes("401"));

  const ok = !navError && realErrors.length === 0 && failedRequests.length === 0 && realNon200.length === 0 && bodyText.length > 50;
  console.log("\n" + (ok ? "✅ PASS" : "❌ FAIL"));
  process.exit(ok ? 0 : 1);
}

test();

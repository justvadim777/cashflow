import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  use: {
    ...devices["Pixel 5"],
    userAgent:
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Telegram-Android/10.13.3",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "test-screenshots/report" }]],
});

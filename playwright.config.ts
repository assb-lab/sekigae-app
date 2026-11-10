import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  // キャンバスのドラッグ等はタイミングに敏感なので直列で実行する
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ja-JP",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\..*spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\..*spec\.ts/ },
    // クロスブラウザ確認（PW_ALL_BROWSERS=1 のときだけ。事前に playwright install firefox webkit）
    ...(process.env.PW_ALL_BROWSERS
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: /mobile\..*spec\.ts/,
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            testIgnore: /mobile\..*spec\.ts/,
          },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm exec vp preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});

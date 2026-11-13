import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e/real-api",
  testMatch: /inspect-to-phase-1-personnel\.spec\.ts/,
  timeout: 300_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    viewport: { width: 1440, height: 900 },
    headless: false,
    launchOptions: {
      slowMo: 600,
    },
  },
})


import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright configuration for the Pegaxus front-end end-to-end tests.
 *
 * Scope: FRONT-END ONLY. Every call to the backend (`/api/v1/**`), the SignalR hub and Geoapify is intercepted in the
 * browser (see `e2e/support/api-mock.ts`), so the suite is deterministic, needs no backend, no network and no
 * credentials, and never touches the deployed development backend.
 *
 * Run `pnpm test:e2e`. Full guide: docs/PLAYWRIGHT.md.
 */

/** A dedicated port, so the suite never collides with the `pnpm dev` server a developer keeps on 5173. */
const PORT = Number(process.env.E2E_PORT ?? 5199)
const BASE_URL = `http://localhost:${PORT}`
const isCI = Boolean(process.env.CI)

/**
 * The suite tests the PRODUCTION build served by `vite preview`, not the dev server. The dev server transforms ~1000
 * modules on demand (about 15 s per page load on this project, every test opens a fresh page); the built bundle loads in
 * under a second, so the suite stays fast and it runs the exact code that is shipped.
 * `E2E_SKIP_BUILD=1` reuses the previous build (`e2e/.output/dist`) when only the tests changed.
 */
const DIST = "e2e/.output/dist"
const BUILD = `pnpm exec vite build --outDir ${DIST}`
const PREVIEW = `pnpm exec vite preview --outDir ${DIST} --port ${PORT} --strictPort`

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/.output/test-results",

  /** One test failing must not stop the others; every spec is independent (own page, own mock, own storage). */
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  /**
   * Parallel browsers: 1 by default. On a busy Windows machine several Chromium instances loading this application at
   * once stalled for good (not just slowly), while one at a time is stable (~3 s per test). Raise it on a machine
   * with spare cores: `E2E_WORKERS=4 pnpm test:e2e`.
   */
  workers: Number(process.env.E2E_WORKERS ?? (isCI ? 2 : 1)),

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/.output/report", open: "never" }],
    ...(isCI ? ([["github"]] as const) : []),
  ],

  use: {
    baseURL: BASE_URL,
    locale: "en-US",
    timezoneId: "UTC",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    /** Evidence is only kept when it is needed: a trace on the first retry, screenshot and video on failure. */
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    /** Signs in once through the real login form and stores the session; the specs below reuse it. */
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        /** Desktop layout: the booking form shows its desktop-only controls from the `lg` breakpoint (1024px). */
        viewport: { width: 1440, height: 900 },
        storageState: "e2e/.auth/customer.json",
      },
    },
  ],

  /** Builds and serves the real application (no mock server): the tests exercise the actual React app. */
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? PREVIEW : `${BUILD} && ${PREVIEW}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 420_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      /**
       * Build-time fallbacks for machines without a `.env` file (the app refuses to start without them). When a `.env`
       * exists it wins (see vite.config.ts), which is harmless: requests are intercepted whatever host they point at.
       */
      VITE_API_URL: process.env.VITE_API_URL ?? `${BASE_URL}/api/v1/`,
      VITE_GEOAPIFY_API_KEY: process.env.VITE_GEOAPIFY_API_KEY ?? "e2e-geoapify-key",
    },
  },
})

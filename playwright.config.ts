import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the Pegaxus front-end end-to-end tests. Two independent suites share this file:
 *
 *  - `mock`     (e2e/tests)     FRONT END ONLY. Every call to the backend (`/api/v1/**`), the SignalR hub and Geoapify is
 *                               intercepted in the browser (see `e2e/support/api-mock.ts`): deterministic, needs no
 *                               backend, no network, no credentials, and never touches the deployed backend.
 *  - `real-api` (e2e/real-api)  SMOKE TESTS against the REAL backend and database (no `page.route`). Few, critical
 *                               paths only; they create data with unique names and clean up after themselves.
 *
 * Commands: `pnpm test:e2e:mock`, `pnpm test:e2e:real`. Full guide: docs/PLAYWRIGHT.md.
 */

// ---------------------------------------------------------------------------------------------- real-API settings
// PLAYWRIGHT_BASE_URL, E2E_USER_EMAIL and E2E_USER_PASSWORD may live in the project's `.env` (next to the VITE_ variables)
// or in a separate `.env.e2e` (see `.env.e2e.example`); both are git-ignored. Order of precedence: variables already
// set in the shell, then `.env.e2e`, then `.env` (`loadEnvFile` never overrides a variable that is already set).
// Vite only exposes `VITE_*` variables to the browser bundle, so these credentials never reach the built app.
for (const file of [".env.e2e", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* file absent: the real-api setup project reports missing variables; the mock suite needs none */
  }
}

/** The front end the real-API suite drives. Default: the Vite dev server a developer already keeps on 5173. */
const REAL_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
/** Session of the real test user, written by `e2e/real-api/auth.setup.ts` (git-ignored). */
const REAL_AUTH_FILE = "playwright/.auth/user.json";

// ----------------------------------------------------------------------------------------------- mock-suite settings
/** Port of the front end the mock suite serves (`E2E_PORT` changes it). */
const PORT = Number(process.env.E2E_PORT ?? 5173);
const BASE_URL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

/**
 * The mock suite tests the PRODUCTION build served by `vite preview`, not the dev server. The dev server transforms
 * ~1000 modules on demand (about 15 s per page load on this project, every test opens a fresh page); the built bundle
 * loads in a few seconds, so the suite stays fast and it runs the exact code that is shipped.
 * `E2E_SKIP_BUILD=1` reuses the previous build (`e2e/.output/dist`) when only the tests changed.
 */
const DIST = "e2e/.output/dist";
const BUILD = `pnpm exec vite build --outDir ${DIST}`;
const PREVIEW = `pnpm exec vite preview --outDir ${DIST} --port ${PORT} --strictPort`;

/**
 * Only start the servers of the projects that are going to run (`--project=real-api` must not build the mock bundle,
 * and `--project=mock` must not start a dev server). Without `--project` everything is started.
 */
const requestedProjects = [...process.argv.join(" ").matchAll(/--project[= ]+([\w-]+)/g)].map((match) => match[1]);
const runs = (...names: string[]) => requestedProjects.length === 0 || names.some((name) => requestedProjects.includes(name));

const realUrl = new URL(REAL_BASE_URL);
const realIsLocal = ["localhost", "127.0.0.1"].includes(realUrl.hostname);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.output/test-results",

  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  /**
   * Parallel browsers: 1 by default. On a busy Windows machine several Chromium instances loading this application at
   * once stalled for good (not just slowly), while one at a time is stable (~3 s per test). Raise it on a machine
   * with spare cores: `E2E_WORKERS=4 pnpm test:e2e:mock`. The real-API specs are serial inside each file anyway.
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
    // ------------------------------------------------------------------------------------------------- mock suite
    /** Signs in once through the real login form (backend mocked) and stores the session for the `mock` specs. */
    {
      name: "mock-setup",
      testDir: "./e2e/tests",
      testMatch: /auth\.setup\.ts/,
      use: { baseURL: BASE_URL },
    },
    {
      name: "mock",
      testDir: "./e2e/tests",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["mock-setup"],
      /** Every spec is independent (own page, own mock, own storage), so they may run in parallel. */
      fullyParallel: true,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: BASE_URL,
        /** Desktop layout: the booking form shows its desktop-only controls from the `lg` breakpoint (1024px). */
        viewport: { width: 1440, height: 900 },
        storageState: "e2e/.auth/customer.json",
      },
    },

    // ----------------------------------------------------------------------------------------------- real-API suite
    /** Signs in ONCE with the real test account (E2E_USER_EMAIL / E2E_USER_PASSWORD) and stores the session. */
    {
      name: "setup",
      testDir: "./e2e/real-api",
      testMatch: /auth\.setup\.ts/,
      timeout: 180_000,
      use: { ...devices["Desktop Chrome"], baseURL: REAL_BASE_URL, viewport: { width: 1440, height: 900 } },
    },
    {
      name: "real-api",
      testDir: "./e2e/real-api",
      testMatch: /.*\.real\.spec\.ts/,
      dependencies: ["setup"],
      /** Serial: the specs share one real database, so they must not run against each other. */
      fullyParallel: false,
      /** A real network, a real database and (on a free host) a backend that may need a cold start. */
      timeout: 180_000,
      expect: { timeout: 30_000 },
      use: {
        ...devices["Desktop Chrome"],
        baseURL: REAL_BASE_URL,
        viewport: { width: 1440, height: 900 },
        storageState: REAL_AUTH_FILE,
        actionTimeout: 30_000,
        navigationTimeout: 60_000,
      },
    },
  ],

  webServer: [
    /** Mock suite: builds and serves the real application (no mock server): the tests exercise the actual React app. */
    ...(runs("mock", "mock-setup")
      ? [
          {
            command: process.env.E2E_SKIP_BUILD ? PREVIEW : `${BUILD} && ${PREVIEW}`,
            url: BASE_URL,
            reuseExistingServer: !isCI,
            timeout: 420_000,
            stdout: "ignore" as const,
            stderr: "pipe" as const,
            env: {
              /**
               * Build-time fallbacks for machines without a `.env` file (the app refuses to start without them). When a
               * `.env` exists it wins (see vite.config.ts), which is harmless: requests are intercepted whatever host
               * they point at.
               */
              VITE_API_URL: process.env.VITE_API_URL ?? `${BASE_URL}/api/v1/`,
              VITE_GEOAPIFY_API_KEY:
                process.env.VITE_GEOAPIFY_API_KEY ?? "e2e-geoapify-key",
            },
          },
        ]
      : []),
    /**
     * Real-API suite: the Vite dev server (it uses the API URL of your `.env`). A server already listening there, such
     * as the `pnpm dev` you keep on 5173, is reused and left running; one is only started (and stopped again) if the
     * port is free. A remote PLAYWRIGHT_BASE_URL needs no server.
     */
    ...(runs("setup", "real-api") && realIsLocal
      ? [
          {
            command: `pnpm exec vite --port ${realUrl.port || 5173} --strictPort`,
            url: REAL_BASE_URL,
            reuseExistingServer: true,
            timeout: 180_000,
            stdout: "ignore" as const,
            stderr: "pipe" as const,
          },
        ]
      : []),
  ],
});

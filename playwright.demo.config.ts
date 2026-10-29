import { defineConfig } from "@playwright/test"

import base from "./playwright.config.ts"

/**
 * "Demo" mode: the same tests, but the browser window is visible and every action is slowed down, so a person can
 * follow what the test does (typing, clicking, page changes). Used for presentations and for understanding the suite.
 *
 * `pnpm test:e2e:demo` - the pace is 700 ms per action; change `SLOW_MO_MS` below to go faster or slower.
 */
const SLOW_MO_MS = 700

export default defineConfig({
  ...base,
  workers: 1,
  // A visible, slow run can take longer than the default 60 s, and the HTML report is not needed for a demo.
  timeout: 180_000,
  reporter: [["list"]],
  use: {
    ...base.use,
    headless: false,
    launchOptions: { slowMo: SLOW_MO_MS },
  },
})

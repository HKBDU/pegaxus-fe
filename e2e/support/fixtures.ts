import { expect, test as base } from "@playwright/test"

import { ApiMock } from "./api-mock"
import { buildSession, pagedValue } from "./test-data"

/** Where the session saved by `auth.setup.ts` lives; `playwright.config.ts` loads it into every spec of the project. */
export const AUTH_FILE = "e2e/.auth/customer.json"

/** "Today" for every test. A fixed date makes the booking rules (earliest departure date) and the calendar repeatable. */
export const FIXED_NOW = "2026-10-29T10:00:00.000Z"

/**
 * Calls the application's shell makes on every authenticated page, whatever the screen under test is
 * (profile avatar, notification bell). They are answered once here so the specs only declare what they test.
 */
function declareShellDefaults(api: ApiMock) {
  api.ok("GET", "/accounts/me", {
    ...buildSession("CUSTOMER").user,
    email: "customer@e2e.test",
  })
  api.ok("GET", "/notifications", pagedValue([], 1, 20))
  api.ok("GET", "/notifications/unread-count", { count: 0 })
}

interface Fixtures {
  /** The mocked backend of this test: declare replies with `api.ok/fail/reply`, assert what was sent with `api.calls`. */
  api: ApiMock
}

export const test = base.extend<Fixtures>({
  api: [
    async ({ page }, use) => {
      await page.clock.setFixedTime(FIXED_NOW)

      const api = new ApiMock(page)
      declareShellDefaults(api)
      await api.install()

      await use(api)

      // Strict mode: the front end must not depend on a backend call the test did not declare.
      expect(api.unhandled, "API calls without a mock (declare them with api.ok / api.fail)").toEqual([])
    },
    /** `auto`: even a spec that never mentions `api` is isolated from the real network. */
    { auto: true },
  ],
})

export { expect }

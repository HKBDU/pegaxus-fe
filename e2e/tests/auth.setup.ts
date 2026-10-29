import { LoginPage } from "../pages/login.page"
import { AUTH_FILE, expect, test as setup } from "../support/fixtures"
import { buildSession, CUSTOMER_CREDENTIALS } from "../support/test-data"

/**
 * Setup project (runs once, before the `chromium` project, see playwright.config.ts).
 *
 * It signs in through the REAL login form of the application (only the backend answer is mocked) and stores the
 * resulting browser state - the persisted zustand session in localStorage - in `e2e/.auth/customer.json`.
 * Every other spec starts already signed in by loading that file, instead of repeating the login for each test.
 * That is faster and keeps each spec focused on one feature.
 */
setup("sign in as a customer and store the session", async ({ page, api }) => {
  api.ok("POST", "/auth/login", buildSession("CUSTOMER"))
  // The customer home page is rendered after sign-in; it needs no API data beyond the shell defaults.

  const login = new LoginPage(page)
  await login.goto()
  await login.signIn(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password)

  await expect(page).not.toHaveURL(/\/login/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pegaxus-auth"))).toContain("e2e-access-token-customer")

  await page.context().storageState({ path: AUTH_FILE })
})

import { expect, test as setup } from "@playwright/test";

import { LoginPage } from "../pages/login.page";
import { AUTH_FILE, credentials } from "./support";

/**
 * Setup project of the REAL-API suite (runs once, before `real-api`, see playwright.config.ts).
 *
 * It signs in through the real login form against the real backend with the account from `.env.e2e`, checks that the
 * account is a CUSTOMER (the only role that can add horses and create bookings) and stores the browser state -
 * the persisted session in localStorage - in `playwright/.auth/user.json`. The specs reuse it, so the real login (and
 * its rate limits) is exercised once per run, not once per test. `login.real.spec.ts` covers the login screen itself.
 */
setup("sign in with the real test account and store the session", async ({ page }) => {
  const { email, password } = credentials();

  const login = new LoginPage(page);
  await login.goto();
  await login.signIn(email, password);

  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 90_000 });
  } catch {
    const message = await page.locator("[data-sonner-toast]").first().textContent().catch(() => null);
    throw new Error(`Real sign-in failed${message ? `: "${message}"` : " (no response in time; is the backend awake?)"}`);
  }

  const stored = await page.evaluate(() => localStorage.getItem("pegaxus-auth"));
  const accountType = (JSON.parse(stored ?? "{}") as { state?: { user?: { accountType?: string } } }).state?.user?.accountType;
  expect(accountType, "E2E_USER_EMAIL must be a CUSTOMER account").toBe("CUSTOMER");

  await page.context().storageState({ path: AUTH_FILE });
});

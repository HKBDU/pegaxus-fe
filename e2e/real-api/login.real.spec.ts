import { expect, test } from "@playwright/test";

import { LoginPage } from "../pages/login.page";
import { credentials, stamp } from "./support";

/**
 * Feature 1 (real API) - Login smoke test: the login screen against the real backend.
 * Validation rules and every error variant are covered, deterministically, by the mock suite (login.spec.ts).
 */
test.describe("Login (real API)", () => {
  test.describe.configure({ mode: "serial" });
  // These specs start signed OUT, unlike the other real-API specs.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("REAL-LOGIN-01 an unknown account is refused: error shown, still on the login page, no session stored", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    // A throw-away address that cannot belong to anyone; the real account is never tried with a wrong password.
    await login.signIn(`e2e-no-such-user-${stamp().toLowerCase()}@example.com`, "Wrong-Password-1");

    await expect(page.locator("[data-sonner-toast]").first()).toContainText(/incorrect|invalid|not found|failed/i);
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pegaxus-auth") ?? "{}").state?.accessToken ?? null)).toBeNull();
  });

  test("REAL-LOGIN-02 the test customer signs in, leaves the login page and gets a stored session", async ({ page }) => {
    const { email, password } = credentials();
    const login = new LoginPage(page);
    await login.goto();

    await login.signIn(email, password);

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Signed in successfully." })).toBeVisible();
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem("pegaxus-auth") ?? "{}").state);
    expect(session.accessToken).toBeTruthy();
    expect(session.user.accountType).toBe("CUSTOMER");
  });

  test("REAL-LOGIN-03 a signed-out visitor of a private page is sent to the login page", async ({ page }) => {
    await page.goto("/my-horses");

    await expect(page).toHaveURL(/\/login/);
    await expect(new LoginPage(page).heading).toBeVisible();
  });
});

import type { Browser, Page } from "@playwright/test"
import { expect } from "@playwright/test"

/**
 * Helpers of the REAL-API suite. Nothing here mocks the network: the pages talk to the real backend and database.
 *
 * Rules every real-API spec follows:
 *  1. Few, critical paths only (smoke tests): the detailed rules are covered, fast and deterministic, by the mock suite.
 *  2. Everything a spec creates carries a unique "E2E Smoke" name, so it never collides with real data and a leftover
 *     can be recognised and deleted by hand.
 *  3. The spec removes what it created, through the same UI a user would use (best effort, see `cleanUp`).
 */

/** Session of the real test user (written by `auth.setup.ts`). Same path as `playwright.config.ts`. */
export const AUTH_FILE = "playwright/.auth/user.json";

/** The account the suite signs in with, taken from `.env.e2e` or the shell. Throws a helpful message when missing. */
export function credentials() {
  const email = process.env.E2E_USER_EMAIL?.trim();
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Real-API tests need a CUSTOMER account of the target backend. Copy .env.e2e.example to .env.e2e and fill " +
        "E2E_USER_EMAIL and E2E_USER_PASSWORD (or export them in the shell). Never commit that file.",
    );
  }
  return { email, password };
}

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomFrom(alphabet: string, length: number) {
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

/** Short unique tag such as `M3K9X2QF`, for names created during one run. */
export function stamp() {
  return `${Date.now().toString(36)}${randomFrom(ALPHANUMERIC, 3)}`.toUpperCase();
}

/** A horse nobody else owns: unique name, passport (15 x A-Z0-9) and microchip (15 digits). */
export function newSmokeHorse() {
  return {
    horseName: `E2E Smoke ${stamp()}`,
    sex: "MALE" as const,
    breed: "Thoroughbred",
    dateOfBirth: "2018-04-12",
    color: "Bay",
    countryOfOrigin: "Ireland",
    weightKg: 520.5,
    heightCm: 165.2,
    passportNumber: `E2E${randomFrom(ALPHANUMERIC, 12)}`,
    microchipNumber: `981${randomFrom("0123456789", 12)}`,
    identificationNotes: "Created by the automated real-API smoke test; safe to delete.",
  };
}

/** `yyyy-MM-dd` (UTC) of today plus `days`. The real backend checks the dates against the real clock. */
export function isoDateInDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Runs `work` in a fresh page that is already signed in (for clean-up in `afterAll`, where no `page` fixture exists). */
export async function withSignedInPage(browser: Browser, baseURL: string | undefined, work: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ baseURL, storageState: AUTH_FILE, locale: "en-US" });
  try {
    await work(await context.newPage());
  } finally {
    await context.close();
  }
}

/** Removes a horse from "My horses" the way a user does (Actions menu, Remove, confirm). */
export async function removeHorse(page: Page, horseName: string) {
  await page.goto("/my-horses");
  await page.getByLabel("Search horses").fill(horseName);
  await page.getByRole("button", { name: `Actions for ${horseName}` }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(horseName, { exact: true })).toHaveCount(0);
}

/** Cancels a PENDING booking from its details page (the customer's own action). */
export async function cancelBooking(page: Page, bookingPath: string) {
  await page.goto(bookingPath);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByPlaceholder("Explain why this booking is being cancelled").fill("Automated smoke test clean-up.");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Booking cancelled" })).toBeVisible();
}

/**
 * Clean-up must never hide the result of the test: a failure here is reported as a warning that names the leftover,
 * so it can be deleted by hand, instead of failing (or masking) the run.
 */
export async function cleanUp(description: string, step: () => Promise<void>) {
  try {
    await step();
  } catch (error) {
    console.warn(`[real-api] clean-up failed, delete by hand: ${description}\n  ${String(error).split("\n")[0]}`);
  }
}

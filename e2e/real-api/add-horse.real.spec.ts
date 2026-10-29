import { expect, test } from "@playwright/test";

import { HorseFormPage } from "../pages/horse-form.page";
import { cleanUp, newSmokeHorse, removeHorse, withSignedInPage } from "./support";

/**
 * Feature 2 (real API) - Add horse smoke test: the whole path "fill the form, save, see it in my list" against the real
 * backend and database. Field rules and error variants are covered by the mock suite (add-horse.spec.ts).
 */
test.describe("Add horse (real API)", () => {
  test.describe.configure({ mode: "serial" });

  const horse = newSmokeHorse();
  let attemptedToCreate = false;

  test("REAL-HORSE-01 a customer adds a horse: confirmation shown and the list page opens", async ({ page }) => {
    const form = new HorseFormPage(page);
    await form.goto();
    await form.fillAll(horse);

    attemptedToCreate = true;
    await form.submit.click();

    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Horse created successfully." })).toBeVisible();
    await expect(page).toHaveURL(/\/my-horses$/);
  });

  test("REAL-HORSE-02 after a fresh page load the horse is really stored, with the data that was typed", async ({ page }) => {
    // A new navigation re-reads the list from the backend: it is not the page's leftover state.
    await page.goto("/my-horses");
    await page.getByLabel("Search horses").fill(horse.horseName);

    await expect(page.getByText(horse.horseName, { exact: true })).toBeVisible();
    await expect(page.getByText(horse.microchipNumber)).toBeVisible();
  });

  test.afterAll(async ({ browser }) => {
    if (!attemptedToCreate) return;
    await cleanUp(`horse "${horse.horseName}"`, () =>
      withSignedInPage(browser, test.info().project.use.baseURL, (page) => removeHorse(page, horse.horseName)),
    );
  });
});

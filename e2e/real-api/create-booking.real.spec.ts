import { expect, test } from "@playwright/test";

import { BookingFormPage } from "../pages/booking-form.page";
import { HorseFormPage } from "../pages/horse-form.page";
import { cancelBooking, cleanUp, isoDateInDays, newSmokeHorse, removeHorse, withSignedInPage } from "./support";

/**
 * Feature 3 (real API) - Create booking smoke test, customer side: route (real Geoapify search), dates, a horse added
 * on the spot, and the booking created in the real backend. A new booking is PENDING; approving it is the Logistics
 * Manager's job and is not part of this suite. Detailed rules are covered by the mock suite (create-booking.spec.ts).
 *
 * Domestic UK trips may leave 21 days from today at the earliest; 30 days keeps a safe margin for time zones.
 */
test.describe("Create booking (real API)", () => {
  test.describe.configure({ mode: "serial" });

  const horse = newSmokeHorse();
  let attemptedToCreateHorse = false;
  let bookingPath: string | undefined;

  test("REAL-BOOKING-01 a customer plans a UK trip with a new horse and the booking is created as Pending", async ({ page }) => {
    const booking = new BookingFormPage(page);
    await booking.goto();

    // Step 1 - route: search real addresses and take the first result of each. The result buttons only show the place
    // name ("Greater London"), not its country, so the country is checked on the Pickup / Destination card afterwards:
    // two United Kingdom points make a domestic trip (no extra rules).
    await booking.search("London, United Kingdom");
    await booking.searchResult(/London/).first().click();
    await expect(booking.pointCard("Pickup")).toContainText("United Kingdom");
    await booking.search("Manchester, United Kingdom");
    await booking.searchResult(/Manchester/).first().click();
    await expect(booking.pointCard("Destination")).toContainText("United Kingdom");

    // Step 1 - schedule and notes.
    await booking.chooseDeparture(isoDateInDays(30));
    await booking.chooseArrival(isoDateInDays(33));
    await booking.notes.fill("Automated real-API smoke test; safe to cancel.");
    await booking.goToHorses();

    // Step 2 - a horse created in the dialog is added to the list and selected for this booking.
    await booking.addRacehorse.click();
    const dialog = page.getByRole("dialog", { name: "Add new racehorse" });
    await new HorseFormPage(page).fillAll(horse);
    attemptedToCreateHorse = true;
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(dialog).toBeHidden();
    await expect(booking.selectedPanel).toContainText(horse.horseName);

    await booking.submit.click();

    // Result - confirmation, then the booking's own page in its initial state.
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /Booking .+ created/ })).toBeVisible();
    await page.waitForURL(/\/bookings\/(?!new)[^/]+$/);
    bookingPath = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: "BOOKING DETAILS" })).toBeVisible();
    await expect(page.getByText(horse.horseName).first()).toBeVisible();
    await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible();
  });

  test.afterAll(async ({ browser }) => {
    const baseURL = test.info().project.use.baseURL;
    // Order matters: the booking is cancelled first, otherwise its horse is still in use.
    if (bookingPath) {
      await cleanUp(`booking ${bookingPath}`, () => withSignedInPage(browser, baseURL, (page) => cancelBooking(page, bookingPath!)));
    }
    if (attemptedToCreateHorse) {
      await cleanUp(`horse "${horse.horseName}"`, () => withSignedInPage(browser, baseURL, (page) => removeHorse(page, horse.horseName)));
    }
  });
});

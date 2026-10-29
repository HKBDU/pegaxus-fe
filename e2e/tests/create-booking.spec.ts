import { BookingFormPage } from "../pages/booking-form.page"
import { HorseFormPage } from "../pages/horse-form.page"
import { fakeHorseList } from "../support/fakes"
import { expect, test } from "../support/fixtures"
import { buildBooking, buildHorse, OWNED_HORSES, PLACES } from "../support/test-data"
import { toast } from "../support/ui"

/**
 * Feature 3 - Create a booking (`/bookings/new`), as a customer.
 *
 * Scope: the customer's side only. A created booking is PENDING; approving it is the Logistics Manager's job and is not
 * part of this suite. The map search (Geoapify) and the backend are mocked, so the route is picked by searching for an
 * address exactly like a user would, and the tests assert what the front end SENT to `POST /bookings`.
 *
 * Fixed clock: 29 Oct 2026. Rules the form enforces from that date:
 *   - United Kingdom -> United Kingdom (domestic): departure at least 21 days ahead, so from 19 Nov 2026;
 *   - any other supported pair (international): at least 2 months ahead, so from 29 Dec 2026.
 */

const BOOKINGS_ENDPOINT = "/bookings"
const [GOLDEN, SILVER] = OWNED_HORSES as [(typeof OWNED_HORSES)[number], (typeof OWNED_HORSES)[number]]

test.describe("Create booking", () => {
  let booking: BookingFormPage

  test.beforeEach(async ({ api, page }) => {
    fakeHorseList(api, OWNED_HORSES)
    booking = new BookingFormPage(page)
    await booking.goto()
  })

  /** Step 1 of the happy path: London -> Manchester (domestic), leaving 15 Dec, arriving 18 Dec. */
  async function completeStepOne() {
    await booking.pickPlace("London", /London Riding Stables/)
    await booking.pickPlace("Manchester", /Manchester Equestrian Centre/)
    await booking.chooseDeparture("2026-12-15")
    await booking.chooseArrival("2026-12-18")
    await booking.notes.fill("Please load the horses last.")
  }

  test.describe("step 1 - transport details", () => {
    test("BOOKING-01 shows the route, schedule and notes sections with nothing picked yet", async () => {
      await expect(booking.heading).toBeVisible()
      await expect(booking.steps).toContainText("Transport details")
      await expect(booking.steps).toContainText("Racehorses & trip requirements")
      await expect(booking.pointCard("Pickup")).toContainText("Not picked yet")
      await expect(booking.pointCard("Destination")).toContainText("Not picked yet")
      await expect(booking.searchBox).toBeVisible()
      await expect(booking.departureDate).toContainText("DD / MM / YYYY")
      await expect(booking.continueButton).toBeVisible()
      await expect(booking.cancelButton).toBeVisible()
    })

    test("BOOKING-02 continuing with an empty step reports the route and the departure date", async ({ page }) => {
      await booking.continueButton.click()

      await expect(page.getByText("Pick the pickup point on the map")).toBeVisible()
      await expect(page.getByText("Pick the destination point on the map")).toBeVisible()
      await expect(page.getByText("Choose a departure date")).toBeVisible()
      await expect(booking.step2Heading).toBeHidden()
    })

    test("BOOKING-03 searching an address sets the pickup, then the next search sets the destination", async () => {
      await expect(booking.mapStatus).toContainText("Setting the pickup point")

      await booking.pickPlace("London", /London Riding Stables/)
      // The wizard moves on to the destination by itself once the pickup is set.
      await expect(booking.pointCard("Pickup")).toContainText(PLACES.londonStable.formatted)
      await expect(booking.pointCard("Pickup")).toContainText("United Kingdom · 51.5073, -0.1657")
      await expect(booking.mapStatus).toContainText("Setting the destination point")

      await booking.pickPlace("Manchester", /Manchester Equestrian Centre/)
      await expect(booking.pointCard("Destination")).toContainText(PLACES.manchesterYard.formatted)
      await expect(booking.pointCard("Destination")).toContainText("United Kingdom · 53.4668, -2.2339")
    })

    test("BOOKING-04 a search without matches says so", async () => {
      await booking.search("zzzz-nowhere")

      await expect(booking.page.getByText("No places found.")).toBeVisible()
      await expect(booking.pointCard("Pickup")).toContainText("Not picked yet")
    })

    test("BOOKING-05 an address outside the 27 EU countries and the UK is refused", async () => {
      await booking.pickPlace("Central Park", /Central Park Stables/)

      await expect(booking.mapStatus).toContainText("Only the 27 EU countries and the United Kingdom are supported")
      await expect(booking.pointCard("Pickup")).toContainText("Not picked yet")
    })

    test("BOOKING-06 two points in the same country are only accepted in the United Kingdom", async ({ page }) => {
      await booking.pickPlace("Paris", /Haras de Paris/)
      await booking.pointCard("Destination").click()
      await booking.pickPlace("Paris", /Haras de Paris/)
      await booking.chooseDeparture("2027-03-01")
      await booking.continueButton.click()

      await expect(page.getByText("Same-country bookings are only accepted in the United Kingdom").first()).toBeVisible()
      await expect(booking.step2Heading).toBeHidden()
    })

    test("BOOKING-07 a domestic trip cannot leave sooner than 21 days from today", async () => {
      await booking.pickPlace("London", /London Riding Stables/)
      await booking.pickPlace("Manchester", /Manchester Equestrian Centre/)

      // 29 Oct 2026 + 21 days = 19 Nov 2026
      await expect(await booking.calendarDay(booking.departureDate, "2026-11-18")).toBeDisabled()
      await expect(booking.page.locator("button[data-day='11/19/2026']")).toBeEnabled()
    })

    test("BOOKING-08 an international trip cannot leave sooner than 2 months from today", async () => {
      await booking.pickPlace("London", /London Riding Stables/)
      await booking.pickPlace("Paris", /Haras de Paris/)

      // 29 Oct 2026 + 2 months = 29 Dec 2026
      await expect(await booking.calendarDay(booking.departureDate, "2026-12-28")).toBeDisabled()
      await expect(booking.page.locator("button[data-day='12/29/2026']")).toBeEnabled()
    })

    test("BOOKING-09 the arrival date cannot be before the departure date", async () => {
      await booking.pickPlace("London", /London Riding Stables/)
      await booking.pickPlace("Manchester", /Manchester Equestrian Centre/)
      await booking.chooseDeparture("2026-12-15")

      await expect(await booking.calendarDay(booking.arrivalDate, "2026-12-14")).toBeDisabled()
      await expect(booking.page.locator("button[data-day='12/15/2026']")).toBeEnabled()
    })

    test("BOOKING-10 Cancel leaves the form for the booking list without creating anything", async ({ api, page }) => {
      api.ok("GET", BOOKINGS_ENDPOINT, { items: [], pageIndex: 1, pageSize: 10, totalItems: 0, totalPages: 1 })

      await booking.cancelButton.click()

      await expect(page).toHaveURL(/\/bookings$/)
      expect(api.calls("POST", BOOKINGS_ENDPOINT)).toHaveLength(0)
    })
  })

  test.describe("step 2 - racehorses", () => {
    test.beforeEach(async () => {
      await completeStepOne()
      await booking.goToHorses()
    })

    test("BOOKING-11 lists the customer's horses and starts with none selected", async () => {
      await expect(booking.horseCheckbox("Golden Thunder")).not.toBeChecked()
      await expect(booking.horseCheckbox("Silver Mist")).not.toBeChecked()
      await expect(booking.selectedPanel).toContainText("No horses selected yet.")
      await expect(booking.page.getByRole("heading", { name: "Selected racehorses (0)" })).toBeVisible()
    })

    test("BOOKING-21 the header checkbox selects every horse of the page and a second click clears them", async ({ page }) => {
      const selectAll = page.getByRole("checkbox", { name: "Select all horses on this page" })

      await selectAll.check()
      await expect(page.getByRole("heading", { name: "Selected racehorses (2)" })).toBeVisible()
      await expect(booking.horseCheckbox("Golden Thunder")).toBeChecked()
      await expect(booking.horseCheckbox("Silver Mist")).toBeChecked()

      await selectAll.uncheck()
      await expect(page.getByRole("heading", { name: "Selected racehorses (0)" })).toBeVisible()
    })

    test("BOOKING-12 horses can be selected, removed and cleared", async ({ page }) => {
      await booking.horseCheckbox("Golden Thunder").check()
      await booking.horseCheckbox("Silver Mist").check()
      await expect(page.getByRole("heading", { name: "Selected racehorses (2)" })).toBeVisible()

      await booking.selectedPanel.getByRole("button", { name: "Remove Silver Mist" }).click()
      await expect(page.getByRole("heading", { name: "Selected racehorses (1)" })).toBeVisible()
      await expect(booking.horseCheckbox("Silver Mist")).not.toBeChecked()

      await booking.selectedPanel.getByRole("button", { name: "Clear all" }).click()
      await expect(page.getByRole("heading", { name: "Selected racehorses (0)" })).toBeVisible()
      await expect(booking.horseCheckbox("Golden Thunder")).not.toBeChecked()
    })

    test("BOOKING-13 the search box asks the server for matching horses", async ({ api }) => {
      await booking.horseSearch.fill("Silver")

      await expect(booking.horseCheckbox("Silver Mist")).toBeVisible()
      await expect(booking.horseCheckbox("Golden Thunder")).toBeHidden()
      expect(api.calls("GET", "/horses").some((call) => call.query.search === "Silver")).toBe(true)
    })

    test("BOOKING-14 'Return to transport details' keeps what was entered", async () => {
      await booking.backToStep1.click()

      await expect(booking.pointCard("Pickup")).toContainText(PLACES.londonStable.formatted)
      await expect(booking.pointCard("Destination")).toContainText(PLACES.manchesterYard.formatted)
      await expect(booking.departureDate).toContainText("15 / 12 / 2026")
      await expect(booking.notes).toHaveValue("Please load the horses last.")
    })

    test("BOOKING-15 a note typed for a selected horse is limited to 500 characters", async () => {
      await booking.horseCheckbox("Golden Thunder").check()
      const note = booking.horseNote("Golden Thunder")

      await note.fill("x".repeat(600))

      await expect(note).toHaveValue("x".repeat(500))
      await expect(booking.selectedPanel.page().getByText("500/500")).toBeVisible()
    })
  })

  test.describe("creating the booking", () => {
    test("BOOKING-16 a complete booking is created, PENDING, and its details page opens", async ({ api, page }) => {
      const created = buildBooking({
        horses: [
          { ...pick(GOLDEN), specialHandlingNotes: "Needs a quiet stall." },
          { ...pick(SILVER), specialHandlingNotes: null },
        ],
        totalHorses: 2,
        specialRequirements: "Please load the horses last.",
      })
      api.ok("POST", BOOKINGS_ENDPOINT, { bookingId: created.bookingId, bookingCode: created.bookingCode }, 201)
      api.ok("GET", `${BOOKINGS_ENDPOINT}/${created.bookingId}`, created)
      // The details page also loads the sections below; none has data for a brand-new booking.
      api.tolerateUndeclared({ body: { isSuccess: true, code: 200, message: "Success", value: { items: [], pageIndex: 1, pageSize: 10, totalItems: 0, totalPages: 1 } } })

      await completeStepOne()
      await booking.goToHorses()
      await booking.horseCheckbox("Golden Thunder").check()
      await booking.horseCheckbox("Silver Mist").check()
      await booking.horseNote("Golden Thunder").fill("Needs a quiet stall.")
      await booking.submit.click()

      // What the front end SENT: points with coordinates, ISO dates, the horses with their notes, no approval step.
      await expect.poll(() => api.calls("POST", BOOKINGS_ENDPOINT).length).toBe(1)
      expect(api.lastBody("POST", BOOKINGS_ENDPOINT)).toEqual({
        originAddress: PLACES.londonStable.formatted,
        originCountry: "United Kingdom",
        originLatitude: 51.5073,
        originLongitude: -0.1657,
        destinationAddress: PLACES.manchesterYard.formatted,
        destinationCountry: "United Kingdom",
        destinationLatitude: 53.4668,
        destinationLongitude: -2.2339,
        requestedDepartureDate: "2026-12-15",
        requestedArrivalDate: "2026-12-18",
        specialRequirements: "Please load the horses last.",
        horses: [
          { horseId: GOLDEN.horseId, specialHandlingNotes: "Needs a quiet stall." },
          { horseId: SILVER.horseId, specialHandlingNotes: "" },
        ],
      })

      // What the user SEES: confirmation, then the booking in its initial state, waiting for the manager.
      await expect(toast(page, "Booking BK-20261029-0001 created")).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/bookings/${created.bookingId}$`))
      await expect(page.getByRole("heading", { name: "BOOKING DETAILS" })).toBeVisible()
      await expect(page.getByText("BK-20261029-0001").first()).toBeVisible()
      await expect(page.getByText("Pending", { exact: true }).first()).toBeVisible()
    })

    test("BOOKING-17 while the booking is being saved the button shows progress and is disabled", async ({ api }) => {
      api.ok("POST", BOOKINGS_ENDPOINT, { bookingId: "44444444-4444-4444-8444-444444444444", bookingCode: "BK-20261029-0001" }, 201, 1_500)

      await completeStepOne()
      await booking.goToHorses()
      await booking.horseCheckbox("Golden Thunder").check()
      await booking.submit.click()

      await expect(booking.submit).toHaveText("Saving...")
      await expect(booking.submit).toBeDisabled()
    })

    test("BOOKING-18 a rejection from the server (400) is explained and the customer's input is kept", async ({ api, page }) => {
      api.fail("POST", BOOKINGS_ENDPOINT, 400, {
        errorCode: "VALIDATION_ERROR",
        message: "Validation failed",
        errors: [{ field: "RequestedDepartureDate", message: "Departure date is too soon for this route." }],
      })

      await completeStepOne()
      await booking.goToHorses()
      await booking.horseCheckbox("Golden Thunder").check()
      await booking.submit.click()

      await expect(toast(page, "Departure date is too soon for this route.")).toBeVisible()
      await expect(page).toHaveURL(/\/bookings\/new$/)
      await expect(page.getByRole("heading", { name: "Selected racehorses (1)" })).toBeVisible()
      await expect(booking.submit).toBeEnabled()
    })

    test("BOOKING-19 an unreachable server gets the generic message", async ({ api, page }) => {
      api.networkError("POST", BOOKINGS_ENDPOINT)

      await completeStepOne()
      await booking.goToHorses()
      await booking.horseCheckbox("Golden Thunder").check()
      await booking.submit.click()

      await expect(toast(page, "Unable to create this booking")).toBeVisible()
    })
  })

  test.describe("international trip (United Kingdom to France)", () => {
    test("BOOKING-22 the earliest departure is two months ahead and the booking carries both countries", async ({ api, page }) => {
      const created = buildBooking({
        destinationAddress: PLACES.parisStable.formatted,
        destinationCountry: "France",
        destinationLatitude: PLACES.parisStable.lat,
        destinationLongitude: PLACES.parisStable.lon,
        requestedDepartureDate: "2026-12-29",
        requestedArrivalDate: "2027-01-28",
        horses: [{ ...pick(GOLDEN), specialHandlingNotes: null }, { ...pick(SILVER), specialHandlingNotes: null }],
        totalHorses: 2,
      })
      api.ok("POST", BOOKINGS_ENDPOINT, { bookingId: created.bookingId, bookingCode: created.bookingCode }, 201)
      api.ok("GET", `${BOOKINGS_ENDPOINT}/${created.bookingId}`, created)
      api.tolerateUndeclared({ body: { isSuccess: true, code: 200, message: "Success", value: { items: [], pageIndex: 1, pageSize: 10, totalItems: 0, totalPages: 1 } } })

      await booking.pickPlace("London", /London Riding Stables/)
      await booking.pickPlace("Paris", /Haras de Paris/)
      await expect(booking.pointCard("Destination")).toContainText("France")

      // 29 Oct 2026 + 2 months = 29 Dec 2026: the day before is closed, the day itself is the first open one.
      await expect(await booking.calendarDay(booking.departureDate, "2026-12-28")).toBeDisabled()
      await page.keyboard.press("Escape") // close the calendar that was only inspected
      await expect(page.locator("[data-slot='calendar']")).toBeHidden()
      await booking.chooseDeparture("2026-12-29")
      await booking.chooseArrival("2027-01-28")
      await booking.goToHorses()
      await page.getByRole("checkbox", { name: "Select all horses on this page" }).check()
      await booking.submit.click()

      await expect.poll(() => api.calls("POST", BOOKINGS_ENDPOINT).length).toBe(1)
      expect(api.lastBody("POST", BOOKINGS_ENDPOINT)).toMatchObject({
        originCountry: "United Kingdom",
        destinationCountry: "France",
        destinationLatitude: 48.8566,
        destinationLongitude: 2.3522,
        requestedDepartureDate: "2026-12-29",
        requestedArrivalDate: "2027-01-28",
        horses: [{ horseId: GOLDEN.horseId }, { horseId: SILVER.horseId }],
      })
      await expect(toast(page, "Booking BK-20261029-0001 created")).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/bookings/${created.bookingId}$`))
    })
  })

  test.describe("adding a horse without leaving the booking", () => {
    test("BOOKING-20 a horse created in the dialog is added to the list and selected", async ({ api, page }) => {
      const created = buildHorse({
        horseId: "55555555-5555-4555-8555-555555555555",
        horseName: "Midnight Star",
        sex: "GELDING",
        breed: "Warmblood",
        passportNumber: "DE111222333ABCD",
        microchipNumber: "276098100111222",
      })
      const horses = [...OWNED_HORSES]
      fakeHorseList(api, horses)
      api.ok("POST", "/horses", () => {
        horses.push(created)
        return created
      }, 201)

      await completeStepOne()
      await booking.goToHorses()
      await booking.addRacehorse.click()

      const dialog = page.getByRole("dialog", { name: "Add new racehorse" })
      await expect(dialog).toBeVisible()
      const form = new HorseFormPage(page)
      await form.fillAll({
        horseName: created.horseName,
        sex: created.sex,
        breed: created.breed,
        dateOfBirth: "2019-05-20",
        color: "Black",
        countryOfOrigin: "Germany",
        weightKg: 540,
        heightCm: 168,
        passportNumber: created.passportNumber,
        microchipNumber: created.microchipNumber,
        identificationNotes: "Small white sock on the left hind leg.",
      })
      await dialog.getByRole("button", { name: "Create" }).click()

      await expect(dialog).toBeHidden()
      await expect(page.getByRole("heading", { name: "Selected racehorses (1)" })).toBeVisible()
      await expect(booking.selectedPanel).toContainText("Midnight Star")
      await expect(booking.horseCheckbox("Midnight Star")).toBeChecked()
    })
  })
})

/** The booked-horse fields of an owned horse (what `GET /bookings/{id}` lists under `horses`). */
function pick(horse: (typeof OWNED_HORSES)[number]) {
  return {
    horseId: horse.horseId,
    horseName: horse.horseName,
    sex: horse.sex,
    breed: horse.breed,
    microchipNumber: horse.microchipNumber,
    passportNumber: horse.passportNumber,
  }
}

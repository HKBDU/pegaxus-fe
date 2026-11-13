import type { Locator, Page } from "@playwright/test"

import { pickDate } from "./horse-form.page"

export type PointSide = "Pickup" | "Destination"

/**
 * Page Object for the "Create booking" wizard (`/bookings/new`).
 *
 * Step 1 "Transport details": pickup and destination are chosen with the map's search box (the same result as clicking
 * the map, without depending on WebGL rendering), then the dates and notes.
 * Step 2 "Racehorses & trip requirements": horses are picked from a paged table and each one gets an optional note.
 */
export class BookingFormPage {
  // ---- step 1
  readonly heading: Locator
  readonly steps: Locator
  readonly searchBox: Locator
  readonly mapStatus: Locator
  readonly departureDate: Locator
  readonly arrivalDate: Locator
  readonly notes: Locator
  readonly continueButton: Locator
  readonly cancelButton: Locator

  // ---- step 2
  readonly step2Heading: Locator
  readonly horseSearch: Locator
  readonly addRacehorse: Locator
  readonly selectedPanel: Locator
  readonly submit: Locator
  readonly backToStep1: Locator

  constructor(readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "CREATE BOOKING" })
    this.steps = page.getByRole("list", { name: "Booking form progress" })
    this.searchBox = page.getByLabel("Search location")
    this.mapStatus = page.getByRole("status")
    this.departureDate = page.getByLabel("Expected departure date *")
    this.arrivalDate = page.getByLabel("Expected arrival date")
    this.notes = page.getByPlaceholder("Any initial boarding requirements, custom clearance notes, etc...")
    this.continueButton = page.getByRole("button", { name: "Save & continue" })
    this.cancelButton = page.getByRole("button", { name: "Cancel" })

    this.step2Heading = page.getByRole("heading", { name: "SELECT RACEHORSES" })
    this.horseSearch = page.getByPlaceholder("Search by horse name or microchip number...")
    this.addRacehorse = page.getByRole("button", { name: "Add new racehorse" })
    this.selectedPanel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^Selected racehorses/ }) })
    this.submit = page.locator("form button[type='submit']")
    this.backToStep1 = page.getByRole("button", { name: /Return to transport details/ })
  }

  async goto() {
    await this.page.goto("/bookings/new")
    await this.heading.waitFor()
  }

  // ------------------------------------------------------------------------------------------------- step 1: route

  /** The Pickup / Destination card next to the map (it also shows the chosen address once a point is picked). */
  pointCard(side: PointSide): Locator {
    return this.page.getByRole("group", { name: "Choose which point to set" }).getByRole("button", { name: new RegExp(`^${side}`) })
  }

  /** Types in the map search box and returns the result list entry with `name`. */
  async search(query: string) {
    await this.searchBox.fill(query)
  }

  searchResult(name: string | RegExp): Locator {
    // The result list sits in the same absolutely positioned widget as the search box.
    return this.searchBox.locator("xpath=ancestor::div[contains(@class,'absolute')][1]").getByRole("button", { name })
  }

  /** Searches `query` and picks the result called `resultName` for the point currently being set. */
  async pickPlace(query: string, resultName: string | RegExp) {
    await this.search(query)
    await this.searchResult(resultName).click()
  }

  // ----------------------------------------------------------------------------------------------- step 1: schedule

  async chooseDeparture(iso: string) {
    await pickDate(this.page, this.departureDate, iso)
  }

  async chooseArrival(iso: string) {
    await pickDate(this.page, this.arrivalDate, iso)
  }

  /** Opens a date picker and returns the calendar button of `iso` (yyyy-MM-dd), to check if it can be chosen. */
  async calendarDay(trigger: Locator, iso: string): Promise<Locator> {
    const [year, month, day] = iso.split("-").map(Number) as [number, number, number]
    await trigger.click()
    const calendar = this.page.locator("[data-slot='calendar']")
    await calendar.waitFor()
    await calendar.locator("select").nth(1).selectOption(String(year))
    await calendar.locator("select").nth(0).selectOption(String(month - 1))
    return calendar.locator(`button[data-day="${month}/${day}/${year}"]`)
  }

  // ----------------------------------------------------------------------------------------------- step 2: horses

  horseCheckbox(horseName: string): Locator {
    return this.page.getByRole("checkbox", { name: `Select ${horseName}` })
  }

  /** The per-horse note field (it only exists for a selected horse). */
  horseNote(horseName: string): Locator {
    return this.page
      .locator("[data-slot='form-item']")
      .filter({ has: this.page.getByText(horseName, { exact: false }) })
      .getByPlaceholder("Diet, loading or welfare notes for this horse")
  }

  /** Moves from step 1 to step 2 (the route and the departure date must already be valid). */
  async goToHorses() {
    await this.continueButton.click()
    await this.step2Heading.waitFor()
  }
}

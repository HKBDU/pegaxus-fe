import type { Locator, Page } from "@playwright/test"

import type { TestHorse } from "../support/test-data"

/**
 * Page Object for the "Add horse" form (`/my-horses/new`).
 *
 * The form labels are plain text (not <label> elements), so each field is found through its `.field-container`,
 * the wrapper that holds the visible label and the control. Custom widgets (Radix select, country popover, calendar)
 * are operated the way a user does: open, then choose.
 */
export class HorseFormPage {
  readonly heading: Locator
  readonly submit: Locator
  readonly cancel: Locator
  readonly validationSummary: Locator

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "ADD HORSE" })
    this.submit = page.getByRole("button", { name: /^(Create|Saving\.\.\.)$/ })
    this.cancel = page.getByRole("button", { name: "Cancel" })
    this.validationSummary = page.getByText("Please complete all required fields before submitting.")
  }

  async goto() {
    await this.page.goto("/my-horses/new")
    await this.heading.waitFor()
  }

  /** The wrapper of one field, found by its visible label (for example "WEIGHT (KG)"). */
  field(label: string): Locator {
    return this.page
      .locator(".field-container")
      .filter({ has: this.page.locator(".field-label", { hasText: new RegExp(`^${escapeRegExp(label)}$`) }) })
  }

  /** The error message shown under a field (react-hook-form `FormMessage`). */
  fieldError(label: string): Locator {
    return this.field(label).locator("[data-slot='form-message']")
  }

  textInput(label: string): Locator {
    return this.field(label).locator("input, textarea").first()
  }

  async fillText(label: string, value: string) {
    await this.textInput(label).fill(value)
  }

  /** Radix select (SEX, BREED): open the combobox, then choose the option by its visible name. */
  async choose(label: string, option: string) {
    await this.field(label).getByRole("combobox").click()
    await this.page.getByRole("option", { name: option, exact: true }).click()
  }

  /** Country popover: search, then click the matching country. */
  async chooseCountry(country: string) {
    await this.field("COUNTRY OF ORIGIN").getByRole("button").click()
    await this.page.getByPlaceholder("Search country...").fill(country)
    await this.page.getByRole("button", { name: new RegExp(`^${escapeRegExp(country)}\\b`) }).first().click()
  }

  /** Calendar popover: pick year and month in the caption dropdowns, then the day. `iso` is yyyy-MM-dd. */
  async chooseDateOfBirth(iso: string) {
    await pickDate(this.page, this.field("DATE OF BIRTH").getByRole("button"), iso)
  }

  /** Fills every field of the form with `horse` (the happy path). */
  async fillAll(horse: Omit<TestHorse, "horseId" | "avatarUrl">) {
    await this.fillText("HORSE NAME", horse.horseName)
    await this.choose("SEX", capitalize(horse.sex))
    await this.choose("BREED", horse.breed)
    await this.chooseDateOfBirth(horse.dateOfBirth)
    await this.fillText("COLOR", horse.color)
    await this.chooseCountry(horse.countryOfOrigin)
    await this.fillText("WEIGHT (KG)", String(horse.weightKg))
    await this.fillText("HEIGHT (CM)", String(horse.heightCm))
    await this.fillText("PASSPORT NUMBER", horse.passportNumber)
    await this.fillText("MICROCHIP NUMBER", horse.microchipNumber)
    await this.fillText("IDENTIFICATION NOTES", horse.identificationNotes)
  }
}

/**
 * Operates the project's DatePicker (react-day-picker with month/year dropdowns).
 * Shared by the horse form and the booking form.
 */
export async function pickDate(page: Page, trigger: Locator, iso: string) {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number]
  await trigger.click()
  const calendar = page.locator("[data-slot='calendar']")
  await calendar.waitFor()
  await calendar.locator("select").nth(1).selectOption(String(year))
  await calendar.locator("select").nth(0).selectOption(String(month - 1))
  // `data-day` holds the cell's date as `toLocaleDateString()` (en-US in this suite), which also tells the days of the
  // neighbouring months shown in the grid apart from the day of the chosen month.
  await calendar.locator(`button[data-day="${month}/${day}/${year}"]`).click()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function capitalize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

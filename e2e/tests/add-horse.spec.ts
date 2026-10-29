import { HorseFormPage } from "../pages/horse-form.page"
import { expect, test } from "../support/fixtures"
import { buildHorse, pagedValue, type TestHorse } from "../support/test-data"
import { toast } from "../support/ui"

/**
 * Feature 2 - Add a horse (`/my-horses/new`).
 *
 * The user is already signed in (session stored by `auth.setup.ts`). The backend is mocked: the happy-path test uses a
 * small STATEFUL fake (POST stores the horse, GET lists it) so the whole journey "create, then see it in my list" can
 * be verified end to end through the real UI.
 */

const HORSES_ENDPOINT = "/horses"

/** What the customer types into the form (the id and the avatar are assigned by the backend). */
const NEW_HORSE = {
  horseName: "Golden Thunder",
  sex: "MALE",
  breed: "Thoroughbred",
  dateOfBirth: "2018-04-12",
  color: "Bay",
  countryOfOrigin: "Ireland",
  weightKg: 520.5,
  heightCm: 165.2,
  passportNumber: "IE123456789ABCD",
  microchipNumber: "981020000123456",
  identificationNotes: "White star on forehead; calm during transport.",
} satisfies Omit<TestHorse, "horseId" | "avatarUrl">

test.describe("Add horse", () => {
  let form: HorseFormPage

  test.beforeEach(async ({ api, page }) => {
    // The list page (opened after saving or cancelling) loads the customer's horses.
    api.ok("GET", HORSES_ENDPOINT, pagedValue([]))
    form = new HorseFormPage(page)
    await form.goto()
  })

  test.describe("rendering", () => {
    test("HORSE-01 shows every field of the form and the Create / Cancel actions", async () => {
      for (const label of [
        "HORSE NAME", "SEX", "BREED", "DATE OF BIRTH", "COLOR", "COUNTRY OF ORIGIN",
        "WEIGHT (KG)", "HEIGHT (CM)", "PASSPORT NUMBER", "MICROCHIP NUMBER", "IDENTIFICATION NOTES",
      ]) {
        await expect(form.field(label), `field ${label}`).toBeVisible()
      }
      await expect(form.submit).toBeEnabled()
      await expect(form.cancel).toBeVisible()
      await expect(form.validationSummary).toBeHidden()
    })

    test("HORSE-02 the passport and microchip counters follow what is typed", async () => {
      await expect(form.field("PASSPORT NUMBER")).toContainText("0/15")

      await form.fillText("PASSPORT NUMBER", "IE12345")
      await expect(form.field("PASSPORT NUMBER")).toContainText("7/15")

      await form.fillText("MICROCHIP NUMBER", "98102")
      await expect(form.field("MICROCHIP NUMBER")).toContainText("5/15")
    })
  })

  test.describe("validation (no request leaves the browser)", () => {
    test("HORSE-03 an empty form lists every required field and sends nothing", async ({ api }) => {
      await form.submit.click()

      const required: Record<string, string> = {
        "HORSE NAME": "Horse name is required.",
        "SEX": "Sex is required.",
        "BREED": "Breed is required.",
        "DATE OF BIRTH": "Date of birth is required.",
        "COLOR": "Color is required.",
        "COUNTRY OF ORIGIN": "Country of origin is required.",
        "WEIGHT (KG)": "Weight is required.",
        "HEIGHT (CM)": "Height is required.",
        "PASSPORT NUMBER": "Passport number is required.",
        "MICROCHIP NUMBER": "Microchip number is required.",
        "IDENTIFICATION NOTES": "Identification notes are required.",
      }
      for (const [label, message] of Object.entries(required)) {
        await expect(form.fieldError(label), label).toHaveText(message)
      }
      await expect(form.validationSummary).toBeVisible()
      expect(api.calls("POST", HORSES_ENDPOINT)).toHaveLength(0)
    })

    test("HORSE-04 a name made only of spaces counts as empty", async () => {
      await form.fillText("HORSE NAME", "     ")
      await form.submit.click()

      await expect(form.fieldError("HORSE NAME")).toHaveText("Horse name is required.")
    })

    test("HORSE-05 the passport number must be 15 uppercase letters or digits", async () => {
      const rule = "Passport number must be exactly 15 uppercase letters or numbers (A-Z, 0-9)."

      await form.fillText("PASSPORT NUMBER", "ie123456789abcd") // right length, lowercase
      await form.submit.click()
      await expect(form.fieldError("PASSPORT NUMBER")).toHaveText(rule)

      await form.fillText("PASSPORT NUMBER", "IE12345") // too short
      await expect(form.fieldError("PASSPORT NUMBER")).toHaveText(rule)

      await form.fillText("PASSPORT NUMBER", "IE123456789ABCD") // valid
      await expect(form.fieldError("PASSPORT NUMBER")).toBeHidden()
    })

    test("HORSE-06 the microchip number must be exactly 15 digits", async () => {
      const rule = "Microchip number must be exactly 15 digits."

      await form.fillText("MICROCHIP NUMBER", "98102000012345A") // a letter
      await form.submit.click()
      await expect(form.fieldError("MICROCHIP NUMBER")).toHaveText(rule)

      await form.fillText("MICROCHIP NUMBER", "9810200001234") // 13 digits
      await expect(form.fieldError("MICROCHIP NUMBER")).toHaveText(rule)

      await form.fillText("MICROCHIP NUMBER", "981020000123456")
      await expect(form.fieldError("MICROCHIP NUMBER")).toBeHidden()
    })

    test("HORSE-07 weight and height must stay inside the allowed range, with one decimal at most", async () => {
      await form.fillText("WEIGHT (KG)", "10")
      await form.fillText("HEIGHT (CM)", "300")
      await form.submit.click()
      await expect(form.fieldError("WEIGHT (KG)")).toHaveText("Weight must be between 20 and 1500 kg.")
      await expect(form.fieldError("HEIGHT (CM)")).toHaveText("Height must be between 50 and 220 cm.")

      await form.fillText("WEIGHT (KG)", "520.55")
      await form.fillText("HEIGHT (CM)", "165.25")
      await expect(form.fieldError("WEIGHT (KG)")).toHaveText("Weight can have at most 1 decimal place.")
      await expect(form.fieldError("HEIGHT (CM)")).toHaveText("Height can have at most 1 decimal place.")

      await form.fillText("WEIGHT (KG)", "520.5")
      await form.fillText("HEIGHT (CM)", "165.2")
      await expect(form.fieldError("WEIGHT (KG)")).toBeHidden()
      await expect(form.fieldError("HEIGHT (CM)")).toBeHidden()
    })

    test("HORSE-08 the date of birth cannot be in the future (the clock is fixed at 29 Oct 2026)", async () => {
      await form.chooseDateOfBirth("2027-01-15")
      await form.submit.click()

      await expect(form.fieldError("DATE OF BIRTH")).toHaveText("Date of birth cannot be in the future.")
    })

    test("HORSE-09 the date of birth cannot be more than 40 years ago", async () => {
      await form.chooseDateOfBirth("1980-06-01")
      await form.submit.click()

      await expect(form.fieldError("DATE OF BIRTH")).toHaveText("Date of birth cannot be more than 40 years ago.")
    })
  })

  test.describe("saving", () => {
    test("HORSE-10 a valid horse is created, the user is told, and it appears in 'My horses'", async ({ api, page }) => {
      // Stateful fake backend: POST stores the horse, GET lists what was stored.
      const stored: TestHorse[] = []
      api.ok("POST", HORSES_ENDPOINT, (request) => {
        const horse = buildHorse({ ...(request.body as Partial<TestHorse>), horseId: "33333333-3333-4333-8333-333333333333" })
        stored.push(horse)
        return horse
      }, 201)
      api.ok("GET", HORSES_ENDPOINT, () => pagedValue(stored))

      await form.fillAll({ ...NEW_HORSE, horseName: "  Golden Thunder  " }) // surrounding spaces are typed on purpose
      await form.submit.click()

      // What the front end SENT: trimmed text, numbers as numbers, ISO date, country by name, no avatar key.
      await expect.poll(() => api.calls("POST", HORSES_ENDPOINT).length).toBe(1)
      expect(api.lastBody("POST", HORSES_ENDPOINT)).toEqual(NEW_HORSE)

      // What the user SEES: confirmation, the list page, and the new horse in it.
      await expect(toast(page, "Horse created successfully.")).toBeVisible()
      await expect(page).toHaveURL(/\/my-horses$/)
      await expect(page.getByRole("heading", { name: "MY HORSES" })).toBeVisible()
      await expect(page.getByText("Golden Thunder")).toBeVisible()
      await expect(page.getByText("981020000123456")).toBeVisible()
    })

    test("HORSE-11 while saving, the button shows progress and cannot be pressed twice", async ({ api }) => {
      api.ok("POST", HORSES_ENDPOINT, buildHorse(), 201, 1_500)

      await form.fillAll(NEW_HORSE)
      await form.submit.click()

      await expect(form.submit).toHaveText("Saving...")
      await expect(form.submit).toBeDisabled()
      await expect.poll(() => api.calls("POST", HORSES_ENDPOINT).length).toBe(1)
    })

    test("HORSE-12 Cancel goes back to 'My horses' without sending anything", async ({ api, page }) => {
      await form.fillText("HORSE NAME", "Unsaved Horse")
      await form.cancel.click()

      await expect(page).toHaveURL(/\/my-horses$/)
      expect(api.calls("POST", HORSES_ENDPOINT)).toHaveLength(0)
    })
  })

  test.describe("server errors (the typed data is kept so the user can fix it and retry)", () => {
    test("HORSE-13 a duplicate horse (409) is explained", async ({ api, page }) => {
      api.fail("POST", HORSES_ENDPOINT, 409, { errorCode: "CONFLICT", message: "Duplicate" })

      await form.fillAll(NEW_HORSE)
      await form.submit.click()

      await expect(toast(page, "A horse with the same name or microchip number already exists.")).toBeVisible()
      await expect(page).toHaveURL(/\/my-horses\/new$/)
      await expect(form.textInput("HORSE NAME")).toHaveValue("Golden Thunder")
      await expect(form.submit).toBeEnabled()
    })

    test("HORSE-14 a validation error (400) shows the server's own messages", async ({ api, page }) => {
      api.fail("POST", HORSES_ENDPOINT, 400, {
        errorCode: "VALIDATION_ERROR",
        message: "Validation failed",
        errors: [{ field: "PassportNumber", message: "Passport number is already registered." }],
      })

      await form.fillAll(NEW_HORSE)
      await form.submit.click()

      await expect(toast(page, "Passport number is already registered.")).toBeVisible()
    })

    test("HORSE-15 a server failure (500) gets a retry-later message", async ({ api, page }) => {
      api.fail("POST", HORSES_ENDPOINT, 500, { errorCode: "INTERNAL_ERROR" })

      await form.fillAll(NEW_HORSE)
      await form.submit.click()

      await expect(toast(page, "The server could not complete this horse request. Please try again later.")).toBeVisible()
      await expect(page).toHaveURL(/\/my-horses\/new$/)
    })

    test("HORSE-16 an unreachable server gets the generic message", async ({ api, page }) => {
      api.networkError("POST", HORSES_ENDPOINT)

      await form.fillAll(NEW_HORSE)
      await form.submit.click()

      await expect(toast(page, "Unable to create horse. Please try again.")).toBeVisible()
    })
  })
})

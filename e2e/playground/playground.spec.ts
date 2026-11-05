import { expect, test } from "../support/fixtures"
import { buildHorse, OWNED_HORSES, pagedValue } from "../support/test-data"

/**
 * PLAYGROUND for live demos: `pnpm test:e2e:playground`.
 *
 * Opens a visible Chrome, already signed in as the mocked customer, with the same fake backend as the `mock` suite, then
 * PAUSES. The Playwright Inspector appears: press "Record" there and click around the application; the generated code
 * shows up in the Inspector and can be copied into a real spec. Nothing touches the real backend or database.
 *
 * The Inspector only records ACTIONS (clicks, typing). To see WHY something fails, read this terminal: every backend call
 * the page makes that has no fake answer is printed as "NOT MOCKED", and so are browser console errors and failed requests.
 *
 * It only exists in the `playground` project (see playwright.config.ts), so `pnpm test:e2e` never runs it.
 */
test("PLAYGROUND record new steps on mocked data", async ({ api, page }) => {
  // Anything the application asks that is not declared below gets an empty page, and is reported in the terminal.
  api.tolerateUndeclared((request) => {
    console.log(`[playground] NOT MOCKED: ${request.method} ${request.path} (answered with an empty list; add api.ok(...) to this file)`)
    return { body: { isSuccess: true, code: 200, message: "Success", value: pagedValue([]) } }
  })

  api.ok("GET", "/horses", pagedValue(OWNED_HORSES))
  api.ok("POST", "/horses", (request) => buildHorse({ ...(request.body as object) }), 201)

  // Horse avatar upload: 1) ask the backend for a signed slot, 2) send the file to the image host (faked), 3) confirm.
  api.ok("POST", "/uploads/signature", {
    publicId: "horses/playground-avatar",
    upload: { url: "https://api.cloudinary.com/v1_1/e2e/image/upload", params: { signature: "e2e", timestamp: "1" } },
  })
  api.ok("POST", "/uploads/confirm", null)

  page.on("console", (message) => {
    if (message.type() === "error") console.log(`[playground] browser console error: ${message.text()}`)
  })
  page.on("pageerror", (error) => console.log(`[playground] page error: ${error.message}`))
  page.on("requestfailed", (request) => console.log(`[playground] request failed: ${request.method()} ${request.url()}`))
  // Every backend call with its answer, so "I clicked and nothing happened" shows whether a request was sent at all.
  page.on("response", (response) => {
    if (!response.url().includes("/api/v1/")) return
    const path = new URL(response.url()).pathname.replace("/api/v1", "")
    console.log(`[playground] ${response.request().method()} ${path} -> ${response.status()}`)
  })

  await page.goto("/")
  await expect(page).not.toHaveURL(/\/login/)

  // Inspector opens here. Close its window (or press Resume) to end the session.
  await page.pause()
})

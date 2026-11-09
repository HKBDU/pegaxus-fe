/**
 * TEST: inspect-to-phase-1-personnel
 * LUỒNG: Tạo Booking (Customer) -> Manager duyệt booking & tạo Transport Plan -> Tạo Invoices -> Gán nhân sự Phase 1.
 *
 * CÁCH CHẠY (PowerShell):
 * 1. Chạy có tham số ngày khởi hành & kết thúc (DD/MM/YYYY):
 *    $env:START_DATE="22/01/2027"; $env:END_DATE="26/01/2027"; pnpm run test:e2e:inspect
 *
 * 2. Chạy mặc định:
 *    pnpm run test:e2e:inspect
 *
 * 3. Chạy qua Playwright CLI trực tiếp:
 *    $env:START_DATE="22/01/2027"; $env:END_DATE="26/01/2027"; pnpm exec playwright test e2e/real-api/inspect-to-phase-1-personnel.spec.ts --config=playwright.inspect.config.ts
 */

import { test, type Locator, type Page } from "@playwright/test"
import { format } from "date-fns"

/**
 * Parses DD/MM/YYYY into a Date object.
 */
function parseDateInput(input: string): Date {
  const parts = input.split("/").map((p) => p.trim())
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: "${input}". Please use DD/MM/YYYY (e.g. 12/01/2027)`)
  }
  const d = Number(parts[0])
  const m = Number(parts[1])
  const y = Number(parts[2])
  if (isNaN(d) || isNaN(m) || isNaN(y)) {
    throw new Error(`Invalid numbers in date: "${input}". Expected DD/MM/YYYY`)
  }
  return new Date(y, m - 1, d)
}

/**
 * Resolves start and end dates from environment variables or CLI arguments.
 * Priority:
 *  1. Environment variables: START_DATE / END_DATE (or start / end)
 *  2. Process CLI arguments matching DD/MM/YYYY (e.g. -- 12/01/2027 16/01/2027)
 *  3. Default fallback: 12/01/2027 and 16/01/2027
 */
function getStartAndEndDates(): { startDate: Date; endDate: Date } {
  let startRaw = process.env.START_DATE || process.env.start
  let endRaw = process.env.END_DATE || process.env.end

  if (!startRaw || !endRaw) {
    const dateArgs = process.argv.filter((arg) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(arg))
    if (dateArgs.length >= 2) {
      startRaw = startRaw ?? dateArgs[0]
      endRaw = endRaw ?? dateArgs[1]
    }
  }

  const startStr = startRaw ?? "12/01/2027"
  const endStr = endRaw ?? "16/01/2027"

  return {
    startDate: parseDateInput(startStr),
    endDate: parseDateInput(endStr),
  }
}

/**
 * Robust date selector for react-day-picker calendar popovers.
 * Handles both caption dropdowns and Month pagination buttons.
 */
async function selectDate(page: Page, trigger: Locator, date: Date) {
  await trigger.click()
  const calendar = page.locator("[data-slot='calendar']").first()
  await calendar.waitFor({ state: "visible", timeout: 8000 })

  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  // 1. If dropdown selects exist, pick year and month directly
  const selects = calendar.locator("select")
  if ((await selects.count()) >= 2) {
    await selects.nth(1).selectOption(String(year))
    await selects.nth(0).selectOption(String(month))
  }

  // 2. Prepare day button locators (by readable accessible name or by data-day attribute)
  const dayText = format(date, "EEEE, MMMM do")
  const dayTextRegex = new RegExp(dayText.replace(/([.*+?^${}()|[\]\\])/g, "\\$1"), "i")
  const dayByRole = calendar.getByRole("button", { name: dayTextRegex }).first()

  const dataDayStr = `${month + 1}/${day}/${year}`
  const dayByAttr = calendar.locator(`button[data-day="${dataDayStr}"]`).first()

  const targetDay = dayByRole.or(dayByAttr)

  // 3. Paginate forward if target month is not yet visible
  const nextMonthBtn = calendar.getByRole("button", { name: /Go to the Next Month/i })
  for (let i = 0; i < 24; i++) {
    if (await targetDay.isVisible()) {
      break
    }
    if (await nextMonthBtn.isVisible()) {
      await nextMonthBtn.click()
      await page.waitForTimeout(200)
    } else {
      break
    }
  }

  await targetDay.waitFor({ state: "visible", timeout: 10000 })
  await targetDay.click()
}

test("inspect-to-phase-1-personnel flow", async ({ page }) => {
  const { startDate, endDate } = getStartAndEndDates()
  console.log(`[inspect-to-phase-1-personnel] Start Date: ${format(startDate, "dd/MM/yyyy")} (${format(startDate, "yyyy-MM-dd")})`)
  console.log(`[inspect-to-phase-1-personnel] End Date:   ${format(endDate, "dd/MM/yyyy")} (${format(endDate, "yyyy-MM-dd")})`)

  // Dates for invoices (tomorrow and +4 days from now)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const depositDueDate = new Date()
  depositDueDate.setDate(depositDueDate.getDate() + 4)

  // Auto-dismiss "Later" profile reminder dialog whenever it appears asynchronously
  await page.addLocatorHandler(page.getByRole("button", { name: "Later" }), async (btn) => {
    await btn.click()
  })

  // 1. Sign in as Customer
  await page.goto("http://localhost:5173/")
  await page.locator("header").getByRole("link", { name: "Sign in" }).click()
  await page.getByRole("textbox", { name: "Email address" }).fill("batquyquan@gmail.com")
  await page.getByRole("textbox", { name: "Password" }).fill("pegaxusDemo@123")
  await page.getByRole("button", { name: "Sign in" }).click()

  // 2. Create Booking
  await page.getByRole("link", { name: "My Workspace" }).click()

  // Dismiss "Later" if it's already showing
  const laterBtn = page.getByRole("button", { name: "Later" })
  if (await laterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await laterBtn.click()
  }

  // Click "New request" (use .first() to handle both desktop and mobile buttons in DOM)
  const newRequestBtn = page.getByRole("button", { name: "New request" }).first()
  if (await newRequestBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await newRequestBtn.click()
  } else {
    await page.goto("http://localhost:5173/bookings/new")
  }
  await page.waitForURL(/\/bookings\/new/, { timeout: 15000 })

  // Search pickup
  await page.getByRole("textbox", { name: "Search location" }).click()
  await page.getByRole("textbox", { name: "Search location" }).fill("Zehuby 43, 286 01 SK, Czechia, Czechia")
  await page.getByRole("button", { name: "43, 286 01 Žleby, Czechia Žleby", exact: true }).click()

  // Search destination
  await page.getByRole("textbox", { name: "Search location" }).click()
  await page.getByRole("textbox", { name: "Search location" }).press("ControlOrMeta+a")
  await page.getByRole("textbox", { name: "Search location" }).fill("Ausbau 5, 19288 Alt Krenzlin, Germany, Germany")
  await page.getByRole("button", { name: "Ausbau 5, 19288 Alt Krenzlin" }).click()

  // Select dates
  await selectDate(page, page.getByRole("button", { name: "Expected departure date *" }), startDate)
  await selectDate(page, page.getByRole("button", { name: "Expected arrival date" }), endDate)

  // Notes & continue
  await page.getByRole("textbox", { name: "Notes" }).fill("A short note for trip ")
  await page.getByRole("button", { name: "Save & continue" }).click()

  // Select horses (use check() instead of double clicking cell + checkbox)
  await page.getByRole("checkbox", { name: /Select Copper Ridge/i }).check()
  await page.getByRole("checkbox", { name: /Select Starlit Meadow/i }).check()

  // Notes for horses (Label contains horseName + microchipNumber, so match with regex)
  await page.getByRole("textbox", { name: /Copper Ridge/i }).fill("Diet should be cared")
  await page.getByRole("textbox", { name: /Starlit Meadow/i }).fill("A note about water")
  await page.getByRole("button", { name: "Save & continue" }).click()

  // Wait for booking creation to complete and redirect to details page (URL is /bookings/<UUID>)
  await page.waitForURL((url) => url.pathname.startsWith("/bookings/") && url.pathname !== "/bookings/new", { timeout: 30000 })
  await page.getByRole("heading", { name: "BOOKING DETAILS" }).waitFor({ timeout: 15000 })

  // Capture booking ID so Manager can access it directly without searching
  const bookingId = page.url().split("/bookings/")[1]?.split(/[/?#]/)[0]
  console.log(`[inspect-to-phase-1-personnel] Created Booking ID: ${bookingId}`)

  // 3. Sign out Customer
  const customerAvatarBtn = page.getByRole("button", { name: /account menu/i }).first()
  if (await customerAvatarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await customerAvatarBtn.click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()
  } else {
    await page.goto("http://localhost:5173/logout")
  }
  await page.waitForURL(/\/login/, { timeout: 15000 })

  // 4. Sign in as Logistics Manager
  await page.getByRole("textbox", { name: "Email address" }).fill("diechahien@gmail.com")
  await page.getByRole("textbox", { name: "Password" }).fill("pegaxusDemo@123")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 })

  // 5. Direct access to Booking & Approve
  if (bookingId) {
    await page.goto(`http://localhost:5173/admin/transport-requests/${bookingId}`)
  } else {
    await page.goto("http://localhost:5173/admin/transport-requests")
    await page.getByRole("button", { name: /^Actions for (REQ|BK)-/i }).first().click()
    await page.getByRole("menuitem", { name: "View details" }).click()
  }

  await page.getByRole("button", { name: "Approve", exact: true }).click()
  await page.getByRole("button", { name: "Approve booking" }).click()

  // 6. Create Transport Plan (wait for action to load and become visible)
  const createPlanBtn = page.getByRole("button", { name: "Create Transport Plan" })
  await createPlanBtn.waitFor({ state: "visible", timeout: 20000 })
  await createPlanBtn.click()

  await selectDate(page, page.getByRole("button", { name: "Planned Start *" }), startDate)
  await page.getByRole("textbox", { name: "Planned Start time" }).fill("12:00")
  await selectDate(page, page.getByRole("button", { name: "Planned End *" }), endDate)
  await page.getByRole("textbox", { name: "Planning Note" }).fill("This is a plan note ")
  await page.getByRole("button", { name: "Save Transport Plan" }).click()

  // Wait for plan save to finish and Create Invoice button to appear
  const createInvoiceBtn = page.getByRole("button", { name: "Create Invoice" })
  await createInvoiceBtn.waitFor({ state: "visible", timeout: 15000 })

  // 7. Create Quotation Invoice & Issue
  await createInvoiceBtn.click()
  // Open Select dropdown for Invoice type
  await page.locator("#invoice-type").click()
  await page.getByRole("option", { name: /Quotation/i }).click()

  await selectDate(page, page.getByRole("button", { name: "Valid Until *" }), tomorrow)
  await page.getByRole("textbox", { name: "Notes" }).fill("A note for quotation invoice")
  await page.getByRole("button", { name: "Create Invoice" }).click()
  await page.getByRole("button", { name: "Issue Invoice" }).click()

  // 8. Create Deposit Invoice, Issue & Record Payment
  await page.getByRole("link", { name: "Create another invoice" }).click()
  // Open Select dropdown for Invoice type
  await page.locator("#invoice-type").click()
  await page.getByRole("option", { name: /Deposit/i }).click()

  await selectDate(page, page.getByRole("button", { name: "Due Date *" }), depositDueDate)
  await page.getByRole("textbox", { name: "Notes" }).fill("Note for a deposit invoice")
  await page.getByRole("button", { name: "Create Invoice" }).click()
  await page.getByRole("button", { name: "Issue Invoice" }).click()
  await page.getByRole("button", { name: "Record payment" }).click()
  await page.getByRole("button", { name: "Confirm payment" }).click()

  // 9. Assign Personnel for Phase 1
  await page.getByRole("link", { name: "Transport Plans" }).click()
  await page.waitForURL(/\/transport-plans/, { timeout: 15000 })

  // Open the newly created Transport Plan (via link in the first row)
  await page.getByRole("link", { name: /^TP-/i }).first().click()
  await page.waitForURL(/\/transport-plans\/[0-9a-f-]{36}/i, { timeout: 15000 })

  // Navigate to Personnel tab (via Manage Personnel button or Personnel tab)
  const managePersonnelLink = page.getByRole("link", { name: "Manage Personnel" })
  if (await managePersonnelLink.isVisible({ timeout: 4000 }).catch(() => false)) {
    await managePersonnelLink.click()
  } else {
    await page.getByRole("tab", { name: /Personnel/i }).click()
  }

  // Click Assign Phase 1 button
  const assignPhase1Btn = page.getByRole("button", { name: /Assign Phase 1/i })
  await assignPhase1Btn.waitFor({ state: "visible", timeout: 15000 })
  await assignPhase1Btn.click()

  // Wait for Phase 1 assignment dialog to open
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10000 })

  // Open Transport Specialist dropdown and pick employee
  await page.getByRole("combobox", { name: /Transport Specialist/i }).click()
  const tsOption = page.getByRole("option", { name: /Võ Gia Huy/i })
  if (await tsOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tsOption.click()
  } else {
    await page.getByRole("option").first().click()
  }

  // Open Route Coordinator dropdown and pick employee
  await page.getByRole("combobox", { name: /Route Coordinator/i }).click()
  const rcOption = page.getByRole("option", { name: /Nguyễn Hu/i })
  if (await rcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await rcOption.click()
  } else {
    await page.getByRole("option").first().click()
  }

  await page.getByRole("button", { name: /Confirm Phase 1 assignment/i }).click()
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }).catch(() => {})

  // 10. Sign out Manager
  const managerAvatarBtn = page.getByRole("button", { name: /account menu/i }).first()
  if (await managerAvatarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await managerAvatarBtn.click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()
  } else {
    await page.goto("http://localhost:5173/logout")
  }
})

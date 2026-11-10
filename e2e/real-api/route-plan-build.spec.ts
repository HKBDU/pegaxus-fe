/**
 * TEST: route-plan-build
 * LUỒNG: Fleet Route Coordinator (hoanguyen) -> Tạo Primary Route & Contingency (Backup) Route -> Gửi duyệt pháp lý (Legal Review).
 *
 * CÁCH CHẠY (PowerShell):
 * 1. Chạy tự động với Transport Plan mới nhất:
 *    pnpm run test:e2e:route-plan
 *
 * 2. Chạy với mã Transport Plan cụ thể:
 *    $env:TRANSPORT_PLAN_CODE="TP-20261109-001"; pnpm run test:e2e:route-plan
 *
 * 3. Chạy qua Playwright CLI trực tiếp:
 *    pnpm exec playwright test e2e/real-api/route-plan-build.spec.ts --config=playwright.route-plan.config.ts
 */

import { test, type Page } from "@playwright/test"

/**
 * Escapes characters for safe RegExp construction.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Extracts a concise search keyword from a full address/location name.
 * e.g. "43, 286 01 Žleby, Czechia" -> "43"
 *      "Ausbau 5, 19288 Alt Krenzlin, Germany" -> "Ausbau 5"
 */
function extractSearchKeyword(locationText: string): string {
  const trimmed = locationText.trim()
  if (!trimmed) return ""

  const firstPart = trimmed.split(/[,–-]/)[0]?.trim() || trimmed
  if (firstPart.length > 0 && firstPart.length <= 25) {
    return firstPart
  }
  const words = firstPart.split(/\s+/).filter(Boolean)
  return words.slice(0, 2).join(" ")
}

/**
 * Resolves the target Transport Plan Code from environment variables or CLI arguments.
 * Priority:
 *  1. Environment variables: TRANSPORT_PLAN_CODE / PLAN_CODE / TP / tp
 *  2. Process CLI argument matching TP-* pattern
 *  3. Fallback: null (auto-picks the first available approved transport plan)
 */
function getTargetTransportPlanCode(): string | null {
  const envVal =
    process.env.TRANSPORT_PLAN_CODE ||
    process.env.PLAN_CODE ||
    process.env.transport_plan_code ||
    process.env.plan_code ||
    process.env.TP ||
    process.env.tp

  if (envVal?.trim()) {
    return envVal.trim()
  }

  const cliArg = process.argv.find((arg) => /^TP-[A-Za-z0-9_-]+/i.test(arg.trim()))
  if (cliArg) {
    return cliArg.trim()
  }

  return null
}

/**
 * Directly picks the Origin (Start) and Destination (End) markers on the map.
 *
 * Uses `data-marker-variant` (added to LocationMarker) to target exactly one
 * start and one end marker, immune to name collisions.
 *
 * Uses `dispatchEvent("click")` instead of Playwright `.click()` to avoid
 * triggering mouseenter → hover popup → map re-render → marker jitter.
 * The React onClick handler fires normally via dispatchEvent.
 */
async function pickEndpointsOnMap(page: Page, originName: string, destName: string) {
  console.log(`[route-plan-build] Selecting endpoints on map — Origin: "${originName}", Dest: "${destName}"`)

  // Primary: variant + exact aria-label (most precise)
  const originMarker = page.locator(`button[data-marker-variant="start"][aria-label="Show details for ${originName}"]`)
  const destMarker   = page.locator(`button[data-marker-variant="end"][aria-label="Show details for ${destName}"]`)

  // Fallback: variant only (always unique — exactly one start, one end per map)
  const originFallback = page.locator(`button[data-marker-variant="start"]`)
  const destFallback   = page.locator(`button[data-marker-variant="end"]`)

  // Wait for start marker to be attached (MapLibre may take a moment to render)
  await originMarker
    .waitFor({ state: "attached", timeout: 15000 })
    .catch(() => originFallback.waitFor({ state: "attached", timeout: 10000 }))

  // Allow MapLibre bounds-fitting animation to settle before interacting
  await page.waitForTimeout(1500)

  // 1. Click Origin via dispatchEvent — skips mouse-move/hover, no popup, no jitter
  const originBtn = (await originMarker.count().then(n => n > 0).catch(() => false))
    ? originMarker
    : originFallback
  await originBtn.dispatchEvent("click")

  // Verify Origin registered as source
  const sourcePrompt = page.locator("text=/Source selected:.*Please choose a destination/i")
  try {
    await sourcePrompt.waitFor({ state: "visible", timeout: 5000 })
  } catch {
    console.log("[route-plan-build] Source not set — retrying origin click...")
    await originBtn.dispatchEvent("click")
    await sourcePrompt.waitFor({ state: "visible", timeout: 8000 })
  }

  // 2. Click Destination via dispatchEvent
  const destBtn = (await destMarker.count().then(n => n > 0).catch(() => false))
    ? destMarker
    : destFallback
  await destBtn.dispatchEvent("click")

  // Wait for segment or BCP proposal to appear
  const bcpConfirmBtn = page.getByRole("button", { name: /Confirm & Auto-Split Route/i })
  const segmentCard = page.locator("[data-slot='card']", { hasText: /Segment/i }).first()
  try {
    await Promise.race([
      bcpConfirmBtn.waitFor({ state: "visible", timeout: 6000 }),
      segmentCard.waitFor({ state: "visible", timeout: 6000 }),
    ])
  } catch {
    console.log("[route-plan-build] No segment/BCP yet — retrying destination click...")
    await destBtn.dispatchEvent("click")
  }

  // 3. If BCP auto-split proposal appears, confirm it
  if (await bcpConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("[route-plan-build] Cross-border BCP detected, confirming auto-split...")
    await bcpConfirmBtn.click()
    await bcpConfirmBtn.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {})
  }
}

test("route-plan-build flow", async ({ page }) => {
  const targetPlanCode = getTargetTransportPlanCode()
  console.log(`[route-plan-build] Target Transport Plan parameter: ${targetPlanCode ?? "(auto-detect latest)"}`)

  // 1. Sign in as Fleet Route Coordinator
  await page.goto("/")
  await page.locator("header").getByRole("link", { name: "Sign in" }).click()
  await page.getByRole("textbox", { name: "Email address" }).fill("hoanguyen91011@gmail.com")
  await page.getByRole("textbox", { name: "Password" }).fill("pegaxusDemo@123")
  await page.getByRole("button", { name: "Sign in" }).click()

  // 2. Go to Approved Bookings
  await page.getByRole("link", { name: "Approved Bookings" }).click()
  await page.waitForURL(/\/admin\/approved-bookings/, { timeout: 15000 })
  await page.locator("table tbody tr").first().waitFor({ state: "visible", timeout: 15000 })

  // 3. Locate the target row for the given Transport Plan Code (or first row).
  //    The latest TP is always at the top of the table — no search/filter needed.
  const targetRow = targetPlanCode
    ? page.locator("tbody tr", { has: page.getByRole("link", { name: targetPlanCode, exact: false }) }).first()
    : page.locator("tbody tr", { has: page.getByRole("button", { name: /^Actions for (REQ|BK)-/i }) }).first()

  await targetRow.waitFor({ state: "visible", timeout: 15000 })

  // Extract Plan Code and Requested Route from the table row
  const planCodeLink = targetRow.locator("td").first().getByRole("link")
  const resolvedPlanCode = (await planCodeLink.textContent())?.trim() ?? targetPlanCode ?? "Unknown TP"
  console.log(`[route-plan-build] Selected Transport Plan: ${resolvedPlanCode}`)

  // 4. Open Action menu on that target row and click "Create Primary Route"
  const bookingActionBtn = targetRow.getByRole("button", { name: /^Actions for (REQ|BK)-/i }).first()
  await bookingActionBtn.click()

  await page.getByRole("menuitem", { name: "Create Primary Route" }).click()
  await page.waitForURL(/\/route-plans\/new\//, { timeout: 15000 })

  // 5. Extract Origin & Destination dynamically from Step 0 (RoutePlanEndpointsStep)
  const originCard = page.locator("[data-slot='card']", {
    has: page.locator("[data-slot='card-title']", { hasText: /^Origin$/i }),
  })
  const destCard = page.locator("[data-slot='card']", {
    has: page.locator("[data-slot='card-title']", { hasText: /^Destination$/i }),
  })

  await originCard.waitFor({ state: "visible", timeout: 10000 })
  await destCard.waitFor({ state: "visible", timeout: 10000 })

  const originName = (await originCard.locator("p.text-lg").textContent())?.trim() ?? "43"
  const originSub = (await originCard.locator("p.text-muted-foreground").textContent())?.trim() ?? ""

  const destName = (await destCard.locator("p.text-lg").textContent())?.trim() ?? "Ausbau 5"
  const destSub = (await destCard.locator("p.text-muted-foreground").textContent())?.trim() ?? ""

  const originKeyword = extractSearchKeyword(originName) || "43"
  const destKeyword = extractSearchKeyword(destName) || "aus"

  console.log(`[route-plan-build] Extracted Origin: "${originName}" (${originSub}) -> Search keyword: "${originKeyword}"`)
  console.log(`[route-plan-build] Extracted Destination: "${destName}" (${destSub}) -> Search keyword: "${destKeyword}"`)

  // Step 0 -> Click Next to enter Route Segments Builder
  await page.getByRole("button", { name: "Next" }).click()

  // 6. Step 1 (Route Segments Builder): Pick Pickup & Destination locations directly on the map
  // Pass the FULL location name so pickEndpointsOnMap matches the exact aria-label
  // ("Show details for <name>") — avoids selecting the wrong marker when multiple
  // locations share the same short prefix (e.g. two "Ausbau 5" entries).
  await pickEndpointsOnMap(page, originName, destName)

  // Wait for route segment calculation & assign vehicle
  const selectVehicleBtn = page.getByRole("button", { name: /Select vehicle/i }).first()
  await selectVehicleBtn.waitFor({ state: "visible", timeout: 20000 })

  while (await page.getByRole("button", { name: /Select vehicle/i }).first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByRole("button", { name: /Select vehicle/i }).first().click()
    const vehicleDialog = page.getByRole("dialog", { name: /Select vehicles/i })
    await vehicleDialog.waitFor({ state: "visible", timeout: 5000 })
    const targetCheckbox = vehicleDialog.getByRole("checkbox", { name: /Mercedes-Benz Actros Horse/i })
    if (await targetCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await targetCheckbox.check()
    } else {
      await vehicleDialog.getByRole("checkbox").first().check()
    }
    await vehicleDialog.getByRole("button", { name: "Confirm vehicles" }).click()
    await vehicleDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {})

    // Handle "Vehicle country differs from departure" confirmation if prompted
    const continueSelectingBtn = page.getByRole("button", { name: "Continue selecting" })
    if (await continueSelectingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueSelectingBtn.click()
      await continueSelectingBtn.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {})
    }
  }

  // Set rest time
  const restInputs = page.getByRole("spinbutton", { name: "Rest Time (Minutes)" })
  const restCount = await restInputs.count()
  for (let i = 0; i < restCount; i++) {
    await restInputs.nth(i).fill(i === 0 ? "15" : "30")
  }

  // 7. Step 2 (Save / Summary) -> Save Draft
  await page.getByRole("button", { name: "Next" }).click()
  const saveDraftBtn = page.getByRole("button", { name: "Save Draft" })
  await saveDraftBtn.waitFor({ state: "visible", timeout: 10000 })
  await saveDraftBtn.click()
  await page.waitForURL(/\/route-plans/, { timeout: 20000 })
  // Backend needs ~15s to fully commit the saved route plan before subsequent steps
  await page.waitForTimeout(15000)

  // 8. Create Contingency / Backup Route
  await page.goto("http://localhost:5173/admin/approved-bookings")
  await page.waitForURL(/\/admin\/approved-bookings/, { timeout: 15000 })

  // The resolved TP row is always visible at the top — no search/filter needed
  const backupTargetRow = page.locator("tbody tr", { hasText: resolvedPlanCode }).first()
  await backupTargetRow.waitFor({ state: "visible", timeout: 15000 })

  const backupActionBtn = backupTargetRow.getByRole("button", { name: /^Actions for (REQ|BK)-/i }).first()
  await backupActionBtn.click()
  await page.getByRole("menuitem", { name: "View Transport" }).click()
  await page.waitForURL(/\/admin\/approved-bookings\/[0-9a-f-]{36}/i, { timeout: 15000 })

  const addBackupLink = page.getByRole("link", { name: "Add Backup Route" })
  await addBackupLink.waitFor({ state: "visible", timeout: 15000 })
  await addBackupLink.click()
  await page.waitForURL(/\/route-plans\/new\//, { timeout: 15000 })

  // Step 0 -> Click Next
  await page.getByRole("button", { name: "Next" }).click()

  // Step 1: Select endpoints for backup route directly on the map
  await pickEndpointsOnMap(page, originName, destName)

  // Assign vehicle if prompted
  if (await page.getByRole("button", { name: /Select vehicle/i }).first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.getByRole("button", { name: /Select vehicle/i }).first().click()
    const vehicleDialog = page.getByRole("dialog", { name: /Select vehicles/i })
    await vehicleDialog.waitFor({ state: "visible", timeout: 5000 })
    const targetCheckbox = vehicleDialog.getByRole("checkbox", { name: /Mercedes-Benz Actros Horse/i })
    if (await targetCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await targetCheckbox.check()
    } else {
      await vehicleDialog.getByRole("checkbox").first().check()
    }
    await vehicleDialog.getByRole("button", { name: "Confirm vehicles" }).click()
    await vehicleDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {})

    const continueSelectingBtn = page.getByRole("button", { name: "Continue selecting" })
    if (await continueSelectingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueSelectingBtn.click()
      await continueSelectingBtn.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {})
    }
  }

  // Go to Step 2
  await page.getByRole("button", { name: "Next" }).click()

  // Fill backup reason
  const backupReasonBox = page.getByRole("textbox", { name: /Backup reason/i })
  await backupReasonBox.waitFor({ state: "visible", timeout: 10000 })
  await backupReasonBox.fill(`Contingency backup route for transport plan ${resolvedPlanCode} ensuring equine safety.`)

  // Save Draft
  await page.getByRole("button", { name: "Save Draft" }).click()
  await page.waitForURL(/\/route-plans/, { timeout: 20000 })
  // Backend needs ~15s to fully commit the saved backup route before subsequent steps
  await page.waitForTimeout(15000)

  // 9. Submit Primary & Backup Routes for Legal Review
  await page.goto("http://localhost:5173/admin/approved-bookings")
  await page.waitForURL(/\/admin\/approved-bookings/, { timeout: 15000 })

  // The resolved TP row is always visible at the top — no search/filter needed
  const reviewTargetRow = page.locator("tbody tr", { hasText: resolvedPlanCode }).first()
  await reviewTargetRow.waitFor({ state: "visible", timeout: 15000 })

  const reviewActionBtn = reviewTargetRow.getByRole("button", { name: /^Actions for (REQ|BK)-/i }).first()
  await reviewActionBtn.click()
  await page.getByRole("menuitem", { name: "View Route Details" }).click()
  await page.waitForURL(/\/route-plans\/[0-9a-f-]{36}/i, { timeout: 15000 })

  // Submit Primary Route for legal review
  const submitPrimaryBtn = page.getByRole("button", { name: /Submit for legal review/i })
  if (await submitPrimaryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await submitPrimaryBtn.click()
    const confirmSubmitBtn = page.getByRole("button", { name: "Submit", exact: true })
    await confirmSubmitBtn.waitFor({ state: "visible", timeout: 5000 })
    await confirmSubmitBtn.click()
    await page.waitForTimeout(1500)
  }

  // Switch to Contingency tab to submit Backup Route
  const contingencyTab = page.getByRole("tab", { name: /Contingency/i })
  if (await contingencyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await contingencyTab.click()
    const viewRoutePlanLink = page.getByRole("link", { name: /View Route Plan/i }).first()
    if (await viewRoutePlanLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewRoutePlanLink.click()
      await page.waitForURL(/\/route-plans\/[0-9a-f-]{36}/i, { timeout: 15000 })

      const submitBackupBtn = page.getByRole("button", { name: /Submit for legal review/i })
      if (await submitBackupBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBackupBtn.click()
        const confirmSubmitBtn = page.getByRole("button", { name: "Submit", exact: true })
        await confirmSubmitBtn.waitFor({ state: "visible", timeout: 5000 })
        await confirmSubmitBtn.click()
        await page.waitForTimeout(1500)
      }
    }
  }

  // 10. Sign out cleanly
  const coordinatorAvatarBtn = page.getByRole("button", { name: /account menu/i }).first()
  if (await coordinatorAvatarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await coordinatorAvatarBtn.click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()
  } else {
    await page.goto("http://localhost:5173/logout")
  }
})

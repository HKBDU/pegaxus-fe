import type { Locator, Page } from "@playwright/test"

/** A Sonner toast (the application's notification pop-up) whose text contains `text`. */
export function toast(page: Page, text: string | RegExp): Locator {
  return page.locator("[data-sonner-toast]").filter({ hasText: text })
}

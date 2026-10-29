import type { Locator, Page } from "@playwright/test"

/**
 * Page Object for `/login`.
 *
 * A page object hides HOW the screen is operated (locators, click order) behind WHAT a user does
 * (`signIn`, `toggleVisibility`). When the markup changes only this file changes, not every spec.
 * Locators are role/label based, the way a user (or a screen reader) finds the controls.
 */
export class LoginPage {
  readonly heading: Locator
  readonly email: Locator
  readonly password: Locator
  readonly submit: Locator
  readonly visibilityToggle: Locator
  readonly signUpLink: Locator
  readonly forgotPasswordLink: Locator

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Sign in" })
    this.email = page.getByLabel("Email address")
    // exact: the visibility button is named "Show password" and would otherwise match as well.
    this.password = page.getByLabel("Password", { exact: true })
    this.submit = page.getByRole("button", { name: /^(Sign in|Signing in|Please wait)/ })
    this.visibilityToggle = page.getByRole("button", { name: /^(Show|Hide) password$/ })
    this.signUpLink = page.getByRole("link", { name: "Sign up" })
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot password?" })
  }

  async goto() {
    await this.page.goto("/login")
    await this.heading.waitFor()
  }

  async fill(email: string, password: string) {
    await this.email.fill(email)
    await this.password.fill(password)
  }

  async signIn(email: string, password: string) {
    await this.fill(email, password)
    await this.submit.click()
  }

  /** Text of a field error such as "Email is required." (react-hook-form renders it under the field). */
  fieldError(message: string | RegExp) {
    return this.page.getByText(message)
  }
}

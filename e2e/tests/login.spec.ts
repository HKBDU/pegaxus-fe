import { LoginPage } from "../pages/login.page"
import { expect, test } from "../support/fixtures"
import { buildSession, CUSTOMER_CREDENTIALS, pagedValue } from "../support/test-data"
import { toast } from "../support/ui"

/**
 * Feature 1 - Login (`/login`).
 *
 * Every spec here starts SIGNED OUT: the project-wide session is replaced by an empty storage state.
 * The backend is mocked (see support/api-mock.ts), so each test states exactly which answer the login API gives and
 * checks what the front end did with it.
 */
test.use({ storageState: { cookies: [], origins: [] } })

const LOGIN_ENDPOINT = "/auth/login"

test.describe("Login page", () => {
  let login: LoginPage

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page)
    await login.goto()
  })

  test.describe("rendering and navigation", () => {
    test("LOGIN-01 shows the sign-in form with its links", async ({ page }) => {
      await expect(login.heading).toBeVisible()
      await expect(login.email).toBeVisible()
      await expect(login.email).toHaveAttribute("type", "email")
      await expect(login.password).toHaveAttribute("type", "password")
      await expect(login.submit).toBeEnabled()
      await expect(login.signUpLink).toHaveAttribute("href", "/register")
      await expect(login.forgotPasswordLink).toHaveAttribute("href", "/forgot-password")
      await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible()
    })

    test("LOGIN-02 the password can be revealed and hidden again", async () => {
      await login.password.fill(CUSTOMER_CREDENTIALS.password)
      await expect(login.password).toHaveAttribute("type", "password")

      await login.visibilityToggle.click()
      await expect(login.password).toHaveAttribute("type", "text")
      await expect(login.visibilityToggle).toHaveAccessibleName("Hide password")

      await login.visibilityToggle.click()
      await expect(login.password).toHaveAttribute("type", "password")
    })

    test("LOGIN-03 'Sign up' and 'Forgot password?' lead to their pages", async ({ page }) => {
      await login.signUpLink.click()
      await expect(page).toHaveURL(/\/register$/)

      await page.goBack()
      await login.forgotPasswordLink.click()
      await expect(page).toHaveURL(/\/forgot-password$/)
    })
  })

  test.describe("client-side validation (no request leaves the browser)", () => {
    test("LOGIN-04 an empty form is rejected with a message per field", async ({ api }) => {
      await login.submit.click()

      await expect(login.fieldError("Email is required.")).toBeVisible()
      await expect(login.fieldError("Password is required.")).toBeVisible()
      expect(api.calls("POST", LOGIN_ENDPOINT)).toHaveLength(0)
    })

    test("LOGIN-05 a malformed email address is rejected", async ({ api }) => {
      await login.signIn("not-an-email", CUSTOMER_CREDENTIALS.password)

      await expect(login.fieldError("Email format is invalid.")).toBeVisible()
      expect(api.calls("POST", LOGIN_ENDPOINT)).toHaveLength(0)
    })

    test("LOGIN-06 the error disappears once the field is corrected", async ({ api }) => {
      api.ok("POST", LOGIN_ENDPOINT, buildSession("CUSTOMER"))
      await login.submit.click()
      await expect(login.fieldError("Email is required.")).toBeVisible()

      await login.email.fill(CUSTOMER_CREDENTIALS.email)
      await expect(login.fieldError("Email is required.")).toBeHidden()
    })
  })

  test.describe("successful sign-in", () => {
    test("LOGIN-07 a customer is signed in, the session is stored and the home page opens", async ({ api, page }) => {
      api.ok("POST", LOGIN_ENDPOINT, buildSession("CUSTOMER"))

      await login.signIn(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password)

      // What the front end SENT: exactly the credentials, as JSON, to the right endpoint.
      await expect.poll(() => api.calls("POST", LOGIN_ENDPOINT).length).toBe(1)
      expect(api.lastBody("POST", LOGIN_ENDPOINT)).toEqual({
        email: CUSTOMER_CREDENTIALS.email,
        password: CUSTOMER_CREDENTIALS.password,
      })

      // What the user SEES: confirmation, then the customer home page.
      await expect(toast(page, "Signed in successfully.")).toBeVisible()
      await expect(page).toHaveURL(/\/$/)

      // What the application KEPT: the persisted session (zustand store in localStorage).
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("pegaxus-auth") ?? "{}"))
      expect(stored.state.accessToken).toBe("e2e-access-token-customer")
      expect(stored.state.user).toMatchObject({ role: "CUSTOMER", fullName: "Test Customer" })
      expect(stored.state.principal.roles).toEqual(["CUSTOMER"])
    })

    test("LOGIN-08 the button shows progress and is disabled while the request is running", async ({ api }) => {
      api.ok("POST", LOGIN_ENDPOINT, buildSession("CUSTOMER"), 200, 1_500)

      await login.fill(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password)
      await login.submit.click()

      await expect(login.submit).toHaveText("Signing in")
      await expect(login.submit).toBeDisabled()
      await expect(login.email).toBeDisabled()
    })

    test("LOGIN-09 a logistics manager lands in the admin area", async ({ api, page }) => {
      // The admin screens are not under test here: any API call they make gets an empty page of results.
      api.tolerateUndeclared({ body: { isSuccess: true, code: 200, message: "Success", value: pagedValue([]) } })
      api.ok("POST", LOGIN_ENDPOINT, buildSession("LOGISTICS_MANAGER"))

      await login.signIn("manager@e2e.test", CUSTOMER_CREDENTIALS.password)

      await expect(page).toHaveURL(/\/admin(\/|$)/)
    })
  })

  test.describe("failed sign-in", () => {
    test("LOGIN-10 wrong credentials: error message, stays on the page, form usable again", async ({ api, page }) => {
      api.fail("POST", LOGIN_ENDPOINT, 401, { errorCode: "INVALID_CREDENTIALS", message: "Invalid credentials" })

      await login.signIn(CUSTOMER_CREDENTIALS.email, "Wrong-Password-1")

      await expect(toast(page, "Email or password is incorrect.")).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
      await expect(login.submit).toBeEnabled()
      // Nothing was stored: the user is still signed out.
      expect(await page.evaluate(() => localStorage.getItem("pegaxus-auth"))).toBeNull()
    })

    test("LOGIN-11 an unverified account gets a specific message", async ({ api, page }) => {
      api.fail("POST", LOGIN_ENDPOINT, 403, { errorCode: "ACCOUNT_NOT_VERIFIED", message: "Not verified" })

      await login.signIn(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password)

      await expect(toast(page, "Your email has not been verified.")).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
    })

    test("LOGIN-12 a suspended account gets a specific message", async ({ api, page }) => {
      api.fail("POST", LOGIN_ENDPOINT, 403, { errorCode: "ACCOUNT_SUSPENDED", message: "Suspended" })

      await login.signIn(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password)

      await expect(toast(page, "Your account has been suspended.")).toBeVisible()
    })

    test("LOGIN-13 a field error reported by the server is shown under that field", async ({ api }) => {
      api.fail("POST", LOGIN_ENDPOINT, 400, {
        errorCode: "VALIDATION_ERROR",
        message: "Validation failed",
        errors: [{ field: "Email", message: "This email address is not registered." }],
      })

      await login.signIn("unknown@e2e.test", CUSTOMER_CREDENTIALS.password)

      await expect(login.fieldError("This email address is not registered.")).toBeVisible()
    })

    test("LOGIN-14 when the server is unreachable a generic message is shown", async ({ api, page }) => {
      api.networkError("POST", LOGIN_ENDPOINT)

      await login.signIn(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password)

      await expect(toast(page, "Failed to sign in. Please try again.")).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
    })
  })

  test.describe("access control", () => {
    test("LOGIN-15 a signed-out visitor of a private page is sent to the login page", async ({ page }) => {
      await page.goto("/my-horses")

      await expect(page).toHaveURL(/\/login$/)
      await expect(login.heading).toBeVisible()
    })

    test("LOGIN-16 after signing in the user returns to the private page they asked for", async ({ api, page }) => {
      api.ok("POST", LOGIN_ENDPOINT, buildSession("CUSTOMER"))
      api.ok("GET", "/horses", pagedValue([]))

      await page.goto("/my-horses")
      await expect(page).toHaveURL(/\/login$/)

      await login.signIn(CUSTOMER_CREDENTIALS.email, CUSTOMER_CREDENTIALS.password)

      await expect(page).toHaveURL(/\/my-horses$/)
    })
  })
})

import { test, expect } from "@playwright/test";
import { stamp } from "./support";

test.describe("Sign Up (real API)", () => {
  // Sign-up starts signed OUT without reusing any persisted session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("REAL-SIGNUP-01 new customer registration: verifies 4 password quality requirements are satisfied and navigates to verify code page", async ({ page }) => {
    // 1. Navigate to home and open the sign-up page from the header
    await page.goto("http://localhost:5173/");
    await page.locator("header").getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/register/);

    // 2. Fill in full name and a dynamic unique email address to avoid database collisions
    const uniqueEmail = `e2e-user-${stamp().toLowerCase()}@example.com`;
    await page.getByRole("textbox", { name: "Full name" }).fill("Văng Khánh Khuyên");
    await page.getByRole("textbox", { name: "Email address" }).fill(uniqueEmail);

    // 3. Enter a compliant strong password
    const validPassword = "Password@2026!";
    const passwordInput = page.getByRole("textbox", { name: "Password", exact: true });
    await passwordInput.fill(validPassword);

    // 4. Assertions: ensure all 4 password quality criteria are visually satisfied (emerald green indicators)
    const reqLength = page.locator("li", { hasText: /8[–-]128 characters/ });
    const reqUpper = page.locator("li", { hasText: "One uppercase letter" });
    const reqLower = page.locator("li", { hasText: "One lowercase letter" });
    const reqNumber = page.locator("li", { hasText: "One number" });

    await expect(reqLength).toHaveClass(/text-emerald/);
    await expect(reqUpper).toHaveClass(/text-emerald/);
    await expect(reqLower).toHaveClass(/text-emerald/);
    await expect(reqNumber).toHaveClass(/text-emerald/);

    // Verify overall strength badge reflects "Strong password"
    await expect(page.getByText("Strong password")).toBeVisible();

    // 5. Fill matching confirm password
    const confirmInput = page.getByRole("textbox", { name: "Confirm password" });
    await confirmInput.fill(validPassword);

    // Capture screenshot of completed form with all requirements satisfied
    await page.screenshot({ path: "e2e/.output/signup-complete-form.png", fullPage: true });

    // 6. Submit the sign-up request to the real backend
    const signUpButton = page.getByRole("button", { name: "Sign up" });
    await expect(signUpButton).toBeEnabled();
    await signUpButton.click();

    // 7. Assertions: verify redirection to OTP verification page
    await expect(page).toHaveURL(/\/verify-email/, { timeout: 60_000 });
    await expect(page.getByText(/OTP VERIFICATION/i)).toBeVisible();
    await expect(page.getByText(uniqueEmail)).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify code" })).toBeVisible();

    // Capture screenshot of the OTP verification page
    await page.screenshot({ path: "e2e/.output/signup-verify-code-page.png", fullPage: true });
  });
});

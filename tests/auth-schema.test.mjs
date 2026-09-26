import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const schemaUrl = new URL("../src/features/auth/schema.ts", import.meta.url);
async function schemas() {
  assert.equal(existsSync(schemaUrl), true, "Auth validation must have one schema.ts");
  return import(schemaUrl.href);
}

test("login accepts an existing password without new-password complexity", async () => {
  const { loginSchema } = await schemas();
  assert.equal(loginSchema.safeParse({ email: "user@example.com", password: "old" }).success, true);
  assert.equal(loginSchema.safeParse({ email: "invalid", password: "old" }).success, false);
  assert.equal(loginSchema.safeParse({ email: "user@example.com", password: "" }).success, false);
});

test("registration and new passwords share the required password policy", async () => {
  const { strongPasswordSchema, registerSchema, resetPasswordSchema, changePasswordSchema } = await schemas();
  for (const password of ["Short1A", "lowercase1", "UPPERCASE1", "NoNumberHere", `A1${"a".repeat(127)}`]) {
    assert.equal(strongPasswordSchema.safeParse(password).success, false);
  }
  assert.equal(strongPasswordSchema.safeParse(`A1${"a".repeat(126)}`).success, true);
  const registration = { fullName: "Test User", email: "user@example.com", password: "ValidPass1", confirmPassword: "ValidPass1" };
  assert.equal(registerSchema.safeParse(registration).success, true);
  assert.equal(registerSchema.safeParse({ ...registration, confirmPassword: "Different1" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ newPassword: "ValidPass1", confirmPassword: "Different1" }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: "old", newPassword: "ValidPass1", confirmPassword: "ValidPass1" }).success, true);
});

test("OTP and flow route state require an email and exactly six digits", async () => {
  const { verifyEmailSchema, forgotPasswordOtpSchema, emailRouteStateSchema, resetPasswordRouteStateSchema } = await schemas();
  for (const schema of [verifyEmailSchema, forgotPasswordOtpSchema]) {
    assert.equal(schema.safeParse({ otp: "123456" }).success, true);
    for (const otp of ["", "12345", "1234567", "abcdef"]) assert.equal(schema.safeParse({ otp }).success, false);
  }
  assert.equal(emailRouteStateSchema.safeParse(null).success, false);
  assert.equal(resetPasswordRouteStateSchema.safeParse({ email: "user@example.com", otp: "123456" }).success, true);
  assert.equal(resetPasswordRouteStateSchema.safeParse({ email: "user@example.com", otp: 123456 }).success, false);
});

test("Auth form pages do not define Zod schemas locally", () => {
  const pages = new URL("../src/features/auth/pages/", import.meta.url);
  for (const file of readdirSync(pages)) {
    const source = readFileSync(new URL(file, pages), "utf8");
    assert.doesNotMatch(source, /\bz\.(object|string|infer|refine|superRefine)\b/, file);
  }
});

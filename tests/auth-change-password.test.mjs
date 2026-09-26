import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const schemaPath = new URL(
  "../src/features/auth/schema.ts",
  import.meta.url,
);

test("shared password schema enforces the Auth password policy", async () => {
  assert.equal(
    existsSync(schemaPath),
    true,
    "the shared Auth password schema must exist",
  );

  const { changePasswordSchema, strongPasswordSchema: newPasswordSchema } = await import(
    `${schemaPath.href}?test=${Date.now()}`
  );

  assert.equal(newPasswordSchema.safeParse("ValidPass1").success, true);
  assert.equal(newPasswordSchema.safeParse("Short1A").success, false);
  assert.equal(newPasswordSchema.safeParse("lowercase1").success, false);
  assert.equal(newPasswordSchema.safeParse("UPPERCASE1").success, false);
  assert.equal(newPasswordSchema.safeParse("NoNumberHere").success, false);
  assert.equal(newPasswordSchema.safeParse(`A1${"a".repeat(127)}`).success, false);

  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "Current1",
      newPassword: "ValidPass1",
      confirmPassword: "ValidPass1",
    }).success,
    true,
  );
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "Current1",
      newPassword: "ValidPass1",
      confirmPassword: "Different1",
    }).success,
    false,
  );
});

test("change password uses the authenticated account endpoint", () => {
  const serviceSource = readFileSync(
    new URL("../src/features/auth/services.ts", import.meta.url),
    "utf8",
  );

  assert.match(serviceSource, /changePassword/);
  assert.match(
    serviceSource,
    /apiClient\.put\([\s\S]*["']\/accounts\/me\/password["']/,
  );
});

test("change password route reuses the existing protected route", () => {
  const routerSource = readFileSync(
    new URL("../src/app/router.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routerSource, /path:\s*["']\/change-password["']/);
  assert.match(routerSource, /<ProtectedRoute>/);
});

test("change password maps business errors to their fields", () => {
  const pageSource = readFileSync(
    new URL(
      "../src/features/auth/pages/ChangePasswordPage.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(pageSource, /CURRENT_PASSWORD_INCORRECT[\s\S]*currentPassword/);
  assert.match(pageSource, /PASSWORD_MISMATCH[\s\S]*confirmPassword/);
  assert.match(pageSource, /window\.history\.state\?\.idx/);
  assert.match(pageSource, /navigate\("\/", \{ replace: true \}\)/);
});

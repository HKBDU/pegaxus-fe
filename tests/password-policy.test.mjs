import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({ server: { middlewareMode: true, hmr: false } });
after(async () => vite.close());

test("password checklist and schema use the same rules", async () => {
  const { evaluatePasswordPolicy } = await vite.ssrLoadModule(
    "/src/features/auth/password-policy.ts",
  );
  const { strongPasswordSchema } = await vite.ssrLoadModule(
    "/src/features/auth/schema.ts",
  );

  for (const password of ["", "Password", "password1", "PASSWORD1", "Password1", "A1a".repeat(43)]) {
    const result = evaluatePasswordPolicy(password);
    assert.equal(
      strongPasswordSchema.safeParse(password).success,
      result.rules.every((rule) => rule.passed),
      `Schema and checklist disagree for password length ${password.length}`,
    );
  }
});

test("strength only reaches strong when every password rule passes", async () => {
  const { evaluatePasswordPolicy } = await vite.ssrLoadModule(
    "/src/features/auth/password-policy.ts",
  );

  assert.equal(evaluatePasswordPolicy("").strength, "none");
  assert.equal(evaluatePasswordPolicy("Password").strength, "fair");
  assert.equal(evaluatePasswordPolicy("Password1").strength, "strong");
});

export const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
} as const;

export function evaluatePasswordPolicy(value: string) {
  const rules = [
    {
      key: "length",
      label: "8–128 characters",
      passed:
        value.length >= passwordPolicy.minLength &&
        value.length <= passwordPolicy.maxLength,
    },
    {
      key: "uppercase",
      label: "One uppercase letter",
      passed: passwordPolicy.uppercase.test(value),
    },
    {
      key: "lowercase",
      label: "One lowercase letter",
      passed: passwordPolicy.lowercase.test(value),
    },
    {
      key: "number",
      label: "One number",
      passed: passwordPolicy.number.test(value),
    },
  ] as const;
  const passedCount = rules.filter((rule) => rule.passed).length;
  const strength = !value
    ? "none"
    : passedCount === rules.length
      ? "strong"
      : passedCount >= 2
        ? "fair"
        : "weak";

  return { rules, passedCount, strength };
}

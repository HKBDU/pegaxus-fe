import { CheckCircle2, Circle } from "lucide-react";
import { evaluatePasswordPolicy } from "../password-policy";

export function PasswordRequirements({ value }: { value: string }) {
  const { rules, passedCount, strength } = evaluatePasswordPolicy(value);

  return (
    <div className="space-y-1.5 text-xs text-neutral-600">
      <div className="flex items-center justify-between gap-2">
        {strength !== "none" && (
          <span aria-live="polite" className="text-neutral-500">
            {strength === "strong" ? "Strong" : strength === "fair" ? "Fair" : "Weak"} password
          </span>
        )}
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {rules.map((rule, index) => (
          <span
            key={rule.key}
            className={`h-1 flex-1 rounded-[1px] ${index < passedCount ? "bg-[#F39200]" : "bg-neutral-200"}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
        {rules.map((rule) => (
          <li key={rule.key} className={`flex items-start gap-1 ${rule.passed ? "text-emerald-700" : "text-neutral-500"}`}>
            {rule.passed ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            ) : (
              <Circle aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PasswordMatchHint({
  password,
  confirmation,
}: {
  password: string;
  confirmation: string;
}) {
  if (!password || !confirmation || password !== confirmation) return null;

  return (
    <p className="flex items-center gap-1 text-xs text-emerald-700" role="status">
      <CheckCircle2 aria-hidden="true" className="size-3" /> Passwords match
    </p>
  );
}

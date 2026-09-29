import { CheckCircle2, Circle } from "lucide-react";
import { evaluatePasswordPolicy } from "../password-policy";

export function PasswordRequirements({ value }: { value: string }) {
  const { rules, passedCount, strength } = evaluatePasswordPolicy(value);

  return (
    <div className="space-y-1.5 text-xs text-neutral-600">
      <div className="flex items-center justify-between gap-2">
        {strength !== "none" && (
          <span
            aria-live="polite"
            className={`transition-colors duration-300 motion-reduce:transition-none ${strength === "strong" ? "text-emerald-700" : "text-neutral-500"}`}
          >
            {strength === "strong" ? "Strong" : strength === "fair" ? "Fair" : "Weak"} password
          </span>
        )}
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {rules.map((rule, index) => (
          <span
            key={rule.key}
            className={`h-1 flex-1 rounded-[2px] transition-colors duration-300 motion-reduce:transition-none ${index < passedCount ? "bg-[#F39200]" : "bg-neutral-200"}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-1.5">
        {rules.map((rule) => (
          <li
            key={rule.key}
            className={`flex min-w-0 items-center gap-1.5 rounded-[3px] px-2 py-1.5 leading-4 transition-all duration-300 ease-out motion-reduce:transition-none ${rule.passed ? "  text-emerald-800" : "border-neutral-200  text-neutral-600"}`}
          >
            <span className="relative size-3.5 shrink-0" aria-hidden="true">
              <Circle
                className={`absolute inset-0 size-3.5 transition-all duration-300 motion-reduce:transition-none ${rule.passed ? "scale-50 opacity-0" : "scale-100 opacity-100"}`}
              />
              <CheckCircle2
                className={`absolute inset-0 size-3.5 transition-all duration-300 motion-reduce:transition-none ${rule.passed ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
              />
            </span>
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

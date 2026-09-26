import { useRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import "../auth.css";

interface OtpInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "type"
> {
  value: string;
  onChange: (value: string) => void;
}

export function OtpInput({
  value,
  onChange,
  ref,
  id,
  className,
  onBlur,
  disabled,
  ...props
}: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from(
    { length: 6 },
    (_, index) => value[index]?.trim() ?? "",
  );
  function focus(index: number) {
    const input = inputs.current[Math.max(0, Math.min(5, index))];
    input?.focus();
    input?.select();
  }
  function update(index: number, text: string) {
    const incoming = text.replace(/[^0-9]/g, "").slice(0, 6);
    if (!incoming) return;
    const start = incoming.length === 6 ? 0 : index;
    const next = [...digits];
    [...incoming].forEach((digit, offset) => {
      if (start + offset < 6) next[start + offset] = digit;
    });
    onChange(
      next
        .map((digit) => digit || " ")
        .join("")
        .trimEnd(),
    );
    focus(start + incoming.length);
  }
  return (
    <div
      role="group"
      aria-label="Verification code"
      className={cn("auth-otp", className)}
    >
      {digits.map((digit, index) => (
        <input
          {...props}
          key={index}
          id={index === 0 ? id : undefined}
          ref={(node) => {
            inputs.current[index] = node;
            if (index === 0) {
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={index === 0}
          aria-label={`Digit ${index + 1} of verification code`}
          disabled={disabled}
          value={digit}
          className="auth-otp-digit"
          onFocus={(event) => event.currentTarget.select()}
          onBlur={onBlur}
          onChange={(event) => {
            if (event.target.value === "") {
              const next = [...digits];
              next[index] = "";
              onChange(
                next
                  .map((item) => item || " ")
                  .join("")
                  .trimEnd(),
              );
            } else update(index, event.target.value);
          }}
          onPaste={(event) => {
            event.preventDefault();
            update(index, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              focus(index + (event.key === "ArrowLeft" ? -1 : 1));
            } else if (event.key === "Backspace") {
              event.preventDefault();
              if (!digits[index]) focus(index - 1);
              else {
                const next = [...digits];
                next[index] = "";
                onChange(
                  next
                    .map((item) => item || " ")
                    .join("")
                    .trimEnd(),
                );
              }
            } else if (
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              /^[0-9]$/.test(event.key)
            ) {
              event.preventDefault();
              update(index, event.key);
            }
          }}
        />
      ))}
    </div>
  );
}

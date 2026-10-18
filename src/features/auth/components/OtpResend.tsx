import { LoaderCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface OtpResendProps {
  secondsLeft: number;
  isPending: boolean;
  disabled: boolean;
  onResend: () => void;
}

export function OtpResend({
  secondsLeft,
  isPending,
  disabled,
  onResend,
}: OtpResendProps) {
  return (
    <div className="auth-otp-resend">
      {secondsLeft > 0 && !isPending ? (
        <p>
          Resend code in{" "}
          <span className="auth-otp-seconds">{secondsLeft}s</span>
        </p>
      ) : (
        <Button
          type="button"
          variant="link"
          onClick={onResend}
          disabled={disabled || isPending}
        >
          {isPending && (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          )}
          {isPending ? "Sending..." : "Resend code"}
        </Button>
      )}
    </div>
  );
}

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useGoogleExchangeMutation } from "@/features/auth/hooks/useAuth";
import { AuthFlowLayout } from "@/features/auth/components/AuthFlowLayout";

const googleErrorMessages: Record<string, string> = {
  GOOGLE_AUTHENTICATION_FAILED: "Google authentication failed. Please try again.",
  GOOGLE_ACCOUNT_INVALID: "The Google account information is invalid.",
  UNAUTHORIZED: "This Google sign-in session is no longer valid.",
};

export default function GoogleCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const exchange = useGoogleExchangeMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      exchange.reset();
      toast.error(googleErrorMessages[error] ?? "Google sign-in failed. Please try again.");
      navigate("/login", { replace: true });
      return;
    }

    if (!code) {
      toast.error(googleErrorMessages.GOOGLE_AUTHENTICATION_FAILED);
      navigate("/login", { replace: true });
      return;
    }

    exchange.mutate(code);
  }, [exchange, navigate, params]);

  return (
    <AuthFlowLayout title="Signing in with Google">
      <div className="mt-8 flex items-center gap-3 text-neutral-600">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-[#F39200]" />
        <p>Please wait while we complete your sign-in.</p>
      </div>
    </AuthFlowLayout>
  );
}

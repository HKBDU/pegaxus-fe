import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authApi, getAuthApiError } from "@/features/auth/services";
import { useAuthStore } from "@/features/auth/store";
import type {
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendOtpRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "@/features/auth/types";
import { queryClient } from "@/lib/queryClient";
import { getPostLoginPath } from "@/app/route-config";

export function useRegisterMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    gcTime: 0,
    onSuccess: (_, variables) => {
      toast.success(
        "Sign up successful. Please check your email for the verification code.",
      );
      navigate("/verify-email", {
        replace: true,
        state: { email: variables.email },
      });
    },
    onError: (error) => {
      const message = getAuthApiError(error)?.message;
      toast.error(message ?? "Failed to sign up. Please try again.");
    },
  });
}

export function useLoginMutation() {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const requestedPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/";
  const from = /^\/logout\/?$/i.test(requestedPath) ? "/" : requestedPath;

  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: (data) => authApi.login(data),
    gcTime: 0,
    onSuccess: (response) => {
      queryClient.clear();
      setAuth(response);
      toast.success("Signed in successfully.");
      navigate(getPostLoginPath(response.user.role, from), { replace: true });
    },
    onError: (error) => {
      const apiError = getAuthApiError(error);
      const messages: Record<string, string> = {
        INVALID_CREDENTIALS: "Email or password is incorrect.",
        ACCOUNT_NOT_VERIFIED: "Your email has not been verified.",
        ACCOUNT_SUSPENDED: "Your account has been suspended.",
        ACCOUNT_INACTIVE: "Your account is inactive.",
      };
      toast.error(
        (apiError?.errorCode && messages[apiError.errorCode]) ||
          apiError?.message ||
          "Failed to sign in. Please try again.",
      );
    },
  });
}

export function useGoogleExchangeMutation() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation<AuthResponse, Error, string>({
    mutationFn: (code) => authApi.exchangeGoogleCode(code),
    gcTime: 0,
    onSuccess: (response) => {
      queryClient.clear();
      setAuth(response);
      toast.success("Signed in with Google successfully.");
      navigate(getPostLoginPath(response.user.role), { replace: true });
    },
    onError: () => {
      toast.error("Google sign-in could not be completed. Please try again.");
      navigate("/login", { replace: true });
    },
  });
}

export function useForgotPasswordMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
    retry: false,
    onSuccess: (_, { email }) => {
      toast.success("If the email exists, a verification code has been sent.");
      navigate("/forgot-password/verify-otp", { state: { email } });
    },
    onError: () => {
      // Keep failures generic as well to avoid exposing account existence.
      toast.error(
        "Unable to send a verification code. Please try again later.",
      );
    },
  });
}

export function useResendOtpMutation() {
  return useMutation({
    mutationFn: (data: ResendOtpRequest) => authApi.resendOtp(data),
    retry: false,
    onSuccess: () => toast.success("A new verification code has been sent."),
    onError: (error) => {
      const apiError = getAuthApiError(error);
      toast.error(
        apiError?.errorCode === "OTP_RESEND_TOO_SOON"
          ? "Please wait before requesting another code."
          : "Unable to resend a verification code. Please try again later.",
      );
    },
  });
}

export function useVerifyEmailMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: VerifyEmailRequest) => authApi.verifyEmail(data),
    retry: false,
    onSuccess: () => {
      toast.success("Email verified successfully.");
      navigate("/login", { replace: true });
    },
  });
}

export function useResetPasswordMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
    retry: false,
    gcTime: 0,
    onSuccess: () => {
      toast.success("Password reset successfully. Please sign in again.");
      navigate("/login", { replace: true });
    },
  });
}

export function useChangePasswordMutation(onSuccess: () => void) {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authApi.changePassword(data),
    retry: false,
    gcTime: 0,
    onSuccess: () => {
      toast.success("Password changed successfully.");
      onSuccess();
    },
  });
}

export function useLogoutMutation() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation<void, Error, void, number>({
    mutationFn: () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) throw new Error("Refresh token is missing");
      return authApi.logout(refreshToken);
    },
    gcTime: 0,
    onMutate: () => useAuthStore.getState().sessionVersion,
    onSettled: (_, __, ___, sessionVersion) => {
      if (useAuthStore.getState().sessionVersion !== sessionVersion) return;
      clearAuth();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });
}

export function useUser() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const accountId = useAuthStore((state) => state.principal?.id);

  return useQuery({
    queryKey: ["me", accountId],
    queryFn: authApi.getMe,
    enabled: Boolean(accessToken),
  });
}

import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "@/features/auth/services";
import { useAuthStore } from "@/features/auth/store";
import type {
  AuthApiError,
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

export function useRegisterMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
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
      const message = isAxiosError<AuthApiError>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(message ?? "Failed to sign up. Please try again.");
    },
  });
}

export function useLoginMutation() {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/";

  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (response) => {
      setAuth(response);
      toast.success("Signed in successfully.");
      navigate(from, { replace: true });
    },
    onError: (error) => {
      const apiError = isAxiosError<AuthApiError>(error)
        ? error.response?.data
        : undefined;
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
      const apiError = isAxiosError<AuthApiError>(error)
        ? error.response?.data
        : undefined;
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

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });
}

export function useUser() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["me"],
    queryFn: authApi.getMe,
    enabled: Boolean(accessToken),
  });
}

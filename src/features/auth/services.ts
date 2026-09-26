import apiClient from "@/lib/axios";
import { isAxiosError } from "axios";
import { requestRefreshToken } from "./services/refresh-token";
import type {
  AuthAccount,
  AuthApiError,
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendOtpRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "@/features/auth/types";

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = (await apiClient.post(
      "/auth/login",
      credentials,
    )) as unknown as {
      value: AuthResponse;
    };
    const value = response.value;
    if (!value?.accessToken || !value.refreshToken || !Number.isFinite(value.expiresIn) ||
        !value.user?.accountId || !value.user.role) {
      throw new Error("Login response does not contain a complete authenticated session");
    }
    return value;
  },

  async register(credentials: RegisterRequest): Promise<RegisterResponse> {
    const response = (await apiClient.post(
      "/auth/register",
      credentials,
    )) as unknown as {
      value: RegisterResponse;
    };
    return response.value;
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await apiClient.post("/auth/forgot-password", data);
  },

  async resendOtp(data: ResendOtpRequest): Promise<void> {
    await apiClient.post("/auth/resend-otp", data);
  },

  async verifyEmail(data: VerifyEmailRequest): Promise<void> {
    await apiClient.post("/auth/verify-email", data);
  },

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await apiClient.post("/auth/reset-password", data);
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.put("/accounts/me/password", data);
  },

  refreshToken: (refreshToken: string) => requestRefreshToken(apiClient, refreshToken),

  async exchangeGoogleCode(code: string): Promise<AuthResponse> {
    const response = (await apiClient.post(
      "/auth/google/exchange",
      { code },
    )) as unknown as { value: AuthResponse };
    const value = response.value;
    if (!value?.accessToken || !value.refreshToken || !Number.isFinite(value.expiresIn) ||
        !value.user?.accountId || !value.user.role) {
      throw new Error("Google exchange response does not contain a complete authenticated session");
    }
    return value;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken })
  },

  async getMe(): Promise<AuthAccount> {
    const response = await apiClient.get<unknown, { value: AuthAccount }>("/accounts/me");
    return response.value;
  },
};

export function getAuthApiError(error: unknown) {
  const apiError = isAxiosError<AuthApiError>(error) ? error.response?.data : undefined;
  if (!apiError) return undefined;
  return {
    ...apiError,
    errors: apiError.errors?.map((item) => ({
      ...item,
      field: item.field.charAt(0).toLowerCase() + item.field.slice(1),
    })) ?? null,
  };
}

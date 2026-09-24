import apiClient from "@/lib/axios";
import type {
  AuthPrincipal,
  AuthResponse,
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
    return response.value;
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

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async getMe(): Promise<AuthPrincipal> {
    return apiClient.get("/user/me") as unknown as Promise<AuthPrincipal>;
  },
};

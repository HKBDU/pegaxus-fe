import { z } from "zod";
import { passwordPolicy } from "./password-policy";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Email format is invalid.")
  .max(255, "Email must not exceed 255 characters.");

export const otpSchema = z
  .string()
  .min(1, "Verification code is required.")
  .regex(/^[0-9]{6}$/, "Verification code must contain exactly 6 digits.");

export const strongPasswordSchema = z
  .string()
  .min(1, "Password is required.")
  .min(passwordPolicy.minLength, "Password must be at least 8 characters.")
  .max(passwordPolicy.maxLength, "Password must not exceed 128 characters.")
  .regex(
    passwordPolicy.uppercase,
    "Password must contain at least 1 uppercase letter.",
  )
  .regex(
    passwordPolicy.lowercase,
    "Password must contain at least 1 lowercase letter.",
  )
  .regex(
    passwordPolicy.number,
    "Password must contain at least 1 numeric character.",
  );

const confirmPasswordSchema = z
  .string()
  .min(1, "Confirm password is required.");
const passwordMismatch = {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
};

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required.")
      .max(150, "Full name must not exceed 150 characters."),
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    passwordMismatch,
  );

export const verifyEmailSchema = z.object({ otp: otpSchema });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const forgotPasswordOtpSchema = verifyEmailSchema;

export const resetPasswordSchema = z
  .object({
    newPassword: strongPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(
    (values) => values.newPassword === values.confirmPassword,
    passwordMismatch,
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: strongPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(
    (values) => values.newPassword === values.confirmPassword,
    passwordMismatch,
  );

export const emailRouteStateSchema = z.object({ email: emailSchema });
export const resetPasswordRouteStateSchema = emailRouteStateSchema.extend({
  otp: otpSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ForgotPasswordOtpFormValues = z.infer<
  typeof forgotPasswordOtpSchema
>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type ResetPasswordRouteState = z.infer<
  typeof resetPasswordRouteStateSchema
>;

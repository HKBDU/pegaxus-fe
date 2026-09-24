import { z } from "zod";

export function createPasswordSchema(requiredMessage: string) {
  return z
    .string()
    .min(1, requiredMessage)
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must not exceed 128 characters.")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least 1 numeric character.");
}

export const newPasswordSchema = createPasswordSchema(
  "New password is required.",
);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

import { z } from "zod";

export const employeeRoles = [
  "LOGISTICS_MANAGER",
  "TRANSPORT_SPECIALIST",
  "FLEET_ROUTE_COORDINATOR",
  "DRIVER",
  "ESCORT",
] as const;
const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone is required.")
  .regex(
    /^\+?[0-9\s().-]+$/,
    "Please enter a valid phone number.",
  )
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .refine(
    (value) => /^\+?[1-9]\d{7,14}$/.test(value),
    "Enter a valid phone number (8–15 digits, e.g. +33123456789).",
  );
const entityId = z.union([z.number().int().positive(), z.string().min(1)]);
export const employeeSchema = z.object({
  employeeId: entityId,
  accountId: entityId,
  employeeCode: z.string(),
  fullName: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  role: z.string(),
  accountStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  workingStatus: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.string(),
});
export const employeeDetailSchema = employeeSchema.extend({
  dateOfBirth: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  updatedAt: z.string(),
});
export const employeeListSchema = z.object({
  items: z.array(employeeSchema),
  pageIndex: z.number().int().min(1),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const createEmployeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name must be at most 100 characters.")
    .regex(/^[\p{L}\p{M}' .-]+$/u, "Full name contains invalid characters.")
    .transform((value) => value.replace(/\s+/g, " ")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required.")
    .max(254, "Email is too long.")
    .pipe(z.email("Enter a valid email address.")),
  phone: phoneSchema,
  role: z.enum(employeeRoles, { error: "Select a role." }),
});
export const updateEmploymentSchema = z.object({
  role: z.enum(employeeRoles, { error: "Select a role." }),
  workingStatus: z.enum(["ACTIVE", "INACTIVE"], {
    error: "Select a working status.",
  }),
  // SUSPENDED removes the account, so it stays a separate action and is not offered here.
  accountStatus: z.enum(["ACTIVE", "INACTIVE"], {
    error: "Select an account status.",
  }),
});
export type UpdateEmploymentValues = z.infer<typeof updateEmploymentSchema>;

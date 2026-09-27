import { z } from "zod"

const entityId = z.union([z.number().int().positive(), z.string().min(1)])
export const employeeSchema = z.object({
  employeeId: entityId, accountId: entityId, employeeCode: z.string(),
  fullName: z.string().nullable(), email: z.string(), phone: z.string().nullable(),
  role: z.string(), accountStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  workingStatus: z.enum(["ACTIVE", "INACTIVE"]), createdAt: z.string(),
})
export const employeeDetailSchema = employeeSchema.extend({
  dateOfBirth: z.string().nullable(), avatarUrl: z.string().nullable(),
  lastLoginAt: z.string().nullable(), updatedAt: z.string(),
})
export const employeeListSchema = z.object({
  items: z.array(employeeSchema), pageIndex: z.number().int().min(1), pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
})

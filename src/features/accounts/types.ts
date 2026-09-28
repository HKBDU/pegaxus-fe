import type { z } from "zod";
import type {
  employeeSchema,
  employeeDetailSchema,
  createEmployeeSchema,
} from "./schemas";

export type EmployeeAccount = z.infer<typeof employeeSchema>;
export type EmployeeDetail = z.infer<typeof employeeDetailSchema>;
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
export type EmployeeSort =
  | "createdAt:desc"
  | "createdAt:asc"
  | "fullName:asc"
  | "fullName:desc"
  | "employeeCode:asc"
  | "employeeCode:desc";
export interface EmployeeListParams {
  pageIndex: number;
  pageSize: number;
  search: string;
  role: string;
  accountStatus: "ALL" | "ACTIVE" | "INACTIVE";
  workingStatus: "ALL" | "ACTIVE" | "INACTIVE";
  sortBy: EmployeeSort[];
}
export interface EmploymentUpdate {
  role?: string;
  workingStatus?: "ACTIVE" | "INACTIVE";
}

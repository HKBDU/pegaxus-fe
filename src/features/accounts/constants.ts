import { PROFILE_ROLES } from "@/app/route-config"
import type { EmployeeListParams } from "./types"

export const employeeRoles = (PROFILE_ROLES.anyRole ?? []).filter((role) => role !== "CUSTOMER")
export const initialEmployeeParams: EmployeeListParams = {
  pageIndex: 1, pageSize: 10, search: "", role: "ALL", accountStatus: "ALL", workingStatus: "ALL", sortBy: ["createdAt:desc"],
}
export function formatAccountLabel(value: string) {
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

import type { AccountStatus, AccountType, EmailVerificationStatus, ProfileRole } from "@/features/profile/types"

export interface UserAccountRow {
  id: string
  fullName: string
  email: string
  employeeCode: string | null
  role: ProfileRole
  accountType: AccountType
  verification: EmailVerificationStatus
  status: AccountStatus
  updatedAt: string
}

export interface AccountFilters {
  search: string
  role: string
  accountType: string
  verification: string
  status: string
}

export const defaultAccountFilters: AccountFilters = {
  search: "", role: "ALL", accountType: "ALL", verification: "ALL", status: "ALL",
}

export function filterAccounts(accounts: UserAccountRow[], filters: AccountFilters) {
  const search = filters.search.trim().toLowerCase()
  return accounts.filter((account) => (
    (!search || [account.fullName, account.email, account.employeeCode ?? ""].some((value) => value.toLowerCase().includes(search))) &&
    (filters.role === "ALL" || account.role === filters.role) &&
    (filters.accountType === "ALL" || account.accountType === filters.accountType) &&
    (filters.verification === "ALL" || account.verification === filters.verification) &&
    (filters.status === "ALL" || account.status === filters.status)
  ))
}

// UI-only fixtures. Changes are in memory and never sent to an account API.
export const demoAccounts: UserAccountRow[] = [
  { id: "demo-1", fullName: "John Davis", email: "john.davis@example.com", employeeCode: "EMP-001", role: "LOGISTICS_MANAGER", accountType: "EMPLOYEE", verification: "VERIFIED", status: "ACTIVE", updatedAt: "2026-09-26T14:32:00Z" },
  { id: "demo-2", fullName: "Sarah Lee", email: "sarah.lee@example.com", employeeCode: "EMP-002", role: "TRANSPORT_SPECIALIST", accountType: "EMPLOYEE", verification: "VERIFIED", status: "ACTIVE", updatedAt: "2026-09-25T11:20:00Z" },
  { id: "demo-3", fullName: "Michael Chen", email: "michael.chen@example.com", employeeCode: "EMP-003", role: "FLEET_ROUTE_COORDINATOR", accountType: "EMPLOYEE", verification: "UNVERIFIED", status: "ACTIVE", updatedAt: "2026-09-24T16:15:00Z" },
  { id: "demo-4", fullName: "Emma Wilson", email: "emma.wilson@example.com", employeeCode: null, role: "CUSTOMER", accountType: "CUSTOMER", verification: "VERIFIED", status: "ACTIVE", updatedAt: "2026-09-23T09:48:00Z" },
  { id: "demo-5", fullName: "Ryan Tan", email: "ryan.tan@example.com", employeeCode: null, role: "CUSTOMER", accountType: "CUSTOMER", verification: "VERIFIED", status: "INACTIVE", updatedAt: "2026-09-22T13:10:00Z" },
  { id: "demo-6", fullName: "Sophie Park", email: "sophie.park@example.com", employeeCode: null, role: "CUSTOMER", accountType: "CUSTOMER", verification: "UNVERIFIED", status: "ACTIVE", updatedAt: "2026-09-21T10:05:00Z" },
  { id: "demo-7", fullName: "Alex Carter", email: "alex.carter@example.com", employeeCode: "EMP-004", role: "DRIVER", accountType: "EMPLOYEE", verification: "VERIFIED", status: "ACTIVE", updatedAt: "2026-09-20T08:15:00Z" },
  { id: "demo-8", fullName: "Jamie Morgan", email: "jamie.morgan@example.com", employeeCode: "EMP-005", role: "ESCORT", accountType: "EMPLOYEE", verification: "UNVERIFIED", status: "SUSPENDED", updatedAt: "2026-09-19T12:30:00Z" },
]

export function formatAccountLabel(value: string) {
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

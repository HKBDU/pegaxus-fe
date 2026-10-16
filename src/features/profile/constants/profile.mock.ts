import type { Profile } from "../types"

export const MOCK_EMPLOYEE_PROFILE: Profile = {
  accountId: "account-501",
  email: "khang@saigonracing.vn",
  accountType: "EMPLOYEE",
  status: "ACTIVE",
  role: "LOGISTICS_MANAGER",
  fullName: "Nguyễn Minh Khang",
  dob: "1988-07-21",
  phone: "0901234567",
  country: "Thailand",
  address: "ABC Ward",
  avatarUrl: null,
  customer: null,
  employee: {
    employeeId: "employee-401",
    employeeCode: "EMP-0401",
    workStatus: "Working",
  },
  memberSince: "2026-01-10T08:30:00Z",
  lastLoginAt: "2026-09-17T09:50:00Z",
  updatedAt: "2026-09-17T10:05:12Z",
}

export const MOCK_CUSTOMER_PROFILE: Profile = {
  accountId: "account-601",
  email: "owner@saigonracing.vn",
  accountType: "CUSTOMER",
  status: "ACTIVE",
  role: "CUSTOMER",
  fullName: "James Davidson",
  dob: "1982-09-18",
  phone: "0901234567",
  country: "United Kingdom",
  address: "London",
  avatarUrl: null,
  customer: {
    customerId: "CUS-0001",
    customerCode: "CUS-0001",
  },
  employee: null,
  memberSince: "2026-01-10T08:30:00Z",
  lastLoginAt: "2026-09-17T09:50:00Z",
  updatedAt: "2026-09-17T10:05:12Z",
}

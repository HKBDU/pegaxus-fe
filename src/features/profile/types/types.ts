export type EntityId = string

export type AccountType = "CUSTOMER" | "EMPLOYEE"
export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED"
export type EmailVerificationStatus = "VERIFIED" | "UNVERIFIED"
export type ProfileRole =
  | "CUSTOMER"
  | "LOGISTICS_MANAGER"
  | "TRANSPORT_SPECIALIST"
  | "FLEET_ROUTE_COORDINATOR"
  | "DRIVER"
  | "ESCORT"

export type CustomerProfile = {
  customerId: EntityId
  dateOfBirth: string | null
}

export type EmployeeProfile = {
  employeeId: EntityId
  employeeCode: string
  workStatus?: string | null
}

export type Profile = {
  accountId: EntityId
  email: string
  accountType: AccountType
  status: AccountStatus
  role: ProfileRole
  fullName: string | null
  phone: string | null
  country: string | null
  address: string | null
  avatarUrl: string | null
  customer: CustomerProfile | null
  employee: EmployeeProfile | null
  memberSince?: string | null
  lastLoginAt?: string | null
  updatedAt: string
}

export type ProfileSectionName = "IDENTITY" | "CONTACT" | "WORK INFORMATION" | "ACCOUNT"

export type ProfileFieldValue = string | null

export type UpdateProfileRequest = {
  fullName?: string
  phone?: string
  address?: string
  avatar?: File
}

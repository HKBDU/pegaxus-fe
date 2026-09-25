import type { ReactNode } from "react"

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

export type ProfileSectionName = "IDENTITY" | "CONTACT" | "PERSONAL INFORMATION" | "WORK INFORMATION" | "ACCOUNT"
export type ProfileOpenSections = Record<Exclude<ProfileSectionName, "IDENTITY">, boolean>
export type UpdateProfileRequest = {
  fullName?: string
  phone?: string
  address?: string
  avatar?: File
}

export type ProfileFormErrors = Partial<Record<"email" | "fullName" | "phone" | "address", string>>

export type ApiResponse<T> = {
  isSuccess: boolean
  code: number
  message: string
  value: T
  errorCode?: string
  errors?: { field: string; message: string }[] | null
}

export type ProfileFormProps = {
  profile: Profile
  onSubmit: (input: UpdateProfileRequest) => Promise<void> | void
  isSubmitting?: boolean
  onValidationChange?: (errors: ProfileFormErrors) => void
}

export type ProfileSectionHeadingProps = {
  title: ProfileSectionName
  className?: string
}

export type ProfileSectionDividerProps = { className?: string }

export type ProfileAvatarPreviewProps = {
  initials: string
  label?: string
  avatarUrl?: string | null
  alt?: string
  className?: string
}

export type ProfileVerificationFieldProps = {
  status: EmailVerificationStatus
  className?: string
}

export type ProfileIdentitySectionProps = {
  profile: Profile
  emailVerificationStatus: EmailVerificationStatus
  accountTypeLabel?: Record<AccountType, string>
  className?: string
}

export type ProfileActionButtonsProps = {
  onCancel?: () => void
  onEdit?: () => void
  submitFormId?: string
  disabled?: boolean
  cancelLabel?: string
  editLabel?: string
  className?: string
}

export type ProfilePageStateProps = {
  message: string
  onRetry?: () => void
}

export type ProfileAccordionSectionProps = {
  title: Exclude<ProfileSectionName, "IDENTITY">
  open: boolean
  onToggle: () => void
  children: ReactNode
}

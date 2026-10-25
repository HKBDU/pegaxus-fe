import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

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
  customerCode?: string | null
  dateOfBirth?: string | null
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
  dob: string | null
  phone: string | null
  country: string | null
  address: string | null
  avatarUrl: string | null
  customer: CustomerProfile | null
  employee: EmployeeProfile | null
  createdAt?: string | null
  memberSince?: string | null
  lastLoginAt?: string | null
  updatedAt: string
}

export type ProfileSectionName = "IDENTITY" | "CONTACT" | "PERSONAL INFORMATION" | "WORK INFORMATION" | "ACCOUNT"
export type ProfileOpenSections = Record<Exclude<ProfileSectionName, "IDENTITY">, boolean>
export type UpdateProfileRequest = {
  fullName?: string
  email?: string
  phone?: string
  address?: string
  country?: string
  dob?: string
  customerCode?: string
  role?: ProfileRole
  status?: AccountStatus
  employeeCode?: string
  workStatus?: string
  avatar?: File | { publicId: string }
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
  emailVerificationStatus: EmailVerificationStatus
  canEditEmail?: boolean
  canEditPersonalInformation?: boolean
  canEditDateOfBirth?: boolean
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
  /** Pinned to the bottom-right corner of the avatar. */
  badge?: React.ReactNode
}

export type ProfileVerificationFieldProps = {
  status: EmailVerificationStatus
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

export type ProfileInfoCardProps = {
  icon: LucideIcon
  label: string
  value: string | null | undefined
  className?: string
  variant?: "default" | "status" | "accent" | "code" | "date"
}

export type ProfileHeroCardProps = {
  profile: Profile
  emailVerificationStatus: EmailVerificationStatus
  roleLabel: string
  actions?: ReactNode
  children?: ReactNode
  nameEditor?: ReactNode
  avatarUrl?: string | null
  avatarEditor?: ReactNode
  className?: string
}

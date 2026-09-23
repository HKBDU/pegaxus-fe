import type {
  AccountType,
  EmailVerificationStatus,
  Profile,
  ProfileFieldValue,
  ProfileSectionName,
  UpdateProfileRequest,
} from "./types"
import type { ReactNode } from "react"

export type ProfileFormProps = {
  profile: Profile
  onSubmit: (input: UpdateProfileRequest) => Promise<void> | void
}

export type ProfileSectionHeadingProps = {
  title: ProfileSectionName
  className?: string
}

export type ProfileSectionDividerProps = {
  className?: string
}

export type ProfileFieldProps = {
  label: string
  value: ProfileFieldValue
  className?: string
}

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

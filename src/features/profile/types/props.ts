import type {
  AccountType,
  EmailVerificationStatus,
  Profile,
  ProfileFieldValue,
  ProfileSectionName,
  UpdateProfileRequest,
} from "./types"

export type ProfileFormProps = {
  profile: Profile
  onSubmit: (input: UpdateProfileRequest) => Promise<void> | void
  isSubmitting?: boolean
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
  cancelLabel?: string
  editLabel?: string
  className?: string
}

export type ProfilePageStateProps = {
  message: string
  onRetry?: () => void
}

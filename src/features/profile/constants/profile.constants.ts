import type { AccountType, EmailVerificationStatus, ProfileSectionName } from "../types"

export const PROFILE_SECTION_TITLES: Record<ProfileSectionName, ProfileSectionName> = {
  IDENTITY: "IDENTITY",
  CONTACT: "CONTACT",
  "WORK INFORMATION": "WORK INFORMATION",
  ACCOUNT: "ACCOUNT",
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CUSTOMER: "Customer",
  EMPLOYEE: "Employee",
}

export const EMAIL_VERIFICATION_LABELS: Record<EmailVerificationStatus, string> = {
  VERIFIED: "Verified",
  UNVERIFIED: "Unverified",
}

export const PROFILE_DEFAULT_LABELS = {
  return: "RETURN",
  avatarPreview: "AVATAR PREVIEW",
  cancel: "CANCEL",
  editProfile: "EDIT PROFILE",
} as const

export const PROFILE_COLORS = {
  orange: "#f39200",
  black: "#181818",
  fieldBackground: "#f4f4f4",
  divider: "#d1d5db",
  muted: "#6c6963",
} as const

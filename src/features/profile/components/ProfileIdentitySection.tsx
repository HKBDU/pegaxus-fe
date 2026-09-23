import { cn } from "@/lib/utils"

import { ACCOUNT_TYPE_LABELS } from "../constants/profile.constants"
import type { ProfileIdentitySectionProps } from "../types/props"
import { ProfileAvatarPreview } from "./ProfileAvatarPreview"
import { ProfileField } from "./ProfileField"
import { ProfileVerificationField } from "./ProfileVerificationField"

function getInitials(name: string | null) {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase()
}

export function ProfileIdentitySection({ profile, emailVerificationStatus, accountTypeLabel = ACCOUNT_TYPE_LABELS, className }: ProfileIdentitySectionProps) {
  return (
    <section className={cn("grid gap-x-8 border-b border-[#d1d5db] py-4 gap-y-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]", className)}>
      <h2 className="font-bold text-[24px] leading-8 tracking-[0.6px] uppercase">IDENTITY</h2>
      <div className="grid min-w-0 gap-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <ProfileAvatarPreview initials={getInitials(profile.fullName)} avatarUrl={profile.avatarUrl} alt={profile.fullName ?? "Profile avatar"} />
          <div className="grid min-w-0 gap-0">
            <ProfileField label="FULL NAME" value={profile.fullName} />
            <ProfileVerificationField status={emailVerificationStatus} />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ProfileField label="ADDRESS" value={profile.address} />
          <ProfileField label="ACCOUNT TYPE" value={accountTypeLabel[profile.accountType]} />
        </div>
        <ProfileField label="country" value={profile.country} />
      </div>
    </section>
  )
}

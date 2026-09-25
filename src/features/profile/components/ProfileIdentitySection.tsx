import { cn } from "@/lib/utils"

import { ACCOUNT_TYPE_LABELS } from "../constants/profile.constants"
import type { ProfileIdentitySectionProps } from "../types"
import { ProfileAvatarPreview } from "./ProfileAvatarPreview"
import { Field } from "@/shared/components/Field"
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
    <section className={cn("grid gap-x-6 border-b border-[#d1d5db] py-3 gap-y-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]", className)}>
      <h2 className="font-bold text-[20px] leading-7 tracking-[0.5px] uppercase">IDENTITY</h2>
      <div className="grid min-w-0 gap-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <ProfileAvatarPreview initials={getInitials(profile.fullName)} avatarUrl={profile.avatarUrl} alt={profile.fullName ?? "Profile avatar"} />
          <div className="grid min-w-0 gap-0">
            <Field label="FULL NAME" value={profile.fullName} />
            <ProfileVerificationField status={emailVerificationStatus} />
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="ADDRESS" value={profile.address} />
          <Field label="ACCOUNT TYPE" value={accountTypeLabel[profile.accountType]} />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="COUNTRY" value={profile.country} />
          <Field label="DATE OF BIRTH" value={profile.dob} />
        </div>
      </div>
    </section>
  )
}

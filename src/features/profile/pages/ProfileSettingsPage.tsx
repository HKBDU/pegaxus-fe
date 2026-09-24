import {
  ProfileActionButtons,
  ProfileAccordionSection,
  ProfileField,
  ProfileForm,
  ProfileIdentitySection,
  ProfileSectionHeading,
} from "../components"
import { useState } from "react"
import { useProfile } from "../hooks/useProfile"
import type { EmailVerificationStatus, Profile, ProfileOpenSections, ProfilePageStateProps } from "../types"
import { PageHeader } from "@/shared/components/PageHeader"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

function getEmailVerificationStatus(profile: Profile): EmailVerificationStatus {
  // A9 does not expose email verification. Authenticated active accounts are verified.
  return profile.status === "ACTIVE" ? "VERIFIED" : "UNVERIFIED"
}

function formatProfileDate(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date)
}

function formatProfileLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function ProfileSettingsPage() {
  const [openSections, setOpenSections] = useState<ProfileOpenSections>({
    CONTACT: true,
    "WORK INFORMATION": true,
    ACCOUNT: true,
  })

  function toggleSection(section: keyof typeof openSections) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }))
  }

  const {
    profile,
    error,
    isLoading,
    isEditing,
    isSubmitting,
    actionError,
    setIsEditing,
    retryProfile,
    updateProfile,
  } = useProfile()

  if (isLoading) {
    return <ProfilePageState message="Loading profile..." />
  }

  if (error || !profile) {
    return (
      <ProfilePageState
        message={error ?? "Profile not found."}
        onRetry={retryProfile}
      />
    )
  }

  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-0">
        <PageHeader backHref="/" title={isEditing ? "EDIT PROFILE" : `VIEW ${profile.accountType} PROFILE`} />

        <div className="flex flex-col gap-[0px] pt-4">
          {isEditing ? (
            <section className="grid gap-x-6 gap-y-3 border-b border-[#d1d5db] py-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
              <ProfileSectionHeading title="IDENTITY" className="text-[20px] leading-7 tracking-[0.5px]" />
              <div className="min-w-0">
                <ProfileForm profile={profile} onSubmit={updateProfile} isSubmitting={isSubmitting} />
                {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
              </div>
            </section>
          ) : (
            <ProfileIdentitySection profile={profile} emailVerificationStatus={getEmailVerificationStatus(profile)} />
          )}

          <div className="flex flex-col gap-0">
            <ProfileAccordionSection title="CONTACT" open={openSections.CONTACT} onToggle={() => toggleSection("CONTACT")}>
              <div className="grid gap-3 md:grid-cols-2">
                <ProfileField label="EMAIL ADDRESS" value={profile.email} readOnly={isEditing} />
                {isEditing ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-phone">PHONE NUMBER</Label>
                    <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-phone" name="phone" form="profile-form" defaultValue={profile.phone ?? ""} maxLength={30} />
                  </div>
                ) : (
                  <ProfileField label="PHONE NUMBER" value={profile.phone} />
                )}
              </div>
            </ProfileAccordionSection>
            <ProfileAccordionSection title="WORK INFORMATION" open={openSections["WORK INFORMATION"]} onToggle={() => toggleSection("WORK INFORMATION")}>
              <div className="grid gap-3 md:grid-cols-2">
                {profile.employee ? (
                  <>
                    <ProfileField label="EMPLOYEE CODE" value={profile.employee.employeeCode} readOnly={isEditing} />
                    <ProfileField label="ROLE" value={formatProfileLabel(profile.role)} readOnly={isEditing} />
                    <ProfileField className="md:col-span-2" label="WORK STATUS" value={profile.employee.workStatus ?? null} readOnly={isEditing} />
                  </>
                ) : (
                  <>
                    <ProfileField label="CUSTOMER ID" value={profile.customer?.customerId ?? null} readOnly={isEditing} />
                    <ProfileField label="DATE OF BIRTH" value={profile.customer?.dateOfBirth ?? null} readOnly={isEditing} />
                  </>
                )}
              </div>
            </ProfileAccordionSection>
            <ProfileAccordionSection title="ACCOUNT" open={openSections.ACCOUNT} onToggle={() => toggleSection("ACCOUNT")}>
              <div className="grid gap-3 md:grid-cols-2">
                <ProfileField label="STATUS" value={formatProfileLabel(profile.status)} readOnly={isEditing} />
                <ProfileField label="MEMBER SINCE" value={formatProfileDate(profile.memberSince)} readOnly={isEditing} />
                <ProfileField label="LAST LOGIN AT" value={formatProfileDate(profile.lastLoginAt)} readOnly={isEditing} />
                <ProfileField label="UPDATED AT" value={formatProfileDate(profile.updatedAt)} readOnly={isEditing} />
              </div>
            </ProfileAccordionSection>
          </div>

          <ProfileActionButtons
            onCancel={() => (isEditing ? setIsEditing(false) : window.history.back())}
            onEdit={isEditing ? undefined : () => setIsEditing(true)}
            editLabel={isEditing ? "SAVE CHANGES" : undefined}
            submitFormId={isEditing ? "profile-form" : undefined}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </section>
  )
}

function ProfilePageState({ message, onRetry }: ProfilePageStateProps) {
  return (
    <section className="flex min-h-[420px] w-full items-center justify-center bg-[#f4f4f4] px-6 py-12">
      <div className="text-center">
        <p className="text-sm text-[#6c6963]">{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-4 text-xs font-bold tracking-[0.6px] text-[#f39200] uppercase">
            Try again
          </button>
        )}
      </div>
    </section>
  )
}

export default ProfileSettingsPage

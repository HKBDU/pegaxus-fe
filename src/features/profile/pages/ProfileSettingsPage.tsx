import {
  ProfileActionButtons,
  ProfileAccordionSection,
  Field,
  ProfileForm,
  ProfileIdentitySection,
  ProfileSectionHeading,
} from "../components"
import { useState } from "react"
import { useParams } from "react-router-dom"
import { useProfile } from "../hooks/useProfile"
import type { EmailVerificationStatus, Profile, ProfileFormErrors, ProfileOpenSections, ProfilePageStateProps } from "../types"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
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
    "PERSONAL INFORMATION": true,
    "WORK INFORMATION": true,
    ACCOUNT: true,
  })
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({})
  const { customerId } = useParams()

  function toggleSection(section: keyof typeof openSections) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }))
  }

  const {
    profile,
    error,
    isLoading,
    isEditing,
    isSubmitting,
    setIsEditing,
    retryProfile,
    updateProfile,
  } = useProfile(customerId)

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
                <ProfileForm profile={profile} onSubmit={updateProfile} isSubmitting={isSubmitting} onValidationChange={setFormErrors} />
              </div>
            </section>
          ) : (
            <ProfileIdentitySection profile={profile} emailVerificationStatus={getEmailVerificationStatus(profile)} />
          )}

          <div className="flex flex-col gap-0">
            <ProfileAccordionSection title="CONTACT" open={openSections.CONTACT} onToggle={() => toggleSection("CONTACT")}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="EMAIL ADDRESS" value={profile.email} readOnly={isEditing} error={isEditing ? formErrors.email : undefined} />
                {isEditing ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-phone">PHONE NUMBER</Label>
                    <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-phone" name="phone" form="profile-form" defaultValue={profile.phone ?? ""} maxLength={30} aria-invalid={Boolean(formErrors.phone)} />
                    <p className="min-h-[15px] pt-0.5 text-[10px] leading-[15px] text-red-600" role={formErrors.phone ? "alert" : undefined}>{formErrors.phone ?? "\u00a0"}</p>
                  </div>
                ) : (
                  <Field label="PHONE NUMBER" value={profile.phone} />
                )}
              </div>
            </ProfileAccordionSection>
            {profile.customer && <ProfileAccordionSection title="PERSONAL INFORMATION" open={openSections["PERSONAL INFORMATION"]} onToggle={() => toggleSection("PERSONAL INFORMATION")}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="IDENTITY NUMBER" value={profile.customer.customerId} />
                <Field label="ROLE" value={formatProfileLabel(profile.role)} />
                <Field label="DATE OF BIRTH" value={profile.customer.dateOfBirth} />
              </div>
            </ProfileAccordionSection>}
            {profile.employee && <ProfileAccordionSection title="WORK INFORMATION" open={openSections["WORK INFORMATION"]} onToggle={() => toggleSection("WORK INFORMATION")}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="EMPLOYEE CODE" value={profile.employee.employeeCode} readOnly={isEditing} />
                <Field label="ROLE" value={formatProfileLabel(profile.role)} readOnly={isEditing} />
                <Field className="md:col-span-2" label="WORK STATUS" value={profile.employee.workStatus ?? null} readOnly={isEditing} />
              </div>
            </ProfileAccordionSection>}
            <ProfileAccordionSection title="ACCOUNT" open={openSections.ACCOUNT} onToggle={() => toggleSection("ACCOUNT")}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="STATUS" value={formatProfileLabel(profile.status)} readOnly={isEditing} />
                <Field label="MEMBER SINCE" value={formatProfileDate(profile.memberSince)} readOnly={isEditing} />
                <Field label="LAST LOGIN AT" value={formatProfileDate(profile.lastLoginAt)} readOnly={isEditing} />
                <Field label="UPDATED AT" value={formatProfileDate(profile.updatedAt)} readOnly={isEditing} />
              </div>
            </ProfileAccordionSection>
          </div>

          <ProfileActionButtons
            onCancel={() => {
              setFormErrors({})
              if (isEditing) setIsEditing(false)
              else window.history.back()
            }}
            onEdit={isEditing ? undefined : () => {
              setFormErrors({})
              setIsEditing(true)
            }}
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
          <Button type="button" variant="link" onClick={onRetry} className="mt-4 h-auto p-0 text-xs font-bold tracking-[0.6px] text-[#f39200] uppercase">
            Try again
          </Button>
        )}
      </div>
    </section>
  )
}

export default ProfileSettingsPage

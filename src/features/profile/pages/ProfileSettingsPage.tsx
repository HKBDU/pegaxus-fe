import { useCallback, useEffect, useState } from "react"

import { profileApi } from "../api/profile-api"
import {
  ProfileActionButtons,
  ProfileAccordionSection,
  ProfileField,
  ProfileForm,
  ProfileIdentitySection,
  ProfileSectionHeading,
} from "../components"
import { MOCK_EMPLOYEE_PROFILE } from "../constants/profile.mock"
import type { ProfilePageStateProps } from "../types/props"
import type { EmailVerificationStatus, Profile, UpdateProfileRequest } from "../types/types"
import { PageHeader } from "@/shared/components/PageHeader"

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
  const [profile, setProfile] = useState<Profile>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string>()
  const [openSections, setOpenSections] = useState<Record<"CONTACT" | "WORK INFORMATION" | "ACCOUNT", boolean>>({
    CONTACT: true,
    "WORK INFORMATION": true,
    ACCOUNT: true,
  })

  const loadProfile = useCallback(async () => {
    try {
      const nextProfile = await profileApi.getMe()
      if (!nextProfile) throw new Error("Profile response is empty")
      setProfile(nextProfile)
      setError(undefined)
    } catch {
      if (import.meta.env.DEV) {
        setProfile(MOCK_EMPLOYEE_PROFILE)
        setError(undefined)
      } else {
        setError("Unable to load profile. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  async function handleProfileUpdate(input: UpdateProfileRequest) {
    setIsSubmitting(true)
    setActionError(undefined)
    try {
      setProfile(await profileApi.updateMe(input))
      setIsEditing(false)
    } catch {
      setActionError("Unable to update profile. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleSection(section: keyof typeof openSections) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }))
  }

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  if (isLoading) {
    return <ProfilePageState message="Loading profile..." />
  }

  if (error || !profile) {
    return (
      <ProfilePageState
        message={error ?? "Profile not found."}
        onRetry={() => {
          setIsLoading(true)
          void loadProfile()
        }}
      />
    )
  }

  return (
    <section className="w-full bg-[#f4f4f4] px-6 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-[1344px] flex-col gap-0">
        <PageHeader backHref="/" title={isEditing ? "EDIT PROFILE" : `VIEW ${profile.accountType} PROFILE`} />

        <div className="flex flex-col gap-[0px] pt-6">
          {isEditing ? (
            <>
              <ProfileSectionHeading title="IDENTITY" />
              <ProfileForm profile={profile} onSubmit={handleProfileUpdate} />
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            </>
          ) : (
            <ProfileIdentitySection profile={profile} emailVerificationStatus={getEmailVerificationStatus(profile)} />
          )}

          <div className="flex flex-col gap-0">
            <ProfileAccordionSection title="CONTACT" open={openSections.CONTACT} onToggle={() => toggleSection("CONTACT")}>
              <div className="grid gap-4 md:grid-cols-2">
                <ProfileField label="EMAIL ADDRESS" value={profile.email} />
                <ProfileField label="PHONE NUMBER" value={profile.phone} />
              </div>
            </ProfileAccordionSection>
            <ProfileAccordionSection title="WORK INFORMATION" open={openSections["WORK INFORMATION"]} onToggle={() => toggleSection("WORK INFORMATION")}>
              <div className="grid gap-4 md:grid-cols-2">
                {profile.employee ? (
                  <>
                    <ProfileField label="EMPLOYEE CODE" value={profile.employee.employeeCode} />
                    <ProfileField label="ROLE" value={formatProfileLabel(profile.role)} />
                    <ProfileField className="md:col-span-2" label="WORK STATUS" value={profile.employee.workStatus ?? null} />
                  </>
                ) : (
                  <>
                    <ProfileField label="CUSTOMER ID" value={profile.customer?.customerId ?? null} />
                    <ProfileField label="DATE OF BIRTH" value={profile.customer?.dateOfBirth ?? null} />
                  </>
                )}
              </div>
            </ProfileAccordionSection>
            <ProfileAccordionSection title="ACCOUNT" open={openSections.ACCOUNT} onToggle={() => toggleSection("ACCOUNT")}>
              <div className="grid gap-4 md:grid-cols-2">
                <ProfileField label="STATUS" value={formatProfileLabel(profile.status)} />
                <ProfileField label="MEMBER SINCE" value={formatProfileDate(profile.memberSince)} />
                <ProfileField label="LAST LOGIN AT" value={formatProfileDate(profile.lastLoginAt)} />
                <ProfileField label="UPDATED AT" value={formatProfileDate(profile.updatedAt)} />
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

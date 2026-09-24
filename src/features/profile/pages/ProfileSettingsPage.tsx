import {
  ProfileActionButtons,
  ProfileForm,
  ProfileIdentitySection,
  ProfileSectionDivider,
  ProfileSectionHeading,
} from "../components"
import { useProfile } from "../hooks/useProfile"
import type { EmailVerificationStatus, Profile, ProfilePageStateProps } from "../types"
import { PageHeader } from "@/shared/components/PageHeader"

function getEmailVerificationStatus(profile: Profile): EmailVerificationStatus {
  // A9 does not expose email verification. Authenticated active accounts are verified.
  return profile.status === "ACTIVE" ? "VERIFIED" : "UNVERIFIED"
}

export function ProfileSettingsPage() {
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
    <section className="w-full bg-[#f4f4f4] px-6 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-[1344px] flex-col gap-0">
        <PageHeader backHref="/" title={isEditing ? "EDIT PROFILE" : `VIEW ${profile.accountType} PROFILE`} />

        <div className="flex flex-col gap-[26px] pt-6">
          {isEditing ? (
            <>
              <ProfileSectionHeading title="IDENTITY" />
              <ProfileForm profile={profile} onSubmit={updateProfile} isSubmitting={isSubmitting} />
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            </>
          ) : (
            <ProfileIdentitySection profile={profile} emailVerificationStatus={getEmailVerificationStatus(profile)} />
          )}

          <ProfileSectionDivider />
          <ProfileSectionHeading title="CONTACT" />
          <ProfileSectionDivider />
          <ProfileSectionHeading title="WORK INFORMATION" />
          <ProfileSectionDivider />
          <ProfileSectionHeading title="ACCOUNT" />

          <ProfileActionButtons
            onCancel={() => (isEditing ? setIsEditing(false) : window.history.back())}
            onEdit={() => setIsEditing(true)}
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

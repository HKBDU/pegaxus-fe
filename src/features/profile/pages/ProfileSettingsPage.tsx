import {
  ProfileActionButtons,
  ProfileAccordionSection,
  Field,
  ProfileForm,
  ProfileHeroCard,
  ProfileInfoCard,
  ProfileSectionHeading,
} from "../components"
import { useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import { Activity, Ban, Briefcase, CalendarClock, Clock, Globe, IdCard, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound } from "lucide-react"
import { useAuthStore } from "@/features/auth/store"
import { useProfile } from "../hooks/useProfile"
import { ACCOUNT_TYPE_LABELS } from "../constants/profile.constants"
import type { EmailVerificationStatus, Profile, ProfileFormErrors, ProfileOpenSections, ProfilePageStateProps } from "../types"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { ChangePasswordDialog } from "@/features/auth/components/ChangePasswordDialog"
import { ProfileChangePasswordButton } from "../components/ProfileChangePasswordButton"

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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const { customerId } = useParams()
  const location = useLocation()
  const principal = useAuthStore((state) => state.principal)
  const isLogisticsManager = location.pathname.startsWith("/admin") || Boolean(principal?.roles.includes("LOGISTICS_MANAGER"))
    const canManageOtherProfile = isLogisticsManager && Boolean(customerId)

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
    disableProfile,
  } = useProfile(customerId)
  const canEditCustomerIdentity = Boolean(profile?.customer && !customerId && !isLogisticsManager)

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

        <div className="flex flex-col gap-6 pt-4">
          {isEditing ? (
            <>
            <section className="grid gap-x-6 gap-y-3 border-b border-[#d1d5db] py-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
              <ProfileSectionHeading title="IDENTITY" className="text-[20px] leading-7 tracking-[0.5px]" />
              <div className="min-w-0">
                  <ProfileForm profile={profile} onSubmit={updateProfile} emailVerificationStatus={getEmailVerificationStatus(profile)} canEditEmail canEditDateOfBirth={Boolean(profile.customer)} onValidationChange={setFormErrors} isSubmitting={isSubmitting} />
              </div>
            </section>

          <div className="flex flex-col gap-0">
            <ProfileAccordionSection title="CONTACT" open={openSections.CONTACT} onToggle={() => toggleSection("CONTACT")}>
              <div className="grid gap-3 md:grid-cols-2">
                {isEditing ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-email">EMAIL ADDRESS</Label>
                    <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-email" name="email" form="profile-form" defaultValue={profile.email} maxLength={254} type="email" aria-invalid={Boolean(formErrors.email)} />
                    <p className="min-h-[15px] pt-0.5 text-[10px] leading-[15px] text-red-600" role={formErrors.email ? "alert" : undefined}>{formErrors.email ?? "\u00a0"}</p>
                  </div>
                ) : <Field label="EMAIL ADDRESS" value={profile.email} error={formErrors.email} />}
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
                {isEditing && canEditCustomerIdentity ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-identity-number">IDENTITY NUMBER</Label>
                    <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-identity-number" name="identityNumber" form="profile-form" defaultValue={profile.customer.customerId} maxLength={100} />
                  </div>
                ) : <Field label="IDENTITY NUMBER" value={profile.customer.customerId} />}
                {isEditing && canManageOtherProfile ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-customer-role">ROLE</Label>
                    <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-customer-role" name="role" form="profile-form" defaultValue={profile.role} maxLength={80} />
                  </div>
                ) : <Field label="ROLE" value={formatProfileLabel(profile.role)} />}
              </div>
            </ProfileAccordionSection>}
            {profile.employee && <ProfileAccordionSection title="WORK INFORMATION" open={openSections["WORK INFORMATION"]} onToggle={() => toggleSection("WORK INFORMATION")}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="EMPLOYEE CODE" value={profile.employee.employeeCode} readOnly />
                {isEditing && canManageOtherProfile ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-employee-role">ROLE</Label>
                    <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-employee-role" name="role" form="profile-form" defaultValue={profile.role} maxLength={80} />
                  </div>
                ) : <Field label="ROLE" value={formatProfileLabel(profile.role)} readOnly={isEditing} />}
                {isEditing && canManageOtherProfile ? (
                  <div className="flex min-w-0 flex-col gap-1 md:col-span-2">
                    <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-work-status">WORK STATUS</Label>
                    <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-work-status" name="workStatus" form="profile-form" defaultValue={profile.employee.workStatus ?? ""} maxLength={50} />
                  </div>
                ) : <Field className="md:col-span-2" label="WORK STATUS" value={profile.employee.workStatus ?? null} readOnly />}
              </div>
            </ProfileAccordionSection>}
            <ProfileAccordionSection title="ACCOUNT" open={openSections.ACCOUNT} onToggle={() => toggleSection("ACCOUNT")}>
              <div className="grid gap-3 md:grid-cols-2">
                {isEditing && canManageOtherProfile ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-status">ACCOUNT STATUS</Label>
                    <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-status" name="status" form="profile-form" defaultValue={profile.status} maxLength={30} />
                  </div>
                ) : <Field label="STATUS" value={formatProfileLabel(profile.status)} readOnly={isEditing} />}
                <Field label="MEMBER SINCE" value={formatProfileDate(profile.memberSince)} readOnly={isEditing} />
                <Field label="LAST LOGIN AT" value={formatProfileDate(profile.lastLoginAt)} readOnly={isEditing} />
                <Field label="UPDATED AT" value={formatProfileDate(profile.updatedAt)} readOnly={isEditing} />
                {isLogisticsManager && customerId && profile.status === "ACTIVE" && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-fit rounded-[2px] uppercase md:col-span-2"
                    disabled={isSubmitting}
                    onClick={() => {
                      if (window.confirm(`Disable ${profile.fullName ?? profile.email}'s account?`)) void disableProfile()
                    }}
                  >
                    DISABLE ACCOUNT
                  </Button>
                )}
              </div>
            </ProfileAccordionSection>
          </div>

          <ProfileActionButtons
            onCancel={() => {
              setFormErrors({})
              setIsEditing(false)
            }}
            editLabel="SAVE CHANGES"
            submitFormId="profile-form"
            disabled={isSubmitting}
          />
            </>
          ) : (
            <ProfileHeroCard
              profile={profile}
              emailVerificationStatus={getEmailVerificationStatus(profile)}
              roleLabel={formatProfileLabel(profile.role)}
              actions={
                <>
                  {isLogisticsManager && customerId && profile.status === "ACTIVE" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={isSubmitting}
                      onClick={() => {
                        if (window.confirm(`Disable ${profile.fullName ?? profile.email}'s account?`)) void disableProfile()
                      }}
                    >
                      <Ban aria-hidden="true" />
                      DISABLE ACCOUNT
                    </Button>
                  )}
                  <ProfileChangePasswordButton
                    customerId={customerId}
                    authenticated={Boolean(principal)}
                    disabled={isSubmitting}
                    onClick={() => setChangePasswordOpen(true)}
                  />
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setFormErrors({})
                      setIsEditing(true)
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    EDIT PROFILE
                  </Button>
                </>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileInfoCard icon={Mail} label="EMAIL ADDRESS" value={profile.email} />
                <ProfileInfoCard icon={Phone} label="PHONE NUMBER" value={profile.phone} />
                <ProfileInfoCard icon={MapPin} label="ADDRESS" value={profile.address} />
                <ProfileInfoCard icon={Globe} label="COUNTRY" value={profile.country} />
                <ProfileInfoCard icon={UserRound} label="ACCOUNT TYPE" value={ACCOUNT_TYPE_LABELS[profile.accountType]} />
                {profile.customer && <ProfileInfoCard icon={CalendarClock} label="DATE OF BIRTH" value={profile.dob} />}
                {profile.customer && <ProfileInfoCard icon={IdCard} label="IDENTITY NUMBER" value={profile.customer.customerId} />}
                {profile.employee && <ProfileInfoCard icon={Briefcase} label="EMPLOYEE CODE" value={profile.employee.employeeCode} />}
                {profile.employee && <ProfileInfoCard icon={Activity} label="WORK STATUS" value={profile.employee.workStatus} />}
                <ProfileInfoCard icon={ShieldCheck} label="ACCOUNT STATUS" value={formatProfileLabel(profile.status)} />
                <ProfileInfoCard icon={Clock} label="MEMBER SINCE" value={formatProfileDate(profile.memberSince)} />
                <ProfileInfoCard icon={Clock} label="LAST LOGIN" value={formatProfileDate(profile.lastLoginAt)} />
              </div>
            </ProfileHeroCard>
          )}
        </div>
        {!customerId && principal && (
          <ChangePasswordDialog
            open={changePasswordOpen}
            onOpenChange={setChangePasswordOpen}
          />
        )}
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

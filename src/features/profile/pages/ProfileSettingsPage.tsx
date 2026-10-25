import { useEffect, useRef, useState, type ReactNode } from "react"
import { useLocation, useParams } from "react-router-dom"
import { Activity, Ban, Briefcase, CalendarClock, Clock, Globe, IdCard, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound } from "lucide-react"
import { toast } from "sonner"

import { ChangePasswordDialog } from "@/features/auth/components/ChangePasswordDialog"
import { useAuthStore } from "@/features/auth/store"
import { Button } from "@/shared/components/ui/button"
import { CountrySelect } from "@/shared/components/ui/country-select"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Input } from "@/shared/components/ui/input"
import { PageHeader } from "@/shared/components/PageHeader"
import {
  PHONE_MESSAGE,
  VALIDATION_LIMITS,
  isPhoneValid,
} from "@/shared/constants/validation-limits"

import { ACCOUNT_TYPE_LABELS } from "../constants/profile.constants"
import { presignedUpload } from "@/shared/utils/presigned"
import { useProfile } from "../hooks/useProfile"
import { ProfileIdentityPanel, ProfileInfoCard, ProfileInlineField, ProfileSaveBar } from "../components"
import type { EmailVerificationStatus, Profile, ProfilePageStateProps, UpdateProfileRequest } from "../types"

type ProfileDraft = {
  fullName: string
  email: string
  phone: string
  address: string
  country: string
  dob: string
  role: string
  status: string
  workStatus: string
  avatar: File | null
}

type EditableField = keyof Omit<ProfileDraft, "avatar">

function getEmailVerificationStatus(profile: Profile): EmailVerificationStatus {
  return profile.status === "ACTIVE" ? "VERIFIED" : "UNVERIFIED"
}

function profileToDraft(profile: Profile): ProfileDraft {
  return {
    fullName: profile.fullName ?? "",
    email: profile.email,
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    country: profile.country ?? "",
    dob: profile.dob ?? "",
    role: profile.role,
    status: profile.status,
    workStatus: profile.employee?.workStatus ?? "",
    avatar: null,
  }
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

function formatProfileDateOnly(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatProfileLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
}

function ProfileInfoGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-[5px] border border-[#d1d5db] bg-white p-5 sm:p-6">
      <div className="mb-4 border-b border-[#ece9e4] pb-3">
        <h2 className="font-heading text-[20px] font-bold leading-7 tracking-[0.5px] text-[#181818] uppercase">{title}</h2>
        <p className="mt-1 text-[12px] leading-[18px] text-[#6c6963]">{description}</p>
      </div>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function ProfileSettingsPage() {
  const { customerId } = useParams()
  const location = useLocation()
  const principal = useAuthStore((state) => state.principal)
  const isLogisticsManager = location.pathname.startsWith("/admin") || Boolean(principal?.roles.includes("LOGISTICS_MANAGER"))
  const canManageOtherProfile = isLogisticsManager && Boolean(customerId)
  const [draft, setDraft] = useState<ProfileDraft>()
  const [savedDraft, setSavedDraft] = useState<ProfileDraft>()
  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const {
    profile,
    error,
    isLoading,
    isSubmitting,
    retryProfile,
    updateProfile,
    disableProfile,
  } = useProfile(customerId)

  // The profile response is the source of truth when switching accounts or reloading.
  // oxlint-disable react-hooks/exhaustive-deps -- intentionally sync only when account identity changes
  useEffect(() => {
    if (!profile) return
    const nextDraft = profileToDraft(profile)
    // oxlint-disable-next-line react/set-state-in-effect
    setDraft(nextDraft)
    // oxlint-disable-next-line react/set-state-in-effect
    setSavedDraft(nextDraft)
    // oxlint-disable-next-line react/set-state-in-effect
    setEditingField(null)
  }, [profile?.accountId])
  // oxlint-enable react-hooks/exhaustive-deps

  useEffect(() => {
    if (!draft?.avatar) {
      // oxlint-disable-next-line react/set-state-in-effect
      setAvatarPreviewUrl(undefined)
      return
    }

    const previewUrl = URL.createObjectURL(draft.avatar)
    setAvatarPreviewUrl(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [draft?.avatar])

  if (isLoading) return <ProfilePageState message="Loading profile..." />
  if (error || !profile || !draft || !savedDraft) {
    return <ProfilePageState message={error ?? "Profile not found."} onRetry={retryProfile} />
  }

  const currentDraft = draft
  const currentSavedDraft = savedDraft

  const changedFieldCount = Object.keys(draft).filter((key) => {
    if (key === "avatar") return Boolean(draft.avatar)
    return draft[key as EditableField] !== savedDraft[key as EditableField]
  }).length
  const hasUnsavedChanges = changedFieldCount > 0

  function updateDraft(field: EditableField, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current)
  }

  function discardChanges() {
    const resetDraft: ProfileDraft = { ...currentSavedDraft, avatar: null }
    setDraft(resetDraft)
    setEditingField(null)
  }

  async function saveChanges() {
    if (!currentDraft.fullName.trim()) {
      toast.error("Full name is required.")
      setEditingField("fullName")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentDraft.email.trim())) {
      toast.error("Enter a valid email address.")
      setEditingField("email")
      return
    }

    if (currentDraft.phone.trim() && !isPhoneValid(currentDraft.phone)) {
      toast.error(PHONE_MESSAGE)
      setEditingField("phone")
      return
    }

    if (currentDraft.dob) {
      const dobDate = new Date(currentDraft.dob)
      if (Number.isNaN(dobDate.getTime())) {
        toast.error("Enter a valid date of birth.")
        setEditingField("dob")
        return
      }
      const today = new Date()
      const minAgeDate = new Date()
      minAgeDate.setFullYear(minAgeDate.getFullYear() - VALIDATION_LIMITS.accountMinAgeYears)
      minAgeDate.setHours(23, 59, 59, 999)
      const maxAgeDate = new Date()
      maxAgeDate.setFullYear(maxAgeDate.getFullYear() - VALIDATION_LIMITS.accountMaxAgeYears)
      maxAgeDate.setHours(0, 0, 0, 0)

      if (dobDate > today) {
        toast.error("Date of birth cannot be in the future.")
        setEditingField("dob")
        return
      }
      if (dobDate > minAgeDate) {
        toast.error(`You must be at least ${VALIDATION_LIMITS.accountMinAgeYears} years old.`)
        setEditingField("dob")
        return
      }
      if (dobDate < maxAgeDate) {
        toast.error(`Date of birth cannot be more than ${VALIDATION_LIMITS.accountMaxAgeYears} years ago.`)
        setEditingField("dob")
        return
      }
    }

    let avatar: UpdateProfileRequest["avatar"]
    if (currentDraft.avatar) {
      try {
        avatar = {
          publicId: await presignedUpload.upload({
            file: currentDraft.avatar,
            entity: "avatar",
          }),
        }
      } catch {
        toast.error("Unable to upload avatar. Please try again.")
        return
      }
    }

    const input: UpdateProfileRequest = {
      fullName: currentDraft.fullName.trim(),
      email: currentDraft.email.trim(),
      phone: currentDraft.phone.trim() || undefined,
      address: currentDraft.address.trim() || undefined,
      country: currentDraft.country.trim() || undefined,
      dob: currentDraft.dob || undefined,
      avatar,
    }
    if (canManageOtherProfile) {
      input.role = currentDraft.role.trim() as UpdateProfileRequest["role"]
      input.status = currentDraft.status.trim() as UpdateProfileRequest["status"]
      input.workStatus = currentDraft.workStatus.trim() || undefined
    }
    const saved = await updateProfile(input)
    if (saved) {
      const nextSavedDraft: ProfileDraft = { ...currentDraft, avatar: null }
      setDraft(nextSavedDraft)
      setSavedDraft(nextSavedDraft)
      setEditingField(null)
    }
  }

  const inlineField = (field: EditableField, label: string, value: string, icon: typeof Mail, editor?: ReactNode, compact = false) => (
    <ProfileInlineField
      label={label}
      icon={icon}
      value={value}
      editing={editingField === field}
      onEdit={() => setEditingField(field)}
      onChange={(nextValue) => updateDraft(field, nextValue)}
      onCommit={() => setEditingField(null)}
      onCancel={() => {
        updateDraft(field, savedDraft[field])
        setEditingField(null)
      }}
      editor={editor}
      compact={compact}
    />
  )

  return (
    <section className="profile-page min-w-0 w-full overflow-x-clip bg-[#f4f4f4] px-5 py-6 pb-28 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col">
        <PageHeader backHref="/" title={`VIEW ${profile.accountType} PROFILE`} />
        <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ProfileIdentityPanel
            profile={profile}
            avatarUrl={avatarPreviewUrl ?? profile.avatarUrl}
            emailVerificationStatus={getEmailVerificationStatus(profile)}
            roleLabel={formatProfileLabel(profile.role)}
            accountType={ACCOUNT_TYPE_LABELS[profile.accountType]}
            accountStatus={formatProfileLabel(profile.status)}
            onChangePassword={() => setChangePasswordOpen(true)}
            onChangeAvatar={() => avatarInputRef.current?.click()}
            nameEditor={inlineField("fullName", "FULL NAME", draft.fullName, Pencil, undefined, true)}
            actions={
              <>
                {isLogisticsManager && customerId && profile.status === "ACTIVE" && (
                  <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { if (window.confirm(`Disable ${profile.fullName ?? profile.email}'s account?`)) void disableProfile() }} className="w-full rounded-[2px] border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700">
                    <Ban aria-hidden="true" />
                    DISABLE ACCOUNT
                  </Button>
                )}
              </>
            }
          />
          <Input
            ref={avatarInputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Change profile avatar"
            onChange={(event) => setDraft((current) => current ? { ...current, avatar: event.target.files?.[0] ?? null } : current)}
          />

          <div className="flex min-w-0 flex-col gap-5">
            <ProfileInfoGroup title="CONTACT INFORMATION" description="How this account can be contacted">
              {inlineField("email", "EMAIL ADDRESS", draft.email, Mail)}
              {inlineField("phone", "PHONE NUMBER", draft.phone, Phone)}
              {inlineField("address", "ADDRESS", draft.address, MapPin)}
              {inlineField("country", "COUNTRY", draft.country, Globe, <CountrySelect id="inline-profile-country" value={draft.country} onValueChange={(value) => { updateDraft("country", value); setEditingField(null) }} className="profile-edit-field !h-9 !min-w-0 !px-3 !py-1" />)}
            </ProfileInfoGroup>

            <ProfileInfoGroup title="PERSONAL INFORMATION" description="Basic information about the profile owner">
              <ProfileInfoCard icon={UserRound} label="ACCOUNT TYPE" value={ACCOUNT_TYPE_LABELS[profile.accountType]} variant="accent" />
              {profile.customer && inlineField("dob", "DATE OF BIRTH", draft.dob ? formatProfileDateOnly(draft.dob) ?? draft.dob : "", CalendarClock, <DatePicker id="inline-profile-dob" value={draft.dob} onChange={(value) => { updateDraft("dob", value); setEditingField(null) }} className="profile-edit-field !h-9 !min-w-0 !px-3 !py-1" />)}
              {profile.customer && <ProfileInfoCard icon={IdCard} label="CUSTOMER CODE" value={profile.customer.customerCode} variant="code" />}
              {profile.customer && canManageOtherProfile && inlineField("role", "ROLE", formatProfileLabel(draft.role), UserRound)}
            </ProfileInfoGroup>

            {profile.employee && <ProfileInfoGroup title="WORK INFORMATION" description="Role and operational details">
              <ProfileInfoCard icon={Briefcase} label="EMPLOYEE CODE" value={profile.employee.employeeCode} variant="code" />
              {canManageOtherProfile ? inlineField("role", "ROLE", formatProfileLabel(draft.role), UserRound) : <ProfileInfoCard icon={UserRound} label="ROLE" value={formatProfileLabel(profile.role)} />}
              {canManageOtherProfile ? inlineField("workStatus", "WORK STATUS", draft.workStatus, Activity) : <ProfileInfoCard icon={Activity} label="WORK STATUS" value={profile.employee.workStatus} variant="status" />}
            </ProfileInfoGroup>}

            <ProfileInfoGroup title="ACCOUNT ACTIVITY" description="Status and account history">
              {canManageOtherProfile ? inlineField("status", "ACCOUNT STATUS", formatProfileLabel(draft.status), ShieldCheck) : <ProfileInfoCard icon={ShieldCheck} label="ACCOUNT STATUS" value={formatProfileLabel(profile.status)} variant="status" />}
              <ProfileInfoCard icon={Clock} label="MEMBER SINCE" value={formatProfileDate(profile.memberSince)} variant="date" />
              <ProfileInfoCard icon={Clock} label="LAST LOGIN" value={formatProfileDate(profile.lastLoginAt)} variant="date" />
              <ProfileInfoCard icon={Clock} label="UPDATED AT" value={formatProfileDate(profile.updatedAt)} variant="date" />
            </ProfileInfoGroup>
          </div>
        </div>
      </div>

      {hasUnsavedChanges && <ProfileSaveBar saving={isSubmitting} changeCount={changedFieldCount} onSave={() => void saveChanges()} onDiscard={discardChanges} />}
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </section>
  )
}

function ProfilePageState({ message, onRetry }: ProfilePageStateProps) {
  return (
    <section className="flex min-h-[420px] w-full items-center justify-center bg-[#f4f4f4] px-6 py-12">
      <div className="text-center">
        <p className="text-sm text-[#6c6963]">{message}</p>
        {onRetry && <Button type="button" variant="link" onClick={onRetry} className="mt-4 h-auto p-0 text-xs font-bold tracking-[0.6px] text-[#f39200] uppercase">Try again</Button>}
      </div>
    </section>
  )
}

export default ProfileSettingsPage

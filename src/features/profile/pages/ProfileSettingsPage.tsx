import { useEffect, useRef, useState, type ReactNode } from "react"
import { useLocation, useParams } from "react-router-dom"
import { Activity, Ban, Briefcase, CalendarClock, Clock, Globe, IdCard, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound } from "lucide-react"
import { toast } from "sonner"

import { ChangePasswordDialog } from "@/features/auth/components/ChangePasswordDialog"
import { useAuthStore } from "@/features/auth/store"
import { Button } from "@/shared/components/ui/button"
import { CountrySelect, formatCountryDisplayName, normalizeCountryToIso2 } from "@/shared/components/ui/country-select"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Input } from "@/shared/components/ui/input"
import { PageHeader } from "@/shared/components/PageHeader"
import { getPostLoginPath } from "@/app/route-config"
import { getAvatarFileError } from "../avatar"
import { resolveProfilePhone } from "../phone"
import { ProfilePhoneEditor } from "../components/ProfilePhoneEditor"
import {
  PHONE_MESSAGE,
  VALIDATION_LIMITS,
  isPhoneValid,
} from "@/shared/constants/validation-limits"

import { ACCOUNT_TYPE_LABELS } from "../constants/profile.constants"
import { formatUtcDateTime, todayUtc } from "@/shared/utils/datetime"
import { useProfile } from "../hooks/useProfile"
import { ProfileIdentityPanel, ProfileInfoCard, ProfileInlineField } from "../components"
import type { EmailVerificationStatus, Profile, ProfilePageStateProps, UpdateProfileRequest } from "../types"
import { usePageTitle } from "@/shared/hooks"

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
    country: normalizeCountryToIso2(profile.country) ?? profile.country ?? "",
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

  return formatUtcDateTime(date)
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
  usePageTitle("Profile")
  const { customerId } = useParams()
  const location = useLocation()
  const principal = useAuthStore((state) => state.principal)
  const sessionVersion = useAuthStore((state) => state.sessionVersion)
  const isLogisticsManager = location.pathname.startsWith("/admin") || Boolean(principal?.roles.includes("LOGISTICS_MANAGER"))
  const canManageOtherProfile = isLogisticsManager && Boolean(customerId)
  const [draft, setDraft] = useState<ProfileDraft>()
  const [savedDraft, setSavedDraft] = useState<ProfileDraft>()
  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>()
  const [callingCountry, setCallingCountry] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const saveAttemptRef = useRef<object | null>(null)
  const mountedRef = useRef(false)

  const {
    profile,
    error,
    isLoading,
    isSubmitting,
    retryProfile,
    updateProfile,
    disableProfile,
  } = useProfile(customerId)

  const profileScope = `${sessionVersion}:${principal?.id}:${customerId ?? "me"}:${location.pathname}:${profile?.accountId}`
  const scopeRef = useRef(profileScope)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  useEffect(() => {
    scopeRef.current = profileScope
    saveAttemptRef.current = null
    // oxlint-disable-next-line react/set-state-in-effect -- invalidate attempts when the account/session changes
    setIsSaving(false)
  }, [profileScope])

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
    // oxlint-disable-next-line react/set-state-in-effect
    setCallingCountry("")
  }, [profileScope])
  // oxlint-enable react-hooks/exhaustive-deps

  // After a save the profile is reloaded: show the values the server stored, not the ones that were typed.
  // oxlint-disable react-hooks/exhaustive-deps -- resync only when the stored profile changes
  useEffect(() => {
    if (!profile) return
    const storedDraft = profileToDraft(profile)
    // oxlint-disable-next-line react/set-state-in-effect
    setDraft(storedDraft)
    // oxlint-disable-next-line react/set-state-in-effect
    setSavedDraft(storedDraft)
  }, [profile?.updatedAt])
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
  const isBusy = isSaving || isSubmitting
  // Preserve an untouched stored value. Calling country is explicitly chosen,
  // independently of the profile's address country.
  const phoneChanged = draft.phone !== savedDraft.phone || Boolean(callingCountry)
  const phoneResult = phoneChanged ? resolveProfilePhone(draft.phone, callingCountry) : {
    value: draft.phone,
    canonical: draft.phone.trim().replace(/[\s().-]/g, ""),
    error: undefined,
  }

  function updateDraft(field: EditableField, value: string) {
    if (saveAttemptRef.current || isSubmitting) return
    setDraft((current) => current ? { ...current, [field]: value } : current)
  }

  async function handleSaveField(field: EditableField, overrideValue?: string) {
    if (saveAttemptRef.current || isSubmitting) return

    const rawValue = overrideValue !== undefined ? overrideValue : currentDraft[field]
    const currentSavedValue = currentSavedDraft[field]

    if (field === "phone") {
      const resolved = resolveProfilePhone(rawValue, callingCountry)
      if (resolved.error || !isPhoneValid(resolved.value)) {
        toast.error(resolved.error ?? PHONE_MESSAGE)
        return
      }
      if (resolved.value === currentSavedValue && !callingCountry) {
        setEditingField(null)
        return
      }
    } else if (field === "country") {
      const nextIso = normalizeCountryToIso2(rawValue)
      const currentIso = normalizeCountryToIso2(currentSavedValue)
      if (nextIso === currentIso) {
        setEditingField(null)
        return
      }
    } else {
      if (rawValue.trim() === (currentSavedValue ?? "").trim()) {
        setEditingField(null)
        return
      }
    }

    if (field === "fullName") {
      if (!rawValue.trim()) {
        toast.error("Full name is required.")
        return
      }
    }

    if (field === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue.trim())) {
        toast.error("Enter a valid email address.")
        return
      }
    }

    if (field === "dob" && rawValue) {
      const dobDate = new Date(rawValue)
      if (Number.isNaN(dobDate.getTime())) {
        toast.error("Enter a valid date of birth.")
        return
      }
      const today = todayUtc()
      const dob = rawValue.slice(0, 10)
      const minAgeDate = `${Number(today.slice(0, 4)) - VALIDATION_LIMITS.accountMinAgeYears}${today.slice(4)}`
      const maxAgeDate = `${Number(today.slice(0, 4)) - VALIDATION_LIMITS.accountMaxAgeYears}${today.slice(4)}`

      if (dob > today) {
        toast.error("Date of birth cannot be in the future.")
        return
      }
      if (dob > minAgeDate) {
        toast.error(`You must be at least ${VALIDATION_LIMITS.accountMinAgeYears} years old.`)
        return
      }
      if (dob < maxAgeDate) {
        toast.error(`Date of birth cannot be more than ${VALIDATION_LIMITS.accountMaxAgeYears} years ago.`)
        return
      }
    }

    const attempt = {}
    saveAttemptRef.current = attempt
    setIsSaving(true)
    const ownerSession = useAuthStore.getState()
    const ownerScope = profileScope
    const isCurrentAttempt = () => mountedRef.current && saveAttemptRef.current === attempt &&
      scopeRef.current === ownerScope && useAuthStore.getState().sessionVersion === ownerSession.sessionVersion &&
      useAuthStore.getState().principal?.id === ownerSession.principal?.id

    try {
      const nextPhoneValue = field === "phone"
        ? resolveProfilePhone(rawValue, callingCountry).value
        : currentSavedDraft.phone

      const input: UpdateProfileRequest = {
        fullName: (field === "fullName" ? rawValue : currentSavedDraft.fullName).trim(),
        email: (field === "email" ? rawValue : currentSavedDraft.email).trim(),
        phone: nextPhoneValue || undefined,
        address: (field === "address" ? rawValue : currentSavedDraft.address).trim() || undefined,
        country: normalizeCountryToIso2(field === "country" ? rawValue : currentSavedDraft.country),
        dob: (field === "dob" ? rawValue : currentSavedDraft.dob) || undefined,
      }
      if (canManageOtherProfile) {
        input.role = (field === "role" ? rawValue : currentSavedDraft.role).trim() as UpdateProfileRequest["role"]
        input.status = (field === "status" ? rawValue : currentSavedDraft.status).trim() as UpdateProfileRequest["status"]
        input.workStatus = (field === "workStatus" ? rawValue : currentSavedDraft.workStatus).trim() || undefined
      }

      const saved = await updateProfile(input)
      if (saved && isCurrentAttempt()) {
        const nextValue = field === "phone"
          ? nextPhoneValue
          : field === "country"
          ? (normalizeCountryToIso2(rawValue) ?? rawValue)
          : rawValue
        const nextSavedDraft: ProfileDraft = {
          ...currentSavedDraft,
          [field]: nextValue,
          avatar: null,
        }
        setDraft(nextSavedDraft)
        setSavedDraft(nextSavedDraft)
        setEditingField(null)
        if (field === "phone") setCallingCountry("")
      }
    } finally {
      if (saveAttemptRef.current === attempt) {
        saveAttemptRef.current = null
        if (mountedRef.current) setIsSaving(false)
      }
    }
  }

  async function handleSaveAvatar(file: File) {
    if (saveAttemptRef.current || isSubmitting) return
    const avatarError = getAvatarFileError(file)
    if (avatarError) {
      toast.error(avatarError)
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setAvatarPreviewUrl(previewUrl)

    const attempt = {}
    saveAttemptRef.current = attempt
    setIsSaving(true)
    const ownerSession = useAuthStore.getState()
    const ownerScope = profileScope
    const isCurrentAttempt = () => mountedRef.current && saveAttemptRef.current === attempt &&
      scopeRef.current === ownerScope && useAuthStore.getState().sessionVersion === ownerSession.sessionVersion &&
      useAuthStore.getState().principal?.id === ownerSession.principal?.id

    try {
      const input: UpdateProfileRequest = {
        fullName: currentSavedDraft.fullName.trim(),
        email: currentSavedDraft.email.trim(),
        phone: currentSavedDraft.phone || undefined,
        address: currentSavedDraft.address.trim() || undefined,
        country: normalizeCountryToIso2(currentSavedDraft.country),
        dob: currentSavedDraft.dob || undefined,
        avatar: file,
      }
      if (canManageOtherProfile) {
        input.role = currentSavedDraft.role.trim() as UpdateProfileRequest["role"]
        input.status = currentSavedDraft.status.trim() as UpdateProfileRequest["status"]
        input.workStatus = currentSavedDraft.workStatus.trim() || undefined
      }

      const saved = await updateProfile(input)
      if (!saved && isCurrentAttempt()) {
        setAvatarPreviewUrl(undefined)
      }
    } finally {
      if (saveAttemptRef.current === attempt) {
        saveAttemptRef.current = null
        if (mountedRef.current) setIsSaving(false)
      }
    }
  }

  const inlineField = (field: EditableField, label: string, value: string, icon: typeof Mail, editor?: ReactNode, compact = false) => (
    <ProfileInlineField
      label={label}
      icon={icon}
      value={value}
      editing={editingField === field}
      disabled={isBusy}
      onEdit={() => {
        if (!saveAttemptRef.current && !isSubmitting) {
          if (editingField && editingField !== field) {
            setDraft((current) => current ? { ...current, [editingField]: currentSavedDraft[editingField] } : current)
            if (editingField === "phone") setCallingCountry("")
          }
          setEditingField(field)
        }
      }}
      onChange={(nextValue) => updateDraft(field, nextValue)}
      onCommit={() => void handleSaveField(field)}
      onCancel={() => {
        if (saveAttemptRef.current || isSubmitting) return
        updateDraft(field, currentSavedDraft[field])
        if (field === "phone") setCallingCountry("")
        setEditingField(null)
      }}
      editor={editor}
      compact={compact}
    />
  )

  return (
    <section className="profile-page min-w-0 w-full overflow-x-clip bg-[#f4f4f4] px-5 py-6 pb-10 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col">
        <PageHeader backHref={getPostLoginPath(profile.role)} backLabel="HOME" title={`VIEW ${profile.accountType} PROFILE`} />
        <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ProfileIdentityPanel
            disabled={isBusy}
            profile={profile}
            avatarUrl={avatarPreviewUrl ?? profile.avatarUrl}
            emailVerificationStatus={getEmailVerificationStatus(profile)}
            roleLabel={formatProfileLabel(profile.role)}
            accountType={ACCOUNT_TYPE_LABELS[profile.accountType]}
            accountStatus={formatProfileLabel(profile.status)}
            onChangePassword={() => { if (!saveAttemptRef.current && !isSubmitting) setChangePasswordOpen(true) }}
            onChangeAvatar={() => { if (!saveAttemptRef.current && !isSubmitting) avatarInputRef.current?.click() }}
            nameEditor={inlineField("fullName", "FULL NAME", draft.fullName, Pencil, undefined, true)}
            actions={
              <>
                {isLogisticsManager && customerId && profile.status === "ACTIVE" && (
                  <Button type="button" variant="outline" disabled={isBusy} onClick={() => { if (!saveAttemptRef.current && !isSubmitting && window.confirm(`Disable ${profile.fullName ?? profile.email}'s account?`)) void disableProfile() }} className="w-full rounded-[2px] border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700">
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
            disabled={isBusy}
            accept="image/jpeg,image/png"
            aria-label="Change profile avatar"
            onChange={(event) => {
              if (event.currentTarget.files && event.currentTarget.files.length > 1) {
                toast.error("Only one file allowed. Remove the current avatar to upload another.")
              }
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ""
              if (!file) return
              void handleSaveAvatar(file)
            }}
          />

          <div className="flex min-w-0 flex-col gap-5">
            <ProfileInfoGroup title="CONTACT INFORMATION" description="How this account can be contacted">
              {/* The e-mail is the sign-in identity: it is not changed from this page. */}
              <ProfileInfoCard icon={Mail} label="EMAIL ADDRESS" value={profile.email} />
              <div className="min-w-0">
                {inlineField("phone", "PHONE NUMBER", draft.phone, Phone,
                  <ProfilePhoneEditor value={draft.phone} callingCountry={callingCountry} disabled={isBusy} onChange={(value) => updateDraft("phone", value)} onCountryChange={(value) => { if (!saveAttemptRef.current && !isSubmitting) setCallingCountry(value) }} />)}
                <p id="profile-phone-preview" aria-live="polite" className={`mt-1 break-words text-[11px] leading-4 ${phoneResult.error ? "text-red-600" : "text-[#6c6963]"}`}>
                  {phoneResult.error ?? (phoneResult.canonical ? `Number to save: ${phoneResult.canonical}` : "No phone number provided.")}
                </p>
              </div>
              {inlineField("address", "ADDRESS", draft.address, MapPin)}
              {inlineField("country", "COUNTRY", formatCountryDisplayName(draft.country), Globe, <fieldset disabled={isBusy}><CountrySelect id="inline-profile-country" value={draft.country} valueFormat="iso2" onValueChange={(value) => { if (saveAttemptRef.current || isSubmitting) return; updateDraft("country", value); void handleSaveField("country", value) }} className="profile-edit-field !h-9 !min-w-0 !px-3 !py-1" /></fieldset>)}
            </ProfileInfoGroup>

            <ProfileInfoGroup title="PERSONAL INFORMATION" description="Basic information about the profile owner">
              <ProfileInfoCard icon={UserRound} label="ACCOUNT TYPE" value={ACCOUNT_TYPE_LABELS[profile.accountType]} variant="accent" />
              {profile.customer && inlineField("dob", "DATE OF BIRTH", draft.dob ? formatProfileDateOnly(draft.dob) ?? draft.dob : "", CalendarClock, <fieldset disabled={isBusy}><DatePicker id="inline-profile-dob" value={draft.dob} onChange={(value) => { if (saveAttemptRef.current || isSubmitting) return; updateDraft("dob", value); void handleSaveField("dob", value) }} className="profile-edit-field !h-9 !min-w-0 !px-3 !py-1" /></fieldset>)}
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
              <ProfileInfoCard icon={Clock} label="MEMBER SINCE (UTC)" value={formatProfileDate(profile.memberSince)} variant="date" />
              <ProfileInfoCard icon={Clock} label="LAST LOGIN (UTC)" value={formatProfileDate(profile.lastLoginAt)} variant="date" />
              <ProfileInfoCard icon={Clock} label="UPDATED AT (UTC)" value={formatProfileDate(profile.updatedAt)} variant="date" />
            </ProfileInfoGroup>
          </div>
        </div>
      </div>

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

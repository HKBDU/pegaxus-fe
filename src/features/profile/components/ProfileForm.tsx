import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

import type { ProfileFormErrors, ProfileFormProps } from "../types"
import { ACCOUNT_TYPE_LABELS } from "../constants/profile.constants"
import { ProfileAvatarPreview } from "./ProfileAvatarPreview"

function getInitials(name: string | null) {
  return (name ?? "").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase()
}

const readonlyFieldClass = "flex min-h-[30px] min-w-0 items-center border border-[#c8c8c8] bg-[#dedede] px-3 py-2 lg:py-1 text-[13px] font-medium leading-[21px] text-[#6c6963]"
const readonlyVerificationFieldClass = "flex h-[42px] min-w-0 items-center border border-[#c8c8c8] bg-[#dedede] px-3 py-0 text-[13px] font-medium leading-[21px] text-[#6c6963]"
const labelClass = "text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase"
const errorTextClass = "min-h-[15px] pt-0.5 text-[10px] leading-[15px] text-red-600"

function isValidEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) }
function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15 && /^[+\d][\d\s().-]*$/.test(value)
}

export function ProfileForm({ profile, onSubmit, emailVerificationStatus, canEditEmail = true, canEditDateOfBirth = Boolean(profile.customer), onValidationChange }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.fullName ?? "")
  const [address, setAddress] = useState(profile.address ?? "")
  const [country, setCountry] = useState(profile.country ?? "")
  const [dob, setDob] = useState(profile.dob ?? "")
  const [avatar, setAvatar] = useState<File>()
  const [errors, setErrors] = useState<ProfileFormErrors>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? profile.email)
    const phone = String(formData.get("phone") ?? profile.phone ?? "")
    const identityNumber = formData.get("identityNumber")
    const role = formData.get("role")
    const status = formData.get("status")
    const employeeCode = formData.get("employeeCode")
    const workStatus = formData.get("workStatus")
    const nextErrors: ProfileFormErrors = {}
    if (!isValidEmail(email)) nextErrors.email = "Enter a valid email address."
    if (email !== profile.email && emailVerificationStatus !== "VERIFIED") nextErrors.email = "Verify the new email address before saving."
    if (!fullName.trim()) nextErrors.fullName = "Full name is required."
    if (!phone.trim()) nextErrors.phone = "Phone number is required."
    else if (!isValidPhone(phone.trim())) nextErrors.phone = "Enter a valid phone number."
    if (!address.trim()) nextErrors.address = "Address is required."
    setErrors(nextErrors)
    onValidationChange?.(nextErrors)
    if (Object.keys(nextErrors).length > 0) { toast.error("Please fix the highlighted fields."); return }
    await onSubmit({ fullName: fullName.trim(), email: canEditEmail ? email.trim() : undefined, phone: phone.trim(), address: address.trim(), country: country.trim(), dob: canEditDateOfBirth ? dob : undefined, identityNumber: identityNumber ? String(identityNumber).trim() : undefined, role: role ? String(role).trim() as ProfileFormProps["profile"]["role"] : undefined, status: status ? String(status).trim() as ProfileFormProps["profile"]["status"] : undefined, employeeCode: employeeCode ? String(employeeCode).trim() : undefined, workStatus: workStatus ? String(workStatus).trim() : undefined, avatar })
  }

  return (
    <form id="profile-form" onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div className="relative min-w-0">
          <ProfileAvatarPreview initials={getInitials(profile.fullName)} avatarUrl={profile.avatarUrl} alt={profile.fullName ?? "Profile avatar"} />
          <Input className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" id="profile-avatar" type="file" accept="image/jpeg,image/png" aria-label="Upload profile avatar" onChange={(event) => setAvatar(event.target.files?.[0])} />
        </div>
        <div className="grid min-w-0 gap-0">
          <div className="flex min-w-0 flex-col gap-1">
            <Label className={labelClass} htmlFor="profile-full-name">FULL NAME</Label>
            <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={150} required />
            <p className={errorTextClass} role={errors.fullName ? "alert" : undefined}>{errors.fullName ?? "\u00a0"}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-[6px] py-[10px]">
            <span className={labelClass}>EMAIL VERIFICATION STATUS</span>
            <div className={`${readonlyVerificationFieldClass} gap-1 font-semibold`}><span aria-hidden="true">✓</span><span>{emailVerificationStatus}</span></div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <Label className={labelClass} htmlFor="profile-address">ADDRESS</Label>
          <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} />
          <p className={errorTextClass} role={errors.address ? "alert" : undefined}>{errors.address ?? "\u00a0"}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-1"><span className={labelClass}>ACCOUNT TYPE</span><div className={readonlyFieldClass}>{ACCOUNT_TYPE_LABELS[profile.accountType]}</div></div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <Label className={labelClass} htmlFor="profile-country">COUNTRY</Label>
          <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-country" value={country} onChange={(event) => setCountry(event.target.value)} maxLength={100} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <Label className={labelClass} htmlFor="profile-dob">DATE OF BIRTH</Label>
          {canEditDateOfBirth ? <Input className="profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1" id="profile-dob" type="date" value={dob} onChange={(event) => setDob(event.target.value)} /> : <div className={readonlyFieldClass}>{profile.dob || "—"}</div>}
        </div>
      </div>
    </form>
  )
}

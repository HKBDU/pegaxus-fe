import { useState, type FormEvent } from "react"

import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"

import type { ProfileFormProps } from "../types/props"

export function ProfileForm({ profile, onSubmit }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.fullName ?? "")
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [address, setAddress] = useState(profile.address ?? "")
  const [avatar, setAvatar] = useState<File>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      avatar,
    })
  }

  return (
    <form id="profile-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-full-name">FULL NAME</Label>
          <Input className="profile-edit-field" id="profile-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={150} required />
        </div>
        <div className="grid gap-2">
          <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-phone">PHONE</Label>
          <Input className="profile-edit-field" id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} />
        </div>
        <div className="grid gap-2">
          <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-avatar">AVATAR</Label>
          <Input className="profile-edit-field" id="profile-avatar" type="file" accept="image/jpeg,image/png" onChange={(event) => setAvatar(event.target.files?.[0])} />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase" htmlFor="profile-address">ADDRESS</Label>
          <Input className="profile-edit-field" id="profile-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} />
        </div>
      </div>
    </form>
  )
}

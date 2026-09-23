import { useState, type FormEvent } from "react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/lib/utils"

import type { ProfileFormProps } from "../types/props"

export function ProfileForm({ profile, onSubmit, isSubmitting = false }: ProfileFormProps) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="profile-full-name">FULL NAME</Label>
          <Input id="profile-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={150} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-phone">PHONE</Label>
          <Input id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-avatar">AVATAR</Label>
          <Input id="profile-avatar" type="file" accept="image/jpeg,image/png" onChange={(event) => setAvatar(event.target.files?.[0])} />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="profile-address">ADDRESS</Label>
          <Input id="profile-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting} className={cn("w-fit rounded-none bg-[#f39200] text-[#181818] hover:bg-[#f39200]")}>{isSubmitting ? "SAVING..." : "SAVE PROFILE"}</Button>
    </form>
  )
}

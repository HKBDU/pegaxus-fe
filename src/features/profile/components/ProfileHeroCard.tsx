import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { cn } from "@/lib/utils"

import type { ProfileHeroCardProps } from "../types"
import { ProfileVerificationField } from "./ProfileVerificationField"

function getInitials(name: string | null) {
  return (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase()
}

export function ProfileHeroCard({ profile, emailVerificationStatus, roleLabel, actions, children, className }: ProfileHeroCardProps) {
  return (
    <div className={cn("border border-[#d1d5db] bg-white shadow-sm", className)}>
      <div className="h-36 w-full bg-gradient-to-br from-[#f39200] via-[#f5a83d] to-[#181818] sm:h-48" aria-hidden="true" />
      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative shrink-0">
            <Avatar className="size-24 border-4 border-white bg-[#f4f4f4] text-[#f39200] shadow-md sm:size-28">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.fullName ?? "Profile avatar"} />}
              <AvatarFallback className="bg-[#f4f4f4] text-xl font-bold tracking-[0.9px] text-[#f39200]">{getInitials(profile.fullName)}</AvatarFallback>
            </Avatar>
            <ProfileVerificationField status={emailVerificationStatus} className="pointer-events-none absolute -right-2 -bottom-2 z-20 shadow-sm" />
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 sm:pb-1">{actions}</div>}
        </div>

        <h1 className="mt-4 text-2xl font-bold leading-tight text-[#181818]">{profile.fullName ?? "Unnamed"}</h1>
        <p className="text-sm font-medium text-[#6c6963]">{roleLabel}</p>

        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  )
}

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

export function ProfileHeroCard({ profile, emailVerificationStatus, roleLabel, actions, children, nameEditor, avatarUrl, avatarEditor, className }: ProfileHeroCardProps) {
  return (
    <>
      <div className={cn("border border-[#d1d5db] bg-white", className)}>
        <div className="h-36 w-full bg-gradient-to-br from-[#f39200] via-[#f5a83d] to-[#181818] sm:h-48" aria-hidden="true" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-20 flex flex-col gap-4 sm:-mt-24 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative shrink-0">
              <Avatar className="size-40 border-4 border-white bg-[#f4f4f4] text-[#f39200] sm:size-52">
                {(avatarUrl ?? profile.avatarUrl) && <AvatarImage src={avatarUrl ?? profile.avatarUrl ?? undefined} alt={profile.fullName ?? "Profile avatar"} />}
                <AvatarFallback className="bg-[#f4f4f4] text-4xl font-bold tracking-[0.9px] text-[#f39200]">{getInitials(profile.fullName)}</AvatarFallback>
              </Avatar>
              {avatarEditor}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {nameEditor ?? <h1 className="text-2xl font-bold leading-tight text-[#181818]">{profile.fullName ?? "Unnamed"}</h1>}
            <ProfileVerificationField status={emailVerificationStatus} className="pointer-events-none" />
          </div>
          <p className="text-sm font-medium text-[#6c6963]">{roleLabel}</p>
        </div>
      </div>
      {children && <div className="mt-5 flex flex-col gap-5">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#d1d5db] pt-5">{actions}</div>}
    </>
  )
}

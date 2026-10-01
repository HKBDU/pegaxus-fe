import { Link } from "react-router-dom"
import { KeyRound, LogOut, MapPin, MoreHorizontal, Pencil } from "lucide-react"
import type { ReactNode } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { EmailVerificationStatus, Profile } from "../types"
import { ProfileVerificationField } from "./ProfileVerificationField"

function getInitials(name: string | null) {
  return (name ?? "").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase()
}

export function ProfileIdentityPanel({
  profile,
  avatarUrl,
  nameEditor,
  roleLabel,
  emailVerificationStatus,
  accountType,
  accountStatus,
  onChangeAvatar,
  onChangePassword,
  actions,
}: {
  profile: Profile
  avatarUrl?: string | null
  nameEditor?: ReactNode
  onChangeAvatar: () => void
  roleLabel: string
  emailVerificationStatus: EmailVerificationStatus
  accountType: string
  accountStatus: string
  onChangePassword: () => void
  actions?: ReactNode
}) {
  return (
    <aside className="lg:sticky lg:top-20">
      <div className="relative min-h-[470px] overflow-hidden rounded-[12px] border border-white/60 bg-[#252729] text-white">
        <Avatar className="absolute inset-0 size-full rounded-none border-0 bg-[#252729] text-[#f39200]">
          {(avatarUrl ?? profile.avatarUrl) && <AvatarImage className="object-cover object-center" src={avatarUrl ?? profile.avatarUrl ?? undefined} alt={profile.fullName ?? "Profile avatar"} />}
          <AvatarFallback className="rounded-none bg-[#252729] text-7xl font-bold text-[#f39200]">{getInitials(profile.fullName)}</AvatarFallback>
        </Avatar>

        <div className="absolute inset-0 bg-gradient-to-t from-[#18191b]/95 via-[#18191b]/30 to-transparent" aria-hidden="true" />
        <div className="absolute left-5 top-5 text-[10px] font-bold tracking-[0.18em] text-[#f39200] uppercase">Pegaxus profile</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Open profile actions" className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-white/40 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-[#f39200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-52 rounded-[6px] border-[#d1d5db] bg-white p-1.5 text-[#181818]">
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-[3px] px-3 py-2.5 text-sm font-medium data-[highlighted]:bg-[#fff4df] data-[highlighted]:text-[#9a5b00]" onSelect={onChangeAvatar}>
              <Pencil className="size-4" aria-hidden="true" />
              <span>Change avatar</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-[3px] px-3 py-2.5 text-sm font-medium data-[highlighted]:bg-[#fff4df] data-[highlighted]:text-[#9a5b00]" onSelect={onChangePassword}>
              <KeyRound className="size-4" aria-hidden="true" />
              <span>Change password</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-[#ece9e4]" />
            <DropdownMenuItem asChild variant="destructive" className="cursor-pointer gap-2 rounded-[3px] px-3 py-2.5 text-sm font-medium">
              <Link to="/logout">
                <LogOut className="size-4" aria-hidden="true" />
                <span>Sign out</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 lg:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {nameEditor ?? <h1 className="text-2xl font-bold leading-tight text-white">{profile.fullName ?? "Unnamed"}</h1>}
          </div>
          <p className="mt-1 text-sm font-medium text-white/80">{roleLabel}</p>

          <div className="mt-4 flex items-end justify-center gap-2 border-t border-white/20 pt-3 text-xs">
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[10px] font-bold tracking-[0.08em] text-white/60 uppercase">Account type</p>
              <p className="mt-0.5 truncate font-semibold text-[#ffc15a]">{accountType}</p>
            </div>
            <div className="h-7 w-px shrink-0 bg-white/20" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[10px] font-bold tracking-[0.08em] text-white/60 uppercase">Status</p>
              <p className={cn("mt-0.5 font-semibold", accountStatus === "Active" ? "text-sky-300" : "text-amber-300")}>{accountStatus}</p>
            </div>
            <div className="h-7 w-px shrink-0 bg-white/20" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[10px] font-bold tracking-[0.08em] text-white/60 uppercase">Verification</p>
              <ProfileVerificationField status={emailVerificationStatus} className={cn("mt-0.5 justify-center border-0 bg-transparent p-0 font-semibold shadow-none", emailVerificationStatus === "VERIFIED" ? "text-emerald-300" : "text-amber-300")} />
            </div>
          </div>

          {profile.address && (
            <div className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-white/75">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 overflow-hidden whitespace-nowrap" aria-label={profile.address}>
                <div className="profile-address-marquee flex w-max min-w-full">
                  <span className="shrink-0 pr-12">{profile.address}</span>
                  <span aria-hidden="true" className="shrink-0 pr-12">{profile.address}</span>
                </div>
              </div>
            </div>
          )}

          {actions && <div className="mt-4 flex flex-col gap-2">{actions}</div>}
        </div>
      </div>
    </aside>
  )
}

"use client"

import { useState } from "react"
import { KeyRound, LogIn, LogOut, User, UserPlus } from "lucide-react"
import { Link } from "react-router-dom"

import { ChangePasswordDialog } from "@/features/auth/components/ChangePasswordDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

export type ProfileDropdownUser = {
  name: string
  email: string
  avatarUrl?: string
}

export type ProfileDropdownProps = {
  isLoggedIn: boolean
  user: ProfileDropdownUser | null
}

// Build a compact two-letter fallback from the user's display name.
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function ProfileDropdown({ isLoggedIn, user }: ProfileDropdownProps) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const displayName = user?.name.trim() || "Account"
  const initials = isLoggedIn ? getInitials(displayName) : ""

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group inline-flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#f39200] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17191c] active:scale-[0.98]"
            aria-label={isLoggedIn ? `Open ${displayName}'s account menu` : "Open account menu"}
          >
            <Avatar className="size-9 border border-white/15 bg-[#252a31]">
              {isLoggedIn && user?.avatarUrl ? (
                <AvatarImage className="object-cover" src={user.avatarUrl} alt={`${displayName}'s profile photo`} />
              ) : null}
              <AvatarFallback className="bg-[#4b515a] text-xs font-semibold text-white">
                {initials || <User className="size-4" aria-hidden="true" />}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-64 rounded-md border-slate-200 p-1.5 font-sans text-slate-800 shadow-xl shadow-slate-950/10"
        >
          {isLoggedIn && user ? (
            <>
              {/* Read-only account summary. */}
              <DropdownMenuLabel className="min-w-0 px-2.5 py-2">
                <span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span>
                <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                  {user.email || "Loading account..."}
                </span>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild className="cursor-pointer px-2.5 py-2">
                <Link to="/profile-settings">
                  <User className="size-4" aria-hidden="true" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer px-2.5 py-2"
                onSelect={() => setChangePasswordOpen(true)}
              >
                <KeyRound className="size-4" aria-hidden="true" />
                <span>Change password</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild variant="destructive" className="cursor-pointer px-2.5 py-2 text-destructive">
                <Link to="/logout">
                  <LogOut className="size-4" aria-hidden="true" />
                  <span>Sign out</span>
                </Link>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem asChild className="cursor-pointer px-2.5 py-2">
                <Link to="/login">
                  <LogIn className="size-4" aria-hidden="true" />
                  <span>Sign in</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer px-2.5 py-2">
                <Link to="/register">
                  <UserPlus className="size-4" aria-hidden="true" />
                  <span>Sign up</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {isLoggedIn && (
        <ChangePasswordDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
        />
      )}
    </>
  )
}

import { Bell, ChevronDown } from "lucide-react"
import { NavLink } from "react-router-dom"

import logo from "@/assets/logo-dark.png"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/lib/utils"
import type { HeaderProps } from "@/shared/types/props"
import type { HeaderNavItem, HeaderUser } from "@/shared/types/type"

const defaultNavItems: HeaderNavItem[] = [
  { label: "Home", href: "/" },
  { label: "Transport Requests", href: "/transport-requests" },
  { label: "My Horses", href: "/my-horses" },
  { label: "Profile Settings", href: "/profile-settings" },
]

// wait for AuthContext to get user data from API/JWT to pass to header
const defaultUser: HeaderUser = { name: "James Davidson", role: "Owner", initials: "JD" }

export function Header({
  navItems = defaultNavItems,
  logoSrc = logo,
  logoAlt = "Pegaxus",
  user = defaultUser,
  notificationCount = 1,
  onNotificationClick,
  onUserClick,
  rightContent,
  className,
}: HeaderProps) {
  return (
    <header className={cn("h-[72px] w-full border-b border-white/5 bg-[#17191c] text-white", className)}>
      <div className="mx-auto flex h-full w-full items-center px-8">
        <NavLink to="/" aria-label={logoAlt} className="shrink-0">
          <img src={logoSrc} alt={logoAlt} className="h-auto w-[150px]" />
        </NavLink>
        // active state got from url
        <nav aria-label="Main navigation" className="ml-auto flex h-full items-center gap-10">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex h-full items-center whitespace-nowrap text-sm text-[#c7c9cc] transition-colors hover:text-white",
                  isActive &&
                    "font-semibold text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#f39200]",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-10 flex items-center gap-5">
          {rightContent ?? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative text-[#d7d9dc] hover:bg-white/10 hover:text-white"
                onClick={onNotificationClick}
              >
                <Bell className="size-[18px]" />
                {notificationCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#f5ad22]" />
                )}
              </Button>
              <span className="h-8 w-px bg-white/10" aria-hidden="true" />
              <button
                type="button"
                className="flex items-center gap-3 rounded-md p-1 text-left hover:bg-white/5"
                onClick={onUserClick}
                aria-label={`Open ${user.name} menu`}
              >
                <Avatar className="size-9">
                  {user.avatarSrc && <AvatarImage src={user.avatarSrc} alt={user.name} />}
                  <AvatarFallback className="bg-[#4b515a] text-xs text-white">{user.initials}</AvatarFallback>
                </Avatar>
                <span className="hidden min-w-24 lg:block">
                  <span className="block text-sm font-medium leading-4">{user.name}</span>
                  <span className="block text-xs text-[#9ca1a8]">{user.role}</span>
                </span>
                <ChevronDown className="size-4 text-[#9ca1a8]" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

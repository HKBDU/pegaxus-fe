import { Bell, ChevronDown, House, MapPin, Menu, Truck } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import logo from "@/assets/logo-dark.png"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/shared/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { HeaderProps } from "@/shared/types/props"
import type { HeaderNavItem, HeaderSidebarNavProps, HeaderUser } from "@/shared/types/type"

const defaultNavItems: HeaderNavItem[] = [
  { label: "HOME", href: "/" },
  { label: "HORSE", href: "/my-horses" },
  { label: "BOOKING", href: "/bookings" },
]

// wait for AuthContext to get user data from API/JWT to pass to header
const defaultUser: HeaderUser = { name: "James Davidson", role: "Owner", initials: "JD" }

function HeaderSidebarNav({ navItems }: HeaderSidebarNavProps) {
  const { setOpenMobile } = useSidebar()
  const location = useLocation()
  const icons = [House, MapPin, Truck]

  return (
    <Sidebar side="left" collapsible="offcanvas" className="h-svh min-h-svh w-[15rem] lg:hidden">
      <div className="flex h-24 shrink-0 items-center justify-center bg-[#17191c] px-5">
        <img src={logo} alt="Pegaxus" className="w-full max-w-[170px]" />
      </div>
      <SidebarContent className="min-h-0 overflow-hidden bg-[#17191c] text-white">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, index) => {
                const isActive = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)
                const Icon = icons[index] ?? House

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-8 rounded-none px-3 font-heading text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca1a8] hover:bg-white/5 hover:text-white",
                        isActive && "border-l-4 border-[#f39200] !bg-[#f39200]/10 pl-3 font-semibold !text-[#f39200]",
                      )}
                    >
                      <NavLink to={item.href} end={item.href === "/"} onClick={() => setOpenMobile(false)}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export function Header({
  navItems = defaultNavItems,
  logoSrc = logo,
  logoAlt = "Pegaxus",
  user = defaultUser,
  notificationCount = 1,
  onNotificationClick,
  onUserClick,
  rightContent,
  userActions,
  className,
}: HeaderProps) {
  const location = useLocation()
  const activeNavIndex =   Math.max(
    navItems.findIndex((item) => item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href)),
    0,
  )
  const navItemCount = Math.max(navItems.length, 1)
  const activeBarWidth = 65

  const userControl = (
    <NavLink
      to="/profile-settings"
      className="flex min-w-0 items-center gap-3 rounded-none p-1 text-left hover:bg-white/5"
      onClick={onUserClick}
      aria-label={`Open ${user.name} menu`}
    >
      <Avatar className="size-9 shrink-0">
        {user.avatarSrc && <AvatarImage src={user.avatarSrc} alt={user.name} />}
        <AvatarFallback className="bg-[#4b515a] text-xs text-white">{user.initials}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium leading-4">{user.name}</span>
        <span className="block truncate text-xs text-[#9ca1a8]">{user.role}</span>
      </span>
      <ChevronDown className="size-4 shrink-0 text-[#9ca1a8]" />
    </NavLink>
  )

  const notificationButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
      className="relative text-[#d7d9dc] hover:bg-white/10 hover:text-white"
      onClick={onNotificationClick}
    >
      <Bell className="size-[18px]" />
      {notificationCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex size-2 items-center justify-center rounded-full bg-[#f5ad22]" />
      )}
    </Button>
  )

  return (
    <SidebarProvider defaultOpen={false} className="sticky top-0 z-50 !min-h-0 w-full">
      <HeaderSidebarNav navItems={navItems} />
      <header className={cn("site-header-enter sticky top-0 z-50 w-full border-b border-white/5 bg-[#17191c] text-white transition-[background-color,box-shadow] duration-300", className)}>
      <div className="mx-auto hidden h-12 w-full items-center px-8 lg:flex">
        <NavLink to="/" aria-label={logoAlt} className="shrink-0">
          <img src={logoSrc} alt={logoAlt} className="h-auto w-[138px] transition-transform duration-300 hover:scale-[1.02]" />
        </NavLink>
        { /* active state got from url */}
        <nav aria-label="Main navigation" className="relative ml-auto flex h-full w-[22rem] items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex h-full flex-1 items-center justify-center whitespace-nowrap font-heading text-sm text-[#c7c9cc] transition-colors duration-300 hover:text-white",
                  isActive && "font-semibold text-white",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 h-0.5 rounded-full bg-[#f39200] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              left: `${(100 - activeBarWidth) / (2 * navItemCount)}%`,
              width: `${activeBarWidth / navItemCount}%`,
              transform: `translateX(${activeNavIndex * (100 / activeBarWidth) * 100}%)`,
            }}
          />
        </nav>

        <div className="ml-10 flex items-center gap-5">
          {rightContent ?? (
            <>
              {notificationButton}
              <span className="h-8 w-px bg-white/10" aria-hidden="true" />
              {userControl}
              {userActions}
            </>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        <div className="relative flex h-12 items-center justify-between px-4">
          <SidebarTrigger aria-label="Open navigation menu" className="text-[#d7d9dc] hover:bg-white/10 hover:text-white">
            <Menu className="size-5" />
          </SidebarTrigger>
          <NavLink to="/" aria-label={logoAlt} className="absolute left-1/2 shrink-0 -translate-x-1/2">
            <img src={logoSrc} alt={logoAlt} className="h-auto w-[100px] transition-transform duration-300 hover:scale-[1.02]" />
          </NavLink>
          {rightContent ?? notificationButton}
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center justify-between rounded-none bg-[#252a31] px-3 py-2">
            {userControl}
            {userActions}
          </div>
        </div>

      </div>
      </header>
    </SidebarProvider>
  )
}

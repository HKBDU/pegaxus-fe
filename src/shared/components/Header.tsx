import { House, MapPin, Menu, Truck } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import logo from "@/assets/logo-dark.png"
import { NotificationBell } from "@/features/notification"
import { SlidingSidebarMenu } from "@/shared/components/SlidingSidebarMenu"
import { ProfileDropdown } from "@/shared/components/ProfileDropdown"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/shared/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { HeaderProps } from "@/shared/types/props"
import type { HeaderNavItem, HeaderSidebarNavProps } from "@/shared/types/type"

const defaultNavItems: HeaderNavItem[] = [
  { label: "HOME", href: "/" },
  { label: "HORSE", href: "/my-horses" },
  { label: "BOOKING", href: "/bookings" },
]

/** "/" matches only the home page; the other items match their path and everything below it (plus `alsoActiveFor`). */
function isNavItemActive(item: HeaderNavItem, pathname: string) {
  if (item.href === "/") return pathname === "/"
  return [item.href, ...(item.alsoActiveFor ?? [])].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

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
            <SlidingSidebarMenu>
              {navItems.map((item, index) => {
                const isActive = isNavItemActive(item, location.pathname)
                const Icon = icons[index] ?? House

                return (
                  <SidebarMenuItem key={item.href} data-active-item={isActive || undefined}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-8 rounded-none px-3 font-heading text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca1a8] transition-[color,background-color,transform] duration-200 ease-out hover:translate-x-0.5 hover:bg-white/5 hover:text-white",
                        isActive && "!bg-[#f39200]/10 font-semibold !text-[#f39200]",
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
            </SlidingSidebarMenu>
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
  isLoggedIn = false,
  user = null,
  rightContent,
  className,
}: HeaderProps) {
  const location = useLocation()
  // -1 = the page belongs to no menu item (no item is highlighted, the bar is hidden).
  const matchedNavIndex = navItems.findIndex((item) => isNavItemActive(item, location.pathname))
  const activeNavIndex = Math.max(matchedNavIndex, 0)
  const navItemCount = Math.max(navItems.length, 1)
  const activeBarWidth = 65

  // Live unread count + latest notifications; only for a signed-in user.
  const notificationButton = isLoggedIn ? <NotificationBell /> : null

  return (
    <SidebarProvider defaultOpen={false} className="sticky top-0 z-50 !min-h-0 w-full">
      <HeaderSidebarNav navItems={navItems} />
      <header className={cn("site-header-enter sticky top-0 z-50 w-full border-b border-white/5 bg-[#17191c] text-white transition-[background-color,box-shadow] duration-300", className)}>
      <div className="mx-auto hidden h-12 w-full items-center px-8 lg:flex">
        <NavLink to="/" aria-label={logoAlt} className="shrink-0">
          <img src={logoSrc} alt={logoAlt} className="h-auto w-[138px] transition-transform duration-300 hover:scale-[1.02]" />
        </NavLink>
        { /* active state got from url */}
        {navItems.length > 0 ? <nav aria-label="Main navigation" className="relative ml-auto flex h-full w-[22rem] items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={cn(
                "relative flex h-full flex-1 items-center justify-center whitespace-nowrap font-heading text-sm text-[#c7c9cc] transition-colors duration-300 hover:text-white",
                isNavItemActive(item, location.pathname) && "font-semibold text-white",
              )}
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
              opacity: matchedNavIndex < 0 ? 0 : 1,
            }}
          />
        </nav> : null}

        <div className="ml-auto flex items-center gap-5">
          {rightContent ?? (
            <>
              {notificationButton}
              <span className="h-8 w-px bg-white/10" aria-hidden="true" />
              <ProfileDropdown isLoggedIn={isLoggedIn} user={user} />
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
          <div className="flex items-center gap-1">
            {rightContent ?? notificationButton}
            <ProfileDropdown isLoggedIn={isLoggedIn} user={user} />
          </div>
        </div>

      </div>
      </header>
    </SidebarProvider>
  )
}

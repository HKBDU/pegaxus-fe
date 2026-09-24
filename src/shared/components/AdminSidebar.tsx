import {
  BarChart3,
  House,
  LogOut,
  MapPin,
  Settings,
  ThumbsUp,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react"
import type { ComponentType, CSSProperties, ReactNode } from "react"
import { NavLink, useLocation } from "react-router-dom"

import logo from "@/assets/logo-dark.png"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/shared/components/ui/sidebar"

const primaryItems = [
  { label: "Dashboard", href: "/admin", icon: House },
  { label: "Transport Requests", href: "/admin/transport-requests", icon: Truck },
  { label: "Transport Plans", href: "/admin/transport-plans", icon: MapPin },
  { label: "Staff", href: "/admin/staff", icon: UsersRound },
  { label: "Transport Partners", href: "/admin/transport-partners", icon: ThumbsUp },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
]

const secondaryItems = [
  { label: "Profile", href: "/admin/profile", icon: UserRound },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Sign out", href: "/logout", icon: LogOut },
]

type AdminSidebarItem = {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

function AdminSidebarMenu({ items, compact = false }: { items: AdminSidebarItem[]; compact?: boolean }) {
  const { pathname } = useLocation()

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(
                compact
                  ? "h-8 rounded-none px-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca1a8] hover:bg-white/5 hover:text-white"
                  : "h-9 rounded-none px-4 text-xs font-medium uppercase tracking-[0.04em] text-[#9ca1a8] hover:bg-white/5 hover:text-white",
                isActive && "border-l-4 border-[#f39200] !bg-[#f39200]/10 pl-3 font-semibold !text-[#f39200]",
              )}
            >
              <NavLink to={item.href}>
                <Icon className="size-4" />
                <span>{item.label}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function AdminSidebar() {
  return (
    <Sidebar fixed={false} collapsible="offcanvas" className="sticky top-0 h-svh min-h-svh w-52 shrink-0 overflow-hidden border-r-0 bg-[#17191c] text-white">
      <div className="flex h-20 shrink-0 items-center justify-center bg-[#17191c] px-4">
        <img src={logo} alt="Pegaxus" className="w-full max-w-[170px]" />
      </div>
      <SidebarContent className="overflow-hidden bg-[#17191c]">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <AdminSidebarMenu items={primaryItems} compact />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="shrink-0 border-white/10 bg-[#17191c] px-0 py-4">
        <AdminSidebarMenu items={secondaryItems} compact />
      </SidebarFooter>
    </Sidebar>
  )
}

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": "13rem" } as CSSProperties}
      className="min-h-svh bg-[#f4f4f4]"
    >
      <AdminSidebar />
      {children}
    </SidebarProvider>
  )
}

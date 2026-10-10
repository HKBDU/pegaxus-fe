import {
  BarChart3,
  CarFront,
  CircleArrowLeft,
  ClipboardCheck,
  FileStack,
  Gauge,
  House,
  LogOut,
  MapPin,
  Settings,
  ThumbsUp,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react"
import type { CSSProperties } from "react"
import { NavLink, useLocation } from "react-router-dom"

import logo from "@/assets/logo-dark.png"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { ROLE_ROUTES } from "@/app/route-config"
import { SlidingSidebarMenu } from "@/shared/components/SlidingSidebarMenu"
import { cn } from "@/lib/utils"
import type { AdminSidebarMenuProps, AdminSidebarProviderProps } from "@/shared/types/type"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/shared/components/ui/sidebar"

const primaryItems = [
  { label: "Dashboard", href: "/admin", icon: House },
  { label: "Transport Requests", href: "/admin/transport-requests", icon: Truck },
  { label: "Transport Plans", href: "/admin/transport-plans", icon: MapPin },
  { label: "Compliance Catalog", href: ROLE_ROUTES.complianceRequirements, icon: ClipboardCheck },
  { label: "Dossier Templates", href: ROLE_ROUTES.dossierTemplates, icon: FileStack },
  { label: "Dossier Tracking", href: ROLE_ROUTES.complianceDossiers, icon: Gauge },
  { label: "Users", href: "/admin/users", icon: UsersRound },
  { label: "Vehicles", href: ROLE_ROUTES.vehicles, icon: CarFront },
  { label: "Transport Providers", href: ROLE_ROUTES.transportProviders, icon: ThumbsUp },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
]

const staffPrimaryItems = [
  { label: "Compliance Catalog", href: ROLE_ROUTES.complianceRequirements, icon: ClipboardCheck },
  { label: "Dossier Templates", href: ROLE_ROUTES.dossierTemplates, icon: FileStack },
  { label: "Dossier Tracking", href: ROLE_ROUTES.complianceDossiers, icon: Gauge },
]

const fleetCoordinatorItems = [
  { label: "Vehicles", href: ROLE_ROUTES.vehicles, icon: CarFront },
]

const staffSecondaryItems = [
  { label: "Profile", href: ROLE_ROUTES.customerProfile, icon: UserRound },
]

const secondaryItems = [
  { label: "Profile", href: "/admin/profile", icon: UserRound },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

const logoutItem = { label: "Sign Out", href: "/logout", icon: LogOut }

function AdminSidebarMenu({ items, compact = false }: AdminSidebarMenuProps) {
  const { pathname } = useLocation()

  return (
    <SlidingSidebarMenu>
      {items.map((item) => {
        const isActive = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <SidebarMenuItem key={item.href} data-active-item={isActive || undefined}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(
                compact
                  ? "h-8 rounded-none px-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca1a8] transition-[color,background-color,transform] duration-200 ease-out hover:translate-x-0.5 hover:bg-white/5 hover:text-white"
                  : "h-9 rounded-none px-4 text-xs font-medium uppercase tracking-[0.04em] text-[#9ca1a8] transition-[color,background-color,transform] duration-200 ease-out hover:translate-x-0.5 hover:bg-white/5 hover:text-white",
                isActive && "!bg-[#f39200]/10 font-semibold !text-[#f39200]",
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
    </SlidingSidebarMenu>
  )
}

export function AdminSidebar() {
  const { setOpen } = useSidebar()
  const principal = useAuthStore((state) => state.principal)
  // Logistics managers get the full admin menu; other employees (e.g. Transport Specialist) only their own pages.
  const isManager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const isFleetCoordinator = canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })

  return (
    <Sidebar fixed={false} collapsible="offcanvas" className="sticky top-0 h-svh min-h-svh shrink-0 overflow-hidden border-r-0 bg-[#17191c] text-white">
      <div className="flex h-20 shrink-0 items-center justify-center bg-[#17191c] px-4">
        <img src={logo} alt="Pegaxus" className="w-full max-w-[170px]" />
      </div>
      <SidebarContent className="overflow-hidden bg-[#17191c]">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <AdminSidebarMenu items={isManager ? primaryItems : isFleetCoordinator ? fleetCoordinatorItems : staffPrimaryItems} compact />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="shrink-0 border-white/10 bg-[#17191c] px-0 py-4">
        <AdminSidebarMenu items={isManager ? secondaryItems : staffSecondaryItems} compact />
        <div className="lg:hidden">
          <AdminSidebarMenu items={[logoutItem]} compact />
        </div>
        <div className="hidden lg:block">
          <AdminSidebarMenu items={[logoutItem]} compact />
        </div>
        <SlidingSidebarMenu>
          <SidebarMenuItem className="hidden lg:block" data-active-item="false">
            <SidebarMenuButton
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close sidebar"
              className="h-8 justify-end rounded-none px-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca1a8] hover:bg-white/5 hover:text-white"
            >
              <CircleArrowLeft className="!size-8 mr-3  shrink-0" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SlidingSidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function AdminSidebarProvider({ children }: AdminSidebarProviderProps) {
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

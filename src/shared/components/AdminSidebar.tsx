import {
  Archive,
  CarFront,
  ClipboardCheck,
  FileStack,
  FileText,
  Gauge,
  House,
  LogOut,
  MapPin,
  MessageSquareWarning,
  ThumbsUp,
  TriangleAlert,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react"
import type { CSSProperties } from "react"
import { NavLink, useLocation } from "react-router-dom"

import logo from "@/assets/logo-dark.png"
import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { APPROVED_BOOKINGS_ACCESS, INCIDENT_ADMIN_ACCESS, ONGOING_TRANSPORT_ACCESS, ROLE_ROUTES } from "@/app/route-config"
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
} from "@/shared/components/ui/sidebar"

const incidentsItem = { label: "Incidents", href: ROLE_ROUTES.incidents, icon: TriangleAlert }

const primaryItems = [
  { label: "Dashboard", href: "/admin", icon: House },
  { label: "Transport Requests", href: "/admin/transport-requests", icon: Truck },
  { label: "Transport Plans", href: ROLE_ROUTES.transportPlans, icon: MapPin },
  { label: "Ongoing Transports", href: ROLE_ROUTES.ongoingTransports, icon: Truck },
  incidentsItem,
  { label: "Invoices", href: ROLE_ROUTES.invoices, icon: FileText },
  { label: "Claims", href: ROLE_ROUTES.claims, icon: MessageSquareWarning },
  { label: "Transport Archive & Audit", href: ROLE_ROUTES.transportArchive, icon: Archive },
  { label: "Compliance Catalog", href: ROLE_ROUTES.complianceRequirements, icon: ClipboardCheck },
  { label: "Dossier Tracking", href: ROLE_ROUTES.complianceDossiers, icon: Gauge },
  { label: "Users", href: "/admin/users", icon: UsersRound },
  { label: "Vehicles", href: ROLE_ROUTES.vehicles, icon: CarFront },
  { label: "Transport Providers", href: ROLE_ROUTES.transportProviders, icon: ThumbsUp },
]

const staffPrimaryItems = [
  { label: "Compliance Catalog", href: ROLE_ROUTES.complianceRequirements, icon: ClipboardCheck },
  { label: "Dossier Templates", href: ROLE_ROUTES.dossierTemplates, icon: FileStack },
  { label: "Dossier Tracking", href: ROLE_ROUTES.complianceDossiers, icon: Gauge },
]

const routeCoordinatorItems = [
  { label: "Vehicles", href: ROLE_ROUTES.vehicles, icon: CarFront },
  { label: "Route Plans", href: ROLE_ROUTES.routePlans, icon: MapPin },
  { label: "Map Assets", href: ROLE_ROUTES.mapAssets, icon: MapPin },
]

const crewItems = [
  { label: "Ongoing Transport", href: "/crew", icon: Gauge },
  { label: "Assigned Transports", href: "/crew/transports", icon: Truck },
]

const approvedBookingsItem = { label: "Approved Bookings", href: ROLE_ROUTES.approvedBookings, icon: ClipboardCheck }

const staffSecondaryItems = [
  { label: "Profile", href: ROLE_ROUTES.customerProfile, icon: UserRound },
]

const secondaryItems = [
  { label: "Profile", href: "/admin/profile", icon: UserRound },
]

const logoutItem = { label: "Sign Out", href: "/logout", icon: LogOut }

function AdminSidebarMenu({ items, compact = false }: AdminSidebarMenuProps) {
  const { pathname } = useLocation()

  return (
    <SlidingSidebarMenu>
      {items.map((item) => {
        const isActive = item.href === "/admin" || item.href === "/crew" ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <SidebarMenuItem key={item.href} data-active-item={isActive || undefined}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.label}
              className={cn(
                compact
                  ? "h-8 rounded-none px-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca1a8] transition-[color,background-color,transform] duration-200 ease-out hover:translate-x-0.5 hover:bg-white/5 hover:text-white"
                  : "h-9 rounded-none px-4 text-xs font-medium uppercase tracking-[0.04em] text-[#9ca1a8] transition-[color,background-color,transform] duration-200 ease-out hover:translate-x-0.5 hover:bg-white/5 hover:text-white",
                isActive && "!bg-[#f39200]/10 font-semibold !text-[#f39200]",
              )}
            >
              <NavLink to={item.href}>
                <Icon className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SlidingSidebarMenu>
  )
}

export function AdminSidebar() {
  const principal = useAuthStore((state) => state.principal)
  // Logistics managers get the full admin menu; other employees (e.g. Transport Specialist) only their own pages.
  const isManager = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] })
  const isRouteCoordinator = canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] })
  // Drivers and escorts only have their assigned transports.
  const isCrew = canAccess(principal, { anyRole: ["DRIVER", "ESCORT"] })
  const items = isCrew ? crewItems : isManager ? primaryItems : [
    ...(canAccess(principal, APPROVED_BOOKINGS_ACCESS) ? [approvedBookingsItem] : []),
    ...(canAccess(principal, ONGOING_TRANSPORT_ACCESS) ? [{ label: "Ongoing Transports", href: ROLE_ROUTES.ongoingTransports, icon: Truck }] : []),
    ...(canAccess(principal, INCIDENT_ADMIN_ACCESS) ? [incidentsItem] : []),
    ...(isRouteCoordinator ? routeCoordinatorItems : staffPrimaryItems),
  ]

  return (
    <Sidebar fixed={false} collapsible="icon" className="sticky top-0 h-svh min-h-svh shrink-0 overflow-hidden border-r-0 bg-[#17191c] text-white">
      <div className="relative flex h-20 shrink-0 items-center justify-center bg-[#17191c] px-4 group-data-[collapsible=icon]:px-2">
        <img alt="Pegaxus" src={logo} className="w-full max-w-[170px] group-data-[collapsible=icon]:hidden" />
      </div>
      <SidebarContent className="overflow-y-auto overflow-x-hidden bg-[#17191c]">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <AdminSidebarMenu items={items} compact />
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

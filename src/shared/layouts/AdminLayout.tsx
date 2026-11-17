import { Outlet, useLocation } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { canAccess } from "@/features/auth/access-control"
import { getAdminHeaderContext } from "@/app/route-config"
import { toTitleCase } from "@/lib/fancy-text"
import { usePageTitle } from "@/shared/hooks/usePageTitle"
import { IncidentAlertHost } from "@/features/incident-management/components/alerts/IncidentAlertHost"
import { AdminHeader } from "@/shared/components/AdminHeader"
import { AdminSidebarProvider } from "@/shared/components/AdminSidebar"
import { SidebarInset } from "@/shared/components/ui/sidebar"

export function AdminLayout() {
  const { pathname } = useLocation()
  const principal = useAuthStore((state) => state.principal)
  const isCrew = canAccess(principal, { anyRole: ["DRIVER", "ESCORT"] })
  const context = getAdminHeaderContext(pathname, isCrew)
  const defaultPage = context.title || context.label
  usePageTitle(defaultPage ? toTitleCase(defaultPage) : undefined)

  return (
    <AdminSidebarProvider>
      <SidebarInset className="min-w-0 bg-[#f4f2ed]">
        <div className="sticky top-0 z-50">
          <AdminHeader />
          <IncidentAlertHost />
        </div>
        <Outlet />
      </SidebarInset>
    </AdminSidebarProvider>
  )
}


import { Outlet } from "react-router-dom"

import { AdminHeader } from "@/shared/components/AdminHeader"
import { AdminSidebarProvider } from "@/shared/components/AdminSidebar"
import { SidebarInset } from "@/shared/components/ui/sidebar"

export function AdminLayout() {
  return (
    <AdminSidebarProvider>
      <SidebarInset className="min-w-0 bg-[#f4f2ed]">
        <div className="sticky top-0 z-50">
          <AdminHeader />
        </div>
        <Outlet />
      </SidebarInset>
    </AdminSidebarProvider>
  )
}

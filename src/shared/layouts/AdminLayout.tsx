import { Outlet } from "react-router-dom"
import { Menu } from "lucide-react"

import { AdminHeader } from "@/shared/components/AdminHeader"
import { AdminSidebarProvider } from "@/shared/components/AdminSidebar"
import { SidebarInset, SidebarTrigger } from "@/shared/components/ui/sidebar"

export function AdminLayout() {
  return (
    <AdminSidebarProvider>
      <SidebarInset>
        <div className="flex h-14 items-center border-b border-[#202329] bg-[#17191c] px-4 lg:hidden">
          <SidebarTrigger aria-label="Open admin navigation" className="text-[#d7d9dc] hover:bg-white/10 hover:text-white">
            <Menu className="size-5" />
          </SidebarTrigger>
        </div>
        <AdminHeader />
        <Outlet />
     
      </SidebarInset>
    </AdminSidebarProvider>
  )
}

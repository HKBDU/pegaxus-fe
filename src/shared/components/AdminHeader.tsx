import { ChevronRight, Menu, PanelLeftOpen } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { SidebarTrigger, useSidebar } from "@/shared/components/ui/sidebar"
import { getAdminHeaderContext } from "@/app/route-config"

export function AdminHeader() {
  const { pathname } = useLocation()
  const context = getAdminHeaderContext(pathname)
  const { open } = useSidebar()

  return (
    <header className="site-header-enter flex min-h-12 items-center gap-2 border-b border-[#202329] bg-[#17191c] px-2 text-white transition-[background-color,box-shadow] duration-300 sm:px-4 lg:px-6">
      <SidebarTrigger aria-label="Open admin navigation" className="shrink-0 text-[#d7d9dc] hover:bg-white/10 hover:text-white lg:hidden">
        <Menu className="size-5" />
      </SidebarTrigger>
      {!open ? (
        <SidebarTrigger aria-label="Show admin navigation" className="hidden size-7 shrink-0 text-[#d7d9dc] hover:bg-white/10 hover:text-white lg:inline-flex">
          <PanelLeftOpen className="size-4" />
        </SidebarTrigger>
      ) : null}
      <nav aria-label="Admin page path" className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-[10px] font-semibold tracking-[0.08em]">
        <Link to={context.href} className="text-[#f39200] transition-colors hover:text-[#ffad33]">{context.label}</Link>
        {context.title ? (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-[#5f6670]" aria-hidden="true" />
            <span className="text-[#d7d9dc]">{context.title}</span>
          </>
        ) : null}
      </nav>
    </header>
  )
}

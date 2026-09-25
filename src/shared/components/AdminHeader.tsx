import { ChevronRight, Menu } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { SidebarTrigger } from "@/shared/components/ui/sidebar"

export function AdminHeader() {
  const { pathname } = useLocation()
  const isDetails = /^\/admin\/transport-requests\/\d+\/?$/.test(pathname)

  return (
    <header className="flex min-h-14 items-center gap-2 border-b border-[#202329] bg-[#17191c] px-2 text-white sm:px-4 lg:px-6">
      <SidebarTrigger aria-label="Open admin navigation" className="shrink-0 text-[#d7d9dc] hover:bg-white/10 hover:text-white lg:hidden">
        <Menu className="size-5" />
      </SidebarTrigger>
      <nav aria-label="Admin booking path" className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs font-medium tracking-[0.06em]">
        <Link to="/admin/transport-requests" className="text-[#f39200] transition-colors hover:text-[#ffad33]">TRANSPORT REQUESTS</Link>
        {isDetails ? (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-[#5f6670]" aria-hidden="true" />
            <span className="text-[#d7d9dc]">BOOKING DETAILS</span>
          </>
        ) : null}
      </nav>
    </header>
  )
}

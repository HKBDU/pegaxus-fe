import { Fragment } from "react"
import { NavLink, useLocation } from "react-router-dom"

import { cn } from "@/lib/utils"

const adminHeaderLinks = [
  { label: "VIEW BOOKINGS", href: "/admin/transport-requests" },
  { label: "VIEW BOOKING DETAILS", href: "/admin/transport-requests/details" },
  { label: "APPROVE BOOKING", href: "/admin/transport-requests/approve" },
]

export function AdminHeader() {
  const { pathname } = useLocation()
  const activeIndex = adminHeaderLinks.reduce(
    (currentIndex, link, index) =>
      pathname === link.href || pathname.startsWith(`${link.href}/`) ? index : currentIndex,
    -1,
  )

  return (
    <header className="site-header-enter border-b border-[#202329] bg-[#17191c] text-white transition-[background-color,box-shadow] duration-300">
      <nav aria-label="Admin booking path" className="overflow-x-auto px-6">
        <ol className="flex min-h-12 items-center whitespace-nowrap text-[10px] font-semibold tracking-[0.08em]">
          {adminHeaderLinks.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 && <li className="px-3 text-[#5f6670]" aria-hidden="true">/</li>}
              <li>
                <NavLink
                  to={link.href}
                  className={cn(
                    "text-[#9ca1a8] transition-colors hover:text-white",
                    index <= activeIndex && "text-[#f39200]",
                  )}
                >
                  {link.label}
                </NavLink>
              </li>
            </Fragment>
          ))}
        </ol>
      </nav>
    </header>
  )
}

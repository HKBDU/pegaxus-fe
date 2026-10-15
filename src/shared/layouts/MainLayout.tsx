import { Outlet } from "react-router-dom"
import { useLocation } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { canAccess } from "@/features/auth/access-control"
import { useUser } from "@/features/auth/hooks/useAuth"
import type { AuthAccount } from "@/features/auth/types"
import { Footer } from "@/shared/components/Footer"
import { Header } from "@/shared/components/Header"
import { AdminLayout } from "@/shared/layouts/AdminLayout"
import type { ProfileDropdownUser } from "@/shared/components/ProfileDropdown"
import type { HeaderNavItem } from "@/shared/types/type"

const customerNavItems: HeaderNavItem[] = [
  { label: "HOME", href: "/" },
  { label: "HORSE", href: "/my-horses" },
  { label: "BOOKING", href: "/bookings" },
]

function toHeaderUser(profile: AuthAccount): ProfileDropdownUser {
  const name = profile.fullName || profile.email
  return {
    name,
    email: profile.email,
    avatarUrl: profile.avatarUrl ?? undefined,
  }
}

export function MainLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === "/"
  const { data: account } = useUser()
  const accessToken = useAuthStore((state) => state.accessToken)
  const principal = useAuthStore((state) => state.principal)
  const { pathname } = useLocation()

  // Employee-facing routes use the desktop admin shell consistently, including
  // roles whose routes are shared with the customer-facing application.
  if (pathname !== "/" && accessToken && principal && !canAccess(principal, { anyRole: ["CUSTOMER"] })) {
    return <AdminLayout />
  }

  const navItems = !accessToken || canAccess(principal, { anyRole: ["CUSTOMER"] }) ? customerNavItems : []
  const user: ProfileDropdownUser | null = accessToken && account
    ? toHeaderUser(account)
    : accessToken && principal
      ? { name: principal.displayName ?? "Account", email: principal.email ?? "" }
      : accessToken
        ? { name: "Account", email: "" }
        : null

  return (
    <div className="flex min-h-screen flex-col">
      {!isLanding && <Header navItems={navItems} isLoggedIn={Boolean(accessToken)} user={user} />}
      <main className="min-h-[calc(100svh-3rem)] flex-none">
        <Outlet /> {/* Outlet - React Router render route childs*/}
      </main>
      {!isLanding && <Footer />}
    </div>
  )
}

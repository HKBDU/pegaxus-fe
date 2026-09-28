import { Outlet } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { useUser } from "@/features/auth/hooks/useAuth"
import type { AuthAccount } from "@/features/auth/types"
import { Footer } from "@/shared/components/Footer"
import { Header } from "@/shared/components/Header"
import type { ProfileDropdownUser } from "@/shared/components/ProfileDropdown"

function toHeaderUser(profile: AuthAccount): ProfileDropdownUser {
  const name = profile.fullName || profile.email
  return {
    name,
    email: profile.email,
    avatarUrl: profile.avatarUrl ?? undefined,
  }
}

export function MainLayout() {
  const { data: account } = useUser()
  const accessToken = useAuthStore((state) => state.accessToken)
  const principal = useAuthStore((state) => state.principal)
  const user: ProfileDropdownUser | null = accessToken && account
    ? toHeaderUser(account)
    : accessToken && principal
      ? { name: principal.displayName ?? "Account", email: principal.email ?? "" }
      : accessToken
        ? { name: "Account", email: "" }
        : null

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={Boolean(accessToken)} user={user} />
      <main className="flex-1">
        <Outlet /> {/* Outlet - React Router render route childs*/}
      </main>
      <Footer />
    </div>
  )
}

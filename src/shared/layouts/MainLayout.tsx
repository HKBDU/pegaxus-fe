import { Link, Outlet } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { useUser } from "@/features/auth/hooks/useAuth"
import type { AuthAccount } from "@/features/auth/types"
import { Footer } from "@/shared/components/Footer"
import { Header } from "@/shared/components/Header"
import type { HeaderUser } from "@/shared/types/type"

function toHeaderUser(profile: AuthAccount): HeaderUser {
  const name = profile.fullName || profile.email
  return {
    name,
    role: profile.role,
    initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    avatarSrc: profile.avatarUrl ?? undefined,
  }
}

export function MainLayout() {
  const { data: account } = useUser()
  const accessToken = useAuthStore((state) => state.accessToken)
  const principal = useAuthStore((state) => state.principal)
  const user: HeaderUser = accessToken && account
    ? toHeaderUser(account)
    : accessToken && principal
      ? { name: principal.displayName ?? "Account", role: principal.roles.join(", "), initials: (principal.displayName ?? "Account").slice(0, 2).toUpperCase() }
      : { name: "Guest", role: "Visitor", initials: "G" }

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} userActions={
        <Link to={accessToken ? "/logout" : "/login"} className="shrink-0 text-xs text-white hover:underline">
          {accessToken ? "Sign out" : "Sign in"}
        </Link>
      } />
      <main className="flex-1">
        <Outlet /> {/* Outlet - React Router render route childs*/}
      </main>
      <Footer />
    </div>
  )
}

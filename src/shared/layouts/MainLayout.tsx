import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { profileApi } from "@/features/profile/services"
import type { Profile } from "@/features/profile/types"
import { Footer } from "@/shared/components/Footer"
import { Header } from "@/shared/components/Header"
import type { HeaderUser } from "@/shared/types/type"

function toHeaderUser(profile: Profile): HeaderUser {
  const name = profile.fullName || profile.email
  return {
    name,
    role: profile.role,
    initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    avatarSrc: profile.avatarUrl ?? undefined,
  }
}

export function MainLayout() {
  const [user, setUser] = useState<HeaderUser>()
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (!accessToken) return
    profileApi.getMe().then((profile) => setUser(toHeaderUser(profile))).catch(() => undefined)
  }, [accessToken])

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="flex-1">
        <Outlet /> {/* Outlet - React Router render route childs*/}
      </main>
      <Footer />
    </div>
  )
}

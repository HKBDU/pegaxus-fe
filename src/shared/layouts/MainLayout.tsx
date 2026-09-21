import { Outlet } from "react-router-dom"

import { Footer } from "@/shared/components/Footer"
import { Header } from "@/shared/components/Header"

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet /> // Outlet - React Router render route childs
      </main>
      <Footer />
    </div>
  )
}

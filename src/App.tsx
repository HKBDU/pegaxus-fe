import { BrowserRouter, Route, Routes } from "react-router-dom"

import { MainLayout } from "@/shared/layouts/MainLayout"

function HomePage() {
  return (
    <section className="mx-auto max-w-7xl px-8 py-12">
      <h1 className="text-3xl font-semibold">Welcome to Pegaxus</h1>
      <p className="mt-2 text-muted-foreground">Home page placeholder.</p>
    </section>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-7xl px-8 py-12">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">Page placeholder.</p>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="transport-requests" element={<PlaceholderPage title="Transport Requests" />} />
          <Route path="my-horses" element={<PlaceholderPage title="My Horses" />} />
          <Route path="profile-settings" element={<PlaceholderPage title="Profile Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

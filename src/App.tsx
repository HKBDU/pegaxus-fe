import { BrowserRouter, Route, Routes } from "react-router-dom"

import { MainLayout } from "@/shared/layouts/MainLayout"
import { AdminLayout } from "@/shared/layouts/AdminLayout"

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

function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-8 py-12">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">Admin page placeholder.</p>
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
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminPlaceholderPage title="Dashboard" />} />
          <Route path="transport-requests" element={<AdminPlaceholderPage title="Transport Requests" />} />
          <Route path="transport-requests/details" element={<AdminPlaceholderPage title="Booking Details" />} />
          <Route path="transport-requests/approve" element={<AdminPlaceholderPage title="Approve Booking" />} />
          <Route path="transport-plans" element={<AdminPlaceholderPage title="Transport Plans" />} />
          <Route path="staff" element={<AdminPlaceholderPage title="Staff" />} />
          <Route path="transport-partners" element={<AdminPlaceholderPage title="Transport Partners" />} />
          <Route path="reports" element={<AdminPlaceholderPage title="Reports" />} />
          <Route path="profile" element={<AdminPlaceholderPage title="Profile" />} />
          <Route path="settings" element={<AdminPlaceholderPage title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

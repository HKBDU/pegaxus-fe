import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { getPostLoginPath } from '@/app/route-config'

interface GuestRouteProps {
  children?: ReactNode
  authenticatedPath?: string
}

export function GuestRoute({ children, authenticatedPath }: GuestRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const principal = useAuthStore((state) => state.principal)
  const role = principal?.roles[0]

  if (accessToken) {
    return <Navigate to={authenticatedPath ?? (role ? getPostLoginPath(role) : '/')} replace />
  }

  return children ?? <Outlet />
}

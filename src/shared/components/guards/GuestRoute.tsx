import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { getPostLoginPath, requestedPath } from '@/app/route-config'

interface GuestRouteProps {
  children?: ReactNode
  authenticatedPath?: string
}

export function GuestRoute({ children, authenticatedPath }: GuestRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const principal = useAuthStore((state) => state.principal)
  const role = principal?.roles[0]
  const location = useLocation()

  if (accessToken) {
    // Signing in re-renders this guard before the login mutation navigates: send the user to the page they asked for
    // (ProtectedRoute's state.from), not to the role home. getPostLoginPath keeps only safe internal paths.
    return <Navigate to={authenticatedPath ?? (role ? getPostLoginPath(role, requestedPath(location.state)) : '/')} replace />
  }

  return children ?? <Outlet />
}

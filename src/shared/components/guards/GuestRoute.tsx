import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'

interface GuestRouteProps {
  children?: ReactNode
  authenticatedPath?: string
}

export function GuestRoute({ children, authenticatedPath = '/' }: GuestRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken)

  if (accessToken) return <Navigate to={authenticatedPath} replace />

  return children ?? <Outlet />
}

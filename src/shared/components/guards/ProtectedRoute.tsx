import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import type { Permission, Role } from '@/features/auth/types'
import { canAccess } from '@/features/auth/access-control'

interface ProtectedRouteProps {
  children?: ReactNode
  allowedRoles?: Role[]
  allowedPermissions?: Permission[]
}

export function ProtectedRoute({
  children,
  allowedRoles,
  allowedPermissions,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { accessToken, principal } = useAuthStore()

  if (!accessToken) {
    const state = /^\/logout\/?$/i.test(location.pathname) ? null : { from: location }
    return <Navigate to="/login" state={state} replace />
  }

  if (!canAccess(principal, { anyRole: allowedRoles, allPermissions: allowedPermissions })) {
    return <Navigate to="/unauthorized" replace />
  }

  return children ?? <Outlet />
}

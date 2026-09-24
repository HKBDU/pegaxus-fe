import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import type { Permission, Role } from '@/features/auth/types'

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
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const hasAllowedRole =
    !allowedRoles?.length || allowedRoles.some((role) => principal?.roles.includes(role))
  const hasAllowedPermission =
    !allowedPermissions?.length ||
    allowedPermissions.every((permission) => principal?.permissions.includes(permission))

  if (!hasAllowedRole || !hasAllowedPermission) {
    return <Navigate to="/unauthorized" replace />
  }

  return children ?? <Outlet />
}

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
  const accessToken = useAuthStore((state) => state.accessToken)
  const principal = useAuthStore((state) => state.principal)

  // [DEMO-MOCK] Allow direct testing of GPS Simulator without requiring login
  if (
    location.pathname.includes('/transports/demo') ||
    location.pathname.includes('/ongoing-transports/demo')
  ) {
    if (!accessToken) {
      useAuthStore.setState({
        sessionVersion: 1,
        accessToken: "demo-jwt-token",
        refreshToken: "demo-refresh-token",
        expiresIn: 3600,
        user: {
          accountId: "demo-user-01",
          email: "demo@pegaxus.com",
          fullName: "Alex Turner (Demo Lead)",
          role: "LOGISTICS_MANAGER",
          status: "ACTIVE",
        },
        principal: {
          id: "demo-user-01",
          displayName: "Alex Turner (Demo Lead)",
          roles: [
            "DRIVER",
            "LOGISTICS_MANAGER",
            "TRANSPORT_SPECIALIST",
            "FLEET_ROUTE_COORDINATOR",
            "ADMIN",
          ],
          permissions: [],
        },
      });
    }
    return children ?? <Outlet />
  }

  if (!accessToken) {
    const state = /^\/logout\/?$/i.test(location.pathname) ? null : { from: location }
    return <Navigate to="/login" state={state} replace />
  }

  if (!canAccess(principal, { anyRole: allowedRoles, allPermissions: allowedPermissions })) {
    return <Navigate to="/unauthorized" replace />
  }

  return children ?? <Outlet />
}

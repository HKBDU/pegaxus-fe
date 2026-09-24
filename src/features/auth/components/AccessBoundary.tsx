import type { ReactNode } from 'react'
import { canAccess } from '@/features/auth/access-control'
import { useAuthStore } from '@/features/auth/store'
import type { AccessPolicy } from '@/features/auth/access-control'

interface AccessBoundaryProps {
  policy: AccessPolicy
  children: ReactNode
  fallback?: ReactNode
}

export function AccessBoundary({ policy, children, fallback = null }: AccessBoundaryProps) {
  const principal = useAuthStore((state) => state.principal)
  return canAccess(principal, policy) ? children : fallback
}

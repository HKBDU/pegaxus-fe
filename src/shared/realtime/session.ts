import { useAuthStore } from "@/features/auth/store"

export function captureNotificationSession() {
  const { sessionVersion, principal } = useAuthStore.getState()
  return { sessionVersion, accountId: principal?.id, principal }
}

export function isNotificationSessionCurrent(owner: ReturnType<typeof captureNotificationSession>) {
  const current = useAuthStore.getState()
  return Boolean(current.accessToken) && current.sessionVersion === owner.sessionVersion &&
    current.principal?.id === owner.accountId
}

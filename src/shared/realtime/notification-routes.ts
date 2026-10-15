import type { AuthPrincipal } from "@/features/auth/types"
import type { AppNotification } from "./types"

/**
 * Where a notification leads when the user clicks it. `shared` only keeps the registry; each FEATURE registers the
 * `referenceType`s it owns in its own `notification-routes.ts` (collected in `app/notification-routes.ts`):
 *
 *   registerNotificationRoute("RoutePlan", (id) => routePlanDetail(id))
 *
 * Return null from a resolver when that viewer has nowhere to go (wrong role, missing data).
 */
export type NotificationRouteResolver = (referenceId: string, principal: AuthPrincipal | null) => string | null

const resolvers = new Map<string, NotificationRouteResolver>()

/** Idempotent (the last registration wins), so hot reload cannot duplicate entries. */
export function registerNotificationRoute(referenceType: string, resolver: NotificationRouteResolver) {
  resolvers.set(referenceType, resolver)
}

/**
 * 1. `actionUrl` when the BE sent one (REST rows have it; the realtime push does not carry it today).
 * 2. Otherwise the resolver registered for `referenceType`.
 * 3. null: the notification just opens the inbox.
 */
export function resolveNotificationPath(notification: AppNotification, principal: AuthPrincipal | null): string | null {
  const url = notification.actionUrl
  if (url && url.startsWith("/") && !url.startsWith("//")) return url
  if (!notification.referenceType || !notification.referenceId) return null
  return resolvers.get(notification.referenceType)?.(notification.referenceId, principal) ?? null
}

import { routePlanIdSchema } from "./schemas"
import type { RouteDetailPath } from "./types"

// Only the existing DEV route is registered in this checkout. No guessed production path.
export function getRouteDetailPath(env: { DEV?: boolean; PROD?: boolean } = import.meta.env): RouteDetailPath | undefined {
  if (import.meta.env.PROD) return undefined
  return env.DEV && !env.PROD
    ? (id) => `/__dev/flow3/route-plans/${encodeURIComponent(routePlanIdSchema.parse(id))}`
    : undefined
}

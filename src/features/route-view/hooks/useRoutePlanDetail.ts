import { useQuery } from "@tanstack/react-query"
import { routePlansQuerySchema } from "../schemas"
import { actionEntityIdSchema } from "@/features/transport-plan/schemas"
import { getRouteViewError, routeViewService } from "../services"
import type { RoutePlansQuery } from "../types"

export const routeViewKeys = {
  detail: (id: string) => ["route-view", "detail", id] as const,
  list: (planId: string, params: RoutePlansQuery) => ["route-view", "list", planId, params] as const,
}
const retry = (count: number, error: unknown) => count < 1 && getRouteViewError(error).retryable
export function useRoutePlanDetail(id: string, enabled = true) {
  return useQuery({ queryKey: routeViewKeys.detail(id), queryFn: ({ signal }) => routeViewService.getRoute(id, signal),
    enabled: enabled && actionEntityIdSchema.safeParse(id).success, retry })
}
export function useRoutePlanAlternatives(planId: string, params: RoutePlansQuery = {}, enabled = true) {
  const parsed = routePlansQuerySchema.safeParse(params)
  return useQuery({ queryKey: routeViewKeys.list(planId, parsed.success ? parsed.data : params),
    queryFn: ({ signal }) => routeViewService.getRoutes(planId, params, signal),
    enabled: enabled && parsed.success && actionEntityIdSchema.safeParse(planId).success, retry })
}

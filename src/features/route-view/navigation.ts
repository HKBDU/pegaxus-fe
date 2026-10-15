import { routePlanDetail } from "@/app/route-config"
import { actionEntityIdSchema } from "@/features/transport-plan/schemas"
import type { RouteDetailPath } from "./types"

// UC-38 route plan detail: /admin/route-plans/:routePlanId (registered in the app router for LM, RC and TS).
export function getRouteDetailPath(): RouteDetailPath {
  return (id) => routePlanDetail(actionEntityIdSchema.parse(id))
}

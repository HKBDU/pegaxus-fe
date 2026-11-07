import { useQuery, type QueryClient } from "@tanstack/react-query";
import { routePlansQuerySchema } from "../schemas";
import { actionEntityIdSchema } from "@/features/transport-plan/schemas";
import { getRouteViewError, routeViewService } from "../services";
import type { RoutePlansQuery } from "../types";

export const routeViewKeys = {
  detail: (id: string) => ["route-view", "detail", id] as const,
  list: (planId: string, params: RoutePlansQuery) =>
    ["route-view", "list", planId, params] as const,
};

const SUBMIT_REFRESH_DELAYS_MS = [0, 500, 1000, 2000] as const;
const wait = (ms: number) => ms === 0 ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, ms));

function hasSubmittedRoute(value: unknown, routePlanId: string) {
  if (!value || typeof value !== "object") return false;
  if ("legalReviewRequested" in value)
    return (value as { legalReviewRequested?: boolean }).legalReviewRequested === true;
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) && items.some((item) =>
    item && typeof item === "object" &&
    (item as { routePlanId?: string }).routePlanId === routePlanId &&
    (item as { legalReviewRequested?: boolean }).legalReviewRequested === true,
  );
}

export async function refreshRouteSubmissionQueries(
  client: QueryClient,
  routePlanId: string,
) {
  for (const delay of SUBMIT_REFRESH_DELAYS_MS) {
    await wait(delay);
    await Promise.all([
      client.refetchQueries({ queryKey: routeViewKeys.detail(routePlanId), type: "active" }),
      client.refetchQueries({
        queryKey: ["route-view", "list"],
        type: "active",
        predicate: (query) => query.queryKey[0] === "route-view" && query.queryKey[1] === "list",
      }),
    ]);
    const detail = client.getQueryData(routeViewKeys.detail(routePlanId));
    const listHasSubmission = client.getQueryCache().findAll({ queryKey: ["route-view", "list"] })
      .some((query) => hasSubmittedRoute(query.state.data, routePlanId));
    if (hasSubmittedRoute(detail, routePlanId) || listHasSubmission)
      return { synced: true, attempts: SUBMIT_REFRESH_DELAYS_MS.indexOf(delay) + 1 };
  }
  return { synced: false, attempts: SUBMIT_REFRESH_DELAYS_MS.length };
}

export const refreshRouteAfterSubmit = refreshRouteSubmissionQueries;
const retry = (count: number, error: unknown) =>
  count < 1 && getRouteViewError(error).retryable;
export function useRoutePlanDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: routeViewKeys.detail(id),
    queryFn: ({ signal }) => routeViewService.getRoute(id, signal),
    enabled: enabled && actionEntityIdSchema.safeParse(id).success,
    retry,
  });
}
export function useRoutePlanAlternatives(
  planId: string,
  params: RoutePlansQuery = {},
  enabled = true,
) {
  const parsed = routePlansQuerySchema.safeParse(params);
  return useQuery({
    queryKey: routeViewKeys.list(planId, parsed.success ? parsed.data : params),
    queryFn: ({ signal }) => routeViewService.getRoutes(planId, params, signal),
    enabled:
      enabled &&
      parsed.success &&
      actionEntityIdSchema.safeParse(planId).success,
    retry,
  });
}

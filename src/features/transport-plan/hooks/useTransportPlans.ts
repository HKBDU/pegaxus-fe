import { useQuery } from "@tanstack/react-query"
import type { EntityId } from "@/shared/types"
import { buildTransportPlanQuery, getTransportPlanError, transportPlanService } from "../transport-plan.services"
import { transportPlanIdSchema } from "../transport-plan.schemas"
import type { TransportPlansQueryParams } from "../transport-plan.types"

export const transportPlanKeys = {
  all: ["transport-plans"] as const,
  list: (params: TransportPlansQueryParams) => ["transport-plans", "list", buildTransportPlanQuery(params)] as const,
  detail: (id: EntityId) => ["transport-plans", "detail", String(id)] as const,
  quotation: (id: EntityId) => ["transport-plans", "quotation", String(id)] as const,
  assignments: (id: EntityId) => ["transport-plans", "assignments", String(id)] as const,
}
const retry = (count: number, error: Error) => count < 1 && getTransportPlanError(error).retryable
export function useTransportPlans(params: TransportPlansQueryParams, enabled = true) {
  return useQuery({ queryKey: transportPlanKeys.list(params), queryFn: ({ signal }) => transportPlanService.getPlans(params, signal), enabled, retry })
}
export function useTransportPlan(id: EntityId) {
  return useQuery({ queryKey: transportPlanKeys.detail(id), queryFn: ({ signal }) => transportPlanService.getPlan(id, signal), enabled: transportPlanIdSchema.safeParse(id).success, retry })
}
export function useTransportPlanQuotation(id: EntityId) {
  return useQuery({ queryKey: transportPlanKeys.quotation(id), queryFn: ({ signal }) => transportPlanService.getQuotation(id, signal), enabled: transportPlanIdSchema.safeParse(id).success, retry })
}
export function useTransportPlanAssignments(id: EntityId) {
  return useQuery({ queryKey: transportPlanKeys.assignments(id), queryFn: ({ signal }) => transportPlanService.getAssignments(id, signal), enabled: transportPlanIdSchema.safeParse(id).success, retry })
}

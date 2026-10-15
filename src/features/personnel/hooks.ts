import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ASSIGNABLE_PAGE_SIZE } from "@/features/personnel/constants"
import { personnelService } from "@/features/personnel/services"
import type {
  AssignableRole,
  Phase1AssignPayload,
  Phase1ChangePayload,
  Phase2AssignPayload,
  SegmentChangePayload,
} from "@/features/personnel/types"

export const personnelKeys = {
  all: ["personnel"] as const,
  plan: (transportPlanId: string) => [...personnelKeys.all, "plan", transportPlanId] as const,
  assignments: (transportPlanId: string) => [...personnelKeys.all, "assignments", transportPlanId] as const,
  primaryRoute: (transportPlanId: string) => [...personnelKeys.all, "primary-route", transportPlanId] as const,
  routePlan: (routePlanId: string) => [...personnelKeys.all, "route-plan", routePlanId] as const,
  assignable: (role: AssignableRole, from?: string, to?: string) => [...personnelKeys.all, "assignable", role, from ?? "", to ?? ""] as const,
}

export function useTransportPlanSummary(transportPlanId: string) {
  return useQuery({
    queryKey: personnelKeys.plan(transportPlanId),
    queryFn: () => personnelService.getTransportPlan(transportPlanId),
    // The edit calls send updatedAt back as lastUpdatedAt, so never serve a stale copy.
    staleTime: 0,
  })
}

export function useAssignments(transportPlanId: string) {
  return useQuery({
    queryKey: personnelKeys.assignments(transportPlanId),
    queryFn: () => personnelService.getAssignments(transportPlanId),
    staleTime: 0,
  })
}

export function usePrimaryRoutePlan(transportPlanId: string, enabled: boolean) {
  return useQuery({
    queryKey: personnelKeys.primaryRoute(transportPlanId),
    queryFn: () => personnelService.getPrimaryRoutePlan(transportPlanId),
    enabled,
    staleTime: 0,
  })
}

/** routePlanId comes from PS2 (`phase2.routePlanId`), which is null while phase 2 is locked. */
export function useRoutePlanSummary(routePlanId: string | null | undefined) {
  return useQuery({
    queryKey: personnelKeys.routePlan(routePlanId ?? ""),
    queryFn: () => personnelService.getRoutePlan(routePlanId as string),
    enabled: Boolean(routePlanId),
    staleTime: 0,
  })
}

/** PS6 dropdown source. Drivers and escorts need the segment window, TS / RC do not. */
export function useAssignableEmployees(role: AssignableRole, window: { from?: string; to?: string } = {}, enabled = true) {
  const needsWindow = role === "DRIVER" || role === "ESCORT"
  return useQuery({
    queryKey: personnelKeys.assignable(role, window.from, window.to),
    queryFn: () =>
      personnelService.assignable({
        role,
        availableFrom: needsWindow ? window.from : undefined,
        availableTo: needsWindow ? window.to : undefined,
        pageIndex: 1,
        pageSize: ASSIGNABLE_PAGE_SIZE,
      }),
    enabled: enabled && (!needsWindow || Boolean(window.from && window.to)),
    // The list changes with every save (people become busy), so refetch when a dialog opens.
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

function useInvalidateAssignments(transportPlanId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: personnelKeys.plan(transportPlanId) })
    void queryClient.invalidateQueries({ queryKey: personnelKeys.assignments(transportPlanId) })
    void queryClient.invalidateQueries({ queryKey: personnelKeys.primaryRoute(transportPlanId) })
    void queryClient.invalidateQueries({ queryKey: [...personnelKeys.all, "route-plan"] })
    void queryClient.invalidateQueries({ queryKey: [...personnelKeys.all, "assignable"] })
  }
}

/** Also exposed so a dialog can reload after a `*_MODIFIED` answer. */
export function useReloadAssignments(transportPlanId: string) {
  return useInvalidateAssignments(transportPlanId)
}

export function useAssignPhase1(transportPlanId: string) {
  const invalidate = useInvalidateAssignments(transportPlanId)
  return useMutation({
    mutationFn: (payload: Phase1AssignPayload) => personnelService.assignPhase1(transportPlanId, payload),
    onSuccess: invalidate,
  })
}

export function useChangePhase1(transportPlanId: string) {
  const invalidate = useInvalidateAssignments(transportPlanId)
  return useMutation({
    mutationFn: (payload: Phase1ChangePayload) => personnelService.changePhase1(transportPlanId, payload),
    onSuccess: invalidate,
  })
}

export function useAssignPhase2(transportPlanId: string) {
  const invalidate = useInvalidateAssignments(transportPlanId)
  return useMutation({
    mutationFn: ({ routePlanId, payload }: { routePlanId: string; payload: Phase2AssignPayload }) =>
      personnelService.assignPhase2(routePlanId, payload),
    onSuccess: invalidate,
  })
}

export function useChangeSegmentPersonnel(transportPlanId: string) {
  const invalidate = useInvalidateAssignments(transportPlanId)
  return useMutation({
    mutationFn: ({ routePlanId, routePlanRouteId, payload }: { routePlanId: string; routePlanRouteId: string; payload: SegmentChangePayload }) =>
      personnelService.changeSegment(routePlanId, routePlanRouteId, payload),
    onSuccess: invalidate,
  })
}

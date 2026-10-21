import apiClient from "@/lib/axios"
import { PersonnelApiError } from "@/features/personnel/errors"
import {
  mockAssignable,
  mockAssignments,
  mockAssignPhase1,
  mockAssignPhase2,
  mockChangePhase1,
  mockChangeSegment,
  mockPrimaryRoutePlan,
  mockRoutePlan,
  mockTransportPlan,
} from "@/features/personnel/mock-api"
import type {
  ApiEnvelope,
  AssignableEmployeesPage,
  AssignableEmployeesParams,
  Assignments,
  Phase1AssignPayload,
  Phase1ChangePayload,
  Phase1Result,
  Phase2AssignPayload,
  Phase2Result,
  PrimaryRoutePlanStatus,
  RoutePlanSummary,
  ScheduleConflictDetails,
  SegmentChangePayload,
  SegmentChangeResult,
  TransportPlanSummary,
} from "@/features/personnel/types"

/**
 * The BE serves PS1/PS2/PS5 but not yet PS3/PS4/PS6, so mocks are on by default in development.
 * Set VITE_PERSONNEL_API_MOCKS=false to call the real Flow 3 API. Never on in a production build.
 */
export const usePersonnelMocks = !import.meta.env.PROD && import.meta.env.VITE_PERSONNEL_API_MOCKS === "true"

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) return (payload as ApiEnvelope<T>).value
  return payload as T
}

async function call<T>(request: Promise<unknown>): Promise<T> {
  try {
    return unwrap<T>(await request)
  } catch (error) {
    const data = (
      error as { response?: { data?: { errorCode?: string; message?: string; errors?: { field: string; message: string }[]; value?: RawConflictDetails | null } } }
    ).response?.data
    if (data?.errorCode) {
      throw new PersonnelApiError(data.errorCode, {
        cause: error,
        backendMessage: data.message,
        errors: data.errors,
        // Only SCHEDULE_CONFLICT carries an object in `value`.
        details: data.errorCode === "SCHEDULE_CONFLICT" ? toConflictDetails(data.value) : undefined,
      })
    }
    throw error
  }
}

const enc = encodeURIComponent

type RawConflictDetails = ScheduleConflictDetails & {
  conflictingSegment?: { transportPlanCode?: string; plannedDepartureAt?: string; plannedArrivalAt?: string; fromLocationName?: string; toLocationName?: string }
}

/** `value` of a 409 SCHEDULE_CONFLICT: the segment of the other TransportPlan is flattened to the fields the dialog reads. */
function toConflictDetails(value: RawConflictDetails | null | undefined): ScheduleConflictDetails | undefined {
  if (!value) return undefined
  const { conflictingSegment: segment, ...rest } = value
  return {
    ...rest,
    ...(segment
      ? {
          conflictingTransportPlanCode: segment.transportPlanCode,
          conflictingFromLocationName: segment.fromLocationName,
          conflictingToLocationName: segment.toLocationName,
          conflictingPlannedDepartureAt: segment.plannedDepartureAt,
          conflictingPlannedArrivalAt: segment.plannedArrivalAt,
        }
      : {}),
  }
}

function cleanParams(params: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""))
}

export const personnelService = {
  /** PS6: one API for the four dropdowns, the BE already drops unavailable drivers/escorts. */
  async assignable(params: AssignableEmployeesParams): Promise<AssignableEmployeesPage> {
    if (usePersonnelMocks) return mockAssignable(params)
    return call<AssignableEmployeesPage>(
      apiClient.get("employees/assignable", {
        params: cleanParams({
          role: params.role,
          availableFrom: params.availableFrom,
          availableTo: params.availableTo,
          transportPlanId: params.transportPlanId,
          country: params.country,
          search: params.search?.trim(),
          pageIndex: params.pageIndex,
          pageSize: params.pageSize,
        }),
      }),
    )
  },

  /** PS2: both phases. Phase 2 stays empty until the BE opens it (`phase2.enabled`). */
  async getAssignments(transportPlanId: string): Promise<Assignments> {
    if (usePersonnelMocks) return mockAssignments(transportPlanId)
    return call<Assignments>(apiClient.get(`transport-plans/${enc(transportPlanId)}/assignments`))
  },

  /** PS1 */
  async assignPhase1(transportPlanId: string, payload: Phase1AssignPayload): Promise<Phase1Result> {
    if (usePersonnelMocks) return mockAssignPhase1(transportPlanId, payload)
    return call<Phase1Result>(apiClient.post(`transport-plans/${enc(transportPlanId)}/assignments/phase-1`, payload))
  },

  /** PS5 */
  async changePhase1(transportPlanId: string, payload: Phase1ChangePayload): Promise<Phase1Result> {
    if (usePersonnelMocks) return mockChangePhase1(transportPlanId, payload)
    return call<Phase1Result>(apiClient.put(`transport-plans/${enc(transportPlanId)}/assignments/phase-1`, payload))
  },

  /** PS3: Driver + Escort for every internal segment, in one atomic call. */
  async assignPhase2(routePlanId: string, payload: Phase2AssignPayload): Promise<Phase2Result> {
    if (usePersonnelMocks) return mockAssignPhase2(routePlanId, payload)
    return call<Phase2Result>(apiClient.post(`route-plans/${enc(routePlanId)}/personnel`, payload))
  },

  /** PS4 */
  async changeSegment(routePlanId: string, routePlanRouteId: string, payload: SegmentChangePayload): Promise<SegmentChangeResult> {
    if (usePersonnelMocks) return mockChangeSegment(routePlanId, routePlanRouteId, payload)
    return call<SegmentChangeResult>(apiClient.put(`route-plans/${enc(routePlanId)}/segments/${enc(routePlanRouteId)}/personnel`, payload))
  },

  // ------------------------------------------------ small read-only calls owned by other features (contract section 5 allows it)

  /** TP3: status gates phase 1 and `updatedAt` is the lastUpdatedAt of PS5. */
  async getTransportPlan(transportPlanId: string): Promise<TransportPlanSummary> {
    if (usePersonnelMocks) return mockTransportPlan(transportPlanId)
    return call<TransportPlanSummary>(apiClient.get(`transport-plans/${enc(transportPlanId)}`))
  },

  /** RP2 (PRIMARY): only the status chip while phase 2 is still locked. null when no route plan exists yet. */
  async getPrimaryRoutePlan(transportPlanId: string): Promise<PrimaryRoutePlanStatus | null> {
    if (usePersonnelMocks) return mockPrimaryRoutePlan(transportPlanId)
    const result = await call<{ items: PrimaryRoutePlanStatus[] }>(
      apiClient.get(`transport-plans/${enc(transportPlanId)}/route-plans`, { params: { routeType: "PRIMARY" } }),
    )
    return result.items[0] ?? null
  },

  /** RP3: location names, distance, segment status, and `updatedAt` = lastUpdatedAt of PS3/PS4 (PS2 does not carry it). */
  async getRoutePlan(routePlanId: string): Promise<RoutePlanSummary> {
    if (usePersonnelMocks) return mockRoutePlan(routePlanId)
    return call<RoutePlanSummary>(apiClient.get(`route-plans/${enc(routePlanId)}`))
  },
}

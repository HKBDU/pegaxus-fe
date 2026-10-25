import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"

import { OPEN_STATUSES } from "../constants"
import { incidentService } from "../services"
import type { CancelInput, Incident, IncidentListParams, ResolveInput, SelfResolveInput } from "../types"

/** Last part of every key: a new sign-in never reads the cache of the previous account. Prefix invalidation still matches. */
const useSession = () => useAuthStore((state) => state.sessionVersion)

export const incidentKeys = {
  all: ["incidents"] as const,
  list: (params: IncidentListParams, session: number) => ["incidents", "list", params, session] as const,
  detail: (incidentReportId: string, session: number) => ["incidents", "detail", incidentReportId, session] as const,
  customer: (incidentReportId: string, session: number) => ["incidents", "customer", incidentReportId, session] as const,
  alert: (incidentReportId: string, session: number) => ["incidents", "alert", incidentReportId, session] as const,
}

/** A 404 is an answer ("not found"), not a glitch: do not retry it. Only a dropped connection is worth another try. */
const retryOnlyNetwork = (failureCount: number, error: unknown) =>
  failureCount < 2 && (error as { errorCode?: string })?.errorCode === "NETWORK_ERROR"

/** IN7. */
export function useIncidentList(params: IncidentListParams) {
  const session = useSession()
  return useQuery({
    queryKey: incidentKeys.list(params, session),
    queryFn: ({ signal }) => incidentService.list(params, signal),
    placeholderData: keepPreviousData,
    retry: retryOnlyNetwork,
  })
}

const KPI_BASE: IncidentListParams = {
  status: OPEN_STATUSES,
  category: "",
  severity: "",
  occurredFrom: "",
  occurredTo: "",
  search: "",
  pageIndex: 1,
  pageSize: 1,
  sortBy: "severity:desc,occurredAt:desc",
}

/**
 * The cards above the list. IN7 `counts` has the open/total numbers; the other three are `totalItems` of three
 * one-row IN7 calls (the contract has no dedicated KPI endpoint).
 */
export function useIncidentKpis() {
  const critical = useIncidentList({ ...KPI_BASE, severity: "CRITICAL" })
  const pendingCost = useIncidentList({ ...KPI_BASE, hasPendingCost: true })
  const settlement = useIncidentList({ ...KPI_BASE, emergencySettlementRequired: true })
  const overall = useIncidentList({ ...KPI_BASE, status: "" })
  const counts = overall.data?.counts
  return {
    isLoading: overall.isLoading,
    isError: overall.isError,
    open: counts ? counts.reported + counts.pending : undefined,
    total: counts ? counts.reported + counts.pending + counts.resolved : undefined,
    critical: critical.data?.totalItems,
    pendingCost: pendingCost.data?.totalItems,
    settlement: settlement.data?.totalItems,
  }
}

/** IN8 (staff). */
export function useIncident(incidentReportId: string | undefined) {
  const session = useSession()
  return useQuery({
    queryKey: incidentKeys.detail(incidentReportId ?? "", session),
    queryFn: ({ signal }) => incidentService.get(incidentReportId as string, signal),
    enabled: Boolean(incidentReportId),
    retry: retryOnlyNetwork,
    refetchOnWindowFocus: "always",
  })
}

/** IN8 (Customer). */
export function useCustomerIncident(incidentReportId: string | undefined) {
  const session = useSession()
  return useQuery({
    queryKey: incidentKeys.customer(incidentReportId ?? "", session),
    queryFn: ({ signal }) => incidentService.getForCustomer(incidentReportId as string, signal),
    enabled: Boolean(incidentReportId),
    retry: retryOnlyNetwork,
  })
}

/** After a write the returned incident replaces the cached one; every list is stale (status, counts, cost columns). */
function useAfterWrite() {
  const client = useQueryClient()
  const session = useSession()
  return (incident: Incident) => {
    client.setQueryData(incidentKeys.detail(incident.incidentReportId, session), incident)
    void client.invalidateQueries({ queryKey: [...incidentKeys.all, "list"] })
    // The transport shell and the crew lists show the incident state too.
    void client.invalidateQueries({ queryKey: ["ongoing-transports"] })
  }
}

/** IN9. */
export function useResolveIncident(incidentReportId: string) {
  const after = useAfterWrite()
  return useMutation({ mutationFn: (input: ResolveInput) => incidentService.resolve(incidentReportId, input), onSuccess: after })
}

/** IN10. */
export function useCancelIncident(incidentReportId: string) {
  const after = useAfterWrite()
  return useMutation({ mutationFn: (input: CancelInput) => incidentService.cancel(incidentReportId, input), onSuccess: after })
}

/** IN11. */
export function useSelfResolveIncident(incidentReportId: string) {
  const after = useAfterWrite()
  return useMutation({ mutationFn: (input: SelfResolveInput) => incidentService.selfResolve(incidentReportId, input), onSuccess: after })
}

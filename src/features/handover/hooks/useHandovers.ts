import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/store"
import { handoverService } from "../services"
import type { CancelInput, CompleteInput, CreateHandoverInput, HandoverRecord, ListFilters } from "../types"

/** Last part of every key: a new sign-in never reads the cache of the previous account. Prefix invalidation still matches. */
const useSession = () => useAuthStore((state) => state.sessionVersion)

const keys = {
  all: ["handover"] as const,
  list: (transportId: string, filters: ListFilters, session: number) => ["handover", "list", transportId, filters.handoverType ?? "", filters.status ?? "", session] as const,
  record: (handoverRecordId: string, session: number) => ["handover", "record", handoverRecordId, session] as const,
  segments: (transportId: string, session: number) => ["handover", "segments", transportId, session] as const,
  // Prefixes without the session, for invalidation.
  recordPrefix: (handoverRecordId: string) => ["handover", "record", handoverRecordId] as const,
  segmentsPrefix: (transportId: string) => ["handover", "segments", transportId] as const,
}

/** Errors that a retry cannot fix: stop asking and show the message. */
const retryOnlyNetwork = (failureCount: number, error: unknown) =>
  failureCount < 2 && (error as { errorCode?: string })?.errorCode === "NETWORK_ERROR"

/** HO1. */
export function useHandoverList(transportId: string, filters: ListFilters) {
  const session = useSession()
  return useQuery({
    queryKey: keys.list(transportId, filters, session),
    queryFn: ({ signal }) => handoverService.listByTransport(transportId, filters, signal),
    placeholderData: keepPreviousData,
    retry: retryOnlyNetwork,
  })
}

/** HO2. */
export function useHandoverRecord(handoverRecordId: string | undefined) {
  const session = useSession()
  return useQuery({
    queryKey: keys.record(handoverRecordId ?? "", session),
    queryFn: ({ signal }) => handoverService.getRecord(handoverRecordId as string, signal),
    enabled: Boolean(handoverRecordId),
    retry: retryOnlyNetwork,
    // The signature URLs in the record expire after 5 minutes: never serve a copy older than a minute.
    staleTime: 60_000,
    refetchOnWindowFocus: "always",
  })
}

/** OT4 (read only): boundaries for the "start" page and the coordinates of the handover point. */
export function useTransportSegments(transportId: string, enabled = true) {
  const session = useSession()
  return useQuery({
    queryKey: keys.segments(transportId, session),
    queryFn: ({ signal }) => handoverService.getSegments(transportId, signal),
    enabled,
    retry: retryOnlyNetwork,
  })
}

/** After any write the record and every list of the transport are stale (status, availableActions, boundaries). */
function useAfterWrite(transportId: string) {
  const client = useQueryClient()
  const session = useSession()
  return (record?: HandoverRecord) => {
    if (record) client.setQueryData(keys.record(record.handoverRecordId, session), record)
    void client.invalidateQueries({ queryKey: [...keys.all, "list", transportId] })
    void client.invalidateQueries({ queryKey: keys.segmentsPrefix(transportId) })
    // OT3 / OT4 of the transport screens show the leg times and statuses that HO5 writes.
    void client.invalidateQueries({ queryKey: ["ongoing-transports"] })
    // The driver's location gate reads who holds the current leg, which a handover changes.
    void client.invalidateQueries({ queryKey: ["driver-location-assignment"] })
  }
}

export function useCreateHandover(transportId: string) {
  const after = useAfterWrite(transportId)
  return useMutation({
    mutationFn: (input: CreateHandoverInput) => handoverService.create(transportId, input),
    onSuccess: after,
  })
}

export function useStartHandover(transportId: string) {
  const after = useAfterWrite(transportId)
  return useMutation({
    mutationFn: (handoverRecordId: string) => handoverService.start(handoverRecordId),
    onSuccess: after,
  })
}

export function useCompleteHandover(transportId: string, handoverRecordId: string) {
  const after = useAfterWrite(transportId)
  return useMutation({
    mutationFn: (input: CompleteInput) => handoverService.complete(handoverRecordId, input),
    onSuccess: after,
  })
}

export function useCancelHandover(transportId: string, handoverRecordId: string) {
  const after = useAfterWrite(transportId)
  return useMutation({
    mutationFn: (input: CancelInput) => handoverService.cancel(handoverRecordId, input),
    onSuccess: after,
  })
}

/** Reload after `HANDOVER_MODIFIED`: fetch the record again and refresh the lists. */
export function useReloadHandover(transportId: string, handoverRecordId: string) {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: keys.recordPrefix(handoverRecordId) })
    void client.invalidateQueries({ queryKey: [...keys.all, "list", transportId] })
  }
}

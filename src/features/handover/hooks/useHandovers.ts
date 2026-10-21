import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { handoverService } from "../services"
import type { CancelInput, CompleteInput, CreateHandoverInput, HandoverRecord, ListFilters } from "../types"

const keys = {
  all: ["handover"] as const,
  list: (transportId: string, filters: ListFilters) => ["handover", "list", transportId, filters.handoverType ?? "", filters.status ?? ""] as const,
  record: (handoverRecordId: string) => ["handover", "record", handoverRecordId] as const,
  segments: (transportId: string) => ["handover", "segments", transportId] as const,
}

/** Errors that a retry cannot fix: stop asking and show the message. */
const retryOnlyNetwork = (failureCount: number, error: unknown) =>
  failureCount < 2 && (error as { errorCode?: string })?.errorCode === "NETWORK_ERROR"

/** HO1. */
export function useHandoverList(transportId: string, filters: ListFilters) {
  return useQuery({
    queryKey: keys.list(transportId, filters),
    queryFn: ({ signal }) => handoverService.listByTransport(transportId, filters, signal),
    placeholderData: keepPreviousData,
    retry: retryOnlyNetwork,
  })
}

/** HO2. */
export function useHandoverRecord(handoverRecordId: string | undefined) {
  return useQuery({
    queryKey: keys.record(handoverRecordId ?? ""),
    queryFn: ({ signal }) => handoverService.getRecord(handoverRecordId as string, signal),
    enabled: Boolean(handoverRecordId),
    retry: retryOnlyNetwork,
  })
}

/** OT4 (read only): boundaries for the "start" page and the coordinates of the handover point. */
export function useTransportSegments(transportId: string, enabled = true) {
  return useQuery({
    queryKey: keys.segments(transportId),
    queryFn: ({ signal }) => handoverService.getSegments(transportId, signal),
    enabled,
    retry: retryOnlyNetwork,
  })
}

/** After any write the record and every list of the transport are stale (status, availableActions, boundaries). */
function useAfterWrite(transportId: string) {
  const client = useQueryClient()
  return (record?: HandoverRecord) => {
    if (record) client.setQueryData(keys.record(record.handoverRecordId), record)
    void client.invalidateQueries({ queryKey: [...keys.all, "list", transportId] })
    void client.invalidateQueries({ queryKey: keys.segments(transportId) })
    // OT3 / OT4 of the transport screens show the leg times and statuses that HO5 writes.
    void client.invalidateQueries({ queryKey: ["ongoing-transports"] })
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
    void client.invalidateQueries({ queryKey: keys.record(handoverRecordId) })
    void client.invalidateQueries({ queryKey: [...keys.all, "list", transportId] })
  }
}

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/store"
import { claimService } from "@/features/claim/services"
import type { CancelClaimPayload, Claim, ClaimQueryParams, ResolveClaimPayload, SubmitClaimPayload } from "@/features/claim/types"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isId = (value: string | undefined): value is string => Boolean(value && UUID.test(value))

/** Cache entries are per account and session so a customer never sees what the manager loaded. */
function useScope() {
  const principal = useAuthStore((state) => state.principal)
  const version = useAuthStore((state) => state.sessionVersion)
  return ["claim", principal?.id, version] as const
}

export function useClaimEligibility(bookingId: string | undefined) {
  const scope = useScope()
  return useQuery({
    queryKey: [...scope, "eligibility", bookingId],
    queryFn: ({ signal }) => claimService.getEligibility(bookingId ?? "", signal),
    enabled: isId(bookingId),
    // The countdown is computed from `serverTime`, so a cached answer would drift.
    staleTime: 0,
    retry: false,
  })
}

export function useClaims(params: ClaimQueryParams, enabled = true) {
  const scope = useScope()
  return useQuery({
    queryKey: [...scope, "list", params],
    queryFn: ({ signal }) => claimService.list(params, signal),
    enabled,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useClaim(claimId: string | undefined) {
  const scope = useScope()
  return useQuery({
    queryKey: [...scope, "detail", claimId],
    queryFn: ({ signal }) => claimService.get(claimId ?? "", signal),
    enabled: isId(claimId),
    // `updatedAt` goes back as lastUpdatedAt on every write, so never serve a stale copy.
    staleTime: 0,
    retry: false,
  })
}

export function useBookingHorses(bookingId: string | undefined) {
  const scope = useScope()
  return useQuery({
    queryKey: [...scope, "booking-horses", bookingId],
    queryFn: ({ signal }) => claimService.getBookingHorses(bookingId ?? "", signal),
    enabled: isId(bookingId),
    staleTime: 60_000,
    retry: false,
  })
}

/** Lists, details and the eligibility counter all change after a write. */
function useRefresh() {
  const queryClient = useQueryClient()
  const scope = useScope()
  return (claim?: Claim) => {
    if (claim) queryClient.setQueryData([...scope, "detail", claim.claimId], claim)
    return queryClient.invalidateQueries({ queryKey: ["claim"] })
  }
}

export function useSubmitClaim(bookingId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (payload: SubmitClaimPayload) => claimService.submit(bookingId, payload),
    onSuccess: (claim) => void refresh(claim),
  })
}

export function useResolveClaim(claimId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (payload: ResolveClaimPayload) => claimService.resolve(claimId, payload),
    onSuccess: (claim) => void refresh(claim),
  })
}

export function useCompleteClaim(claimId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (lastUpdatedAt: string) => claimService.complete(claimId, lastUpdatedAt),
    onSuccess: (claim) => void refresh(claim),
  })
}

export function useCancelClaim(claimId: string) {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (payload: CancelClaimPayload) => claimService.cancel(claimId, payload),
    onSuccess: (claim) => void refresh(claim),
  })
}

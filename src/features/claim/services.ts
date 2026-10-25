import apiClient from "@/lib/axios"
import { ClaimApiError } from "@/features/claim/errors"
import type {
  ApiFieldError,
  CancelClaimPayload,
  Claim,
  ClaimBookingHorse,
  ClaimEligibility,
  ClaimPage,
  ClaimQueryParams,
  ResolveClaimPayload,
  SubmitClaimPayload,
} from "@/features/claim/types"

const enc = encodeURIComponent

/** The API answers { isSuccess, code, message, value }; callers work with `value`. */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) return (payload as { value: T }).value
  return payload as T
}

async function call<T>(request: Promise<unknown>): Promise<T> {
  try {
    return unwrap<T>(await request)
  } catch (error) {
    const data = (error as { response?: { data?: { errorCode?: string; message?: string; errors?: ApiFieldError[] } } }).response?.data
    if (data?.errorCode) throw new ClaimApiError(data.errorCode, { cause: error, backendMessage: data.message, errors: data.errors })
    throw error
  }
}

interface BookingHorsesResponse {
  horses?: { horseId: string; horseName: string; microchipNumber?: string | null }[]
}

export const claimService = {
  /** CL1: drives the Submit button, the countdown and the read-only part of the form. */
  getEligibility(bookingId: string, signal?: AbortSignal) {
    return call<ClaimEligibility>(apiClient.get(`bookings/${enc(bookingId)}/claim-eligibility`, { signal }))
  },

  /** CL2 */
  submit(bookingId: string, payload: SubmitClaimPayload) {
    return call<Claim>(apiClient.post(`bookings/${enc(bookingId)}/claims`, payload))
  },

  /** CL3: the manager sees every claim, a customer only their own (also used with `bookingId`). */
  list(params: ClaimQueryParams, signal?: AbortSignal) {
    const { search, claimType, status, bookingId, submittedFrom, submittedTo, pageIndex, pageSize, sortBy } = params
    return call<ClaimPage>(
      apiClient.get("claims", {
        params: {
          pageIndex,
          pageSize,
          sortBy,
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(claimType ? { claimType } : {}),
          ...(status ? { status } : {}),
          ...(bookingId ? { bookingId } : {}),
          ...(submittedFrom ? { submittedFrom } : {}),
          ...(submittedTo ? { submittedTo } : {}),
        },
        signal,
      }),
    )
  },

  /** CL4: the first manager visit of a PENDING claim records `reviewedAt`, the response already has it. */
  get(claimId: string, signal?: AbortSignal) {
    return call<Claim>(apiClient.get(`claims/${enc(claimId)}`, { signal }))
  },

  /** CL5: a rejection is `resolutionType: NO_COMPENSATION`. */
  resolve(claimId: string, payload: ResolveClaimPayload) {
    return call<Claim>(apiClient.post(`claims/${enc(claimId)}/resolution`, payload))
  },

  /** CL6 */
  cancel(claimId: string, payload: CancelClaimPayload) {
    return call<Claim>(apiClient.post(`claims/${enc(claimId)}/cancel`, payload))
  },

  /** CL7: APPROVED -> RESOLVED. */
  complete(claimId: string, lastUpdatedAt: string) {
    return call<Claim>(apiClient.post(`claims/${enc(claimId)}/complete`, { lastUpdatedAt }))
  },

  /** Flow 1 B8, only to list the horses of the booking next to the claim form. */
  async getBookingHorses(bookingId: string, signal?: AbortSignal): Promise<ClaimBookingHorse[]> {
    const booking = await call<BookingHorsesResponse>(apiClient.get(`bookings/${enc(bookingId)}`, { signal }))
    return (booking.horses ?? []).map(({ horseId, horseName, microchipNumber }) => ({ horseId, horseName, microchipNumber: microchipNumber ?? null }))
  },
}

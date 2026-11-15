import { z } from 'zod'
import apiClient from '@/lib/axios'
import type {
  ApiEnvelope,
  AuthoritySubmissionDetail,
  RecordAuthoritySubmissionInput,
  RecordAuthoritySubmissionResult,
  UpdateAuthorityReviewInput,
  UpdateAuthorityReviewResult,
  AuthoritySubmissionSummary,
  RouteAuthorities,
} from './types'

export async function listAuthoritySubmissions(dossierId: string): Promise<AuthoritySubmissionSummary[]> {
  const response = await apiClient.get<unknown, ApiEnvelope<{ items: AuthoritySubmissionSummary[] }>>(
    `/compliance-dossiers/${encodeURIComponent(dossierId)}/authority-submissions`,
  )
  if (!response.isSuccess) throw new Error(response.message)
  return response.value?.items ?? []
}

/** The countries on the dossier's route and the authorities a new submission may go to. */
export async function getRouteAuthorities(dossierId: string): Promise<RouteAuthorities> {
  const response = await apiClient.get<unknown, ApiEnvelope<{ routeAuthorities?: RouteAuthorities }>>(
    `/compliance-dossiers/${encodeURIComponent(dossierId)}/authority-submissions`,
  )
  if (!response.isSuccess) throw new Error(response.message)
  return response.value?.routeAuthorities ?? { routeCountries: [], allowedAuthorities: [] }
}

export async function recordAuthoritySubmission(
  dossierId: string,
  input: RecordAuthoritySubmissionInput,
): Promise<RecordAuthoritySubmissionResult> {
  const response = await apiClient.post<unknown, ApiEnvelope<RecordAuthoritySubmissionResult>>(
    `/compliance-dossiers/${encodeURIComponent(dossierId)}/authority-submissions`,
    {
      ...input,
      authorityName: input.authorityName.trim(),
      submissionReference: input.submissionReference.trim(),
      submissionMethod: input.submissionMethod?.trim() || undefined,
      decisionNote: input.decisionNote?.trim() || undefined,
    },
  )

  if (!response.isSuccess) throw new Error(response.message)
  return response.value
}

/** The dossier facts the review dialog shows next to the form (D7 overview). */
const dossierFactsSchema = z
  .object({
    dossierCode: z.string().nullish(),
    bookingCode: z.string().nullish(),
    status: z.string().nullish(),
    bookingSummary: z
      .object({
        originCountry: z.string().nullish(),
        destinationCountry: z.string().nullish(),
        requestedDepartureDate: z.string().nullish(),
        customerName: z.string().nullish(),
        horseCount: z.number().nullish(),
      })
      .nullish(),
  })
  .passthrough()

async function getDossierFacts(dossierId: string) {
  const response = await apiClient.get<unknown, ApiEnvelope<unknown>>(
    `/compliance-dossiers/${encodeURIComponent(dossierId)}`,
  )
  if (!response.isSuccess) return undefined
  const parsed = dossierFactsSchema.safeParse(response.value)
  return parsed.success ? parsed.data : undefined
}

export async function getAuthoritySubmissionDetail(
  dossierId: string,
  submissionId: string,
): Promise<AuthoritySubmissionDetail> {
  const [response, facts] = await Promise.all([
    apiClient.get<
      unknown,
      ApiEnvelope<{ items: AuthoritySubmissionSummary[]; tripStartDate?: string; tripEndDate?: string }>
    >(`/compliance-dossiers/${encodeURIComponent(dossierId)}/authority-submissions`),
    getDossierFacts(dossierId).catch(() => undefined),
  ])
  if (!response.isSuccess) throw new Error(response.message)
  const summary = response.value?.items?.find(
    (item) => String(item.authoritySubmissionId) === String(submissionId),
  )
  if (!summary) throw new Error("AUTHORITY_SUBMISSION_NOT_FOUND")
  const evidence = summary.evidenceFiles?.[0]
  const booking = facts?.bookingSummary
  return {
    tripStartDate: response.value?.tripStartDate,
    tripEndDate: response.value?.tripEndDate,
    dossierSummary: facts
      ? {
          cdosCode: facts.dossierCode ?? "",
          bookingNo: facts.bookingCode ?? "",
          originCountry: booking?.originCountry ?? "",
          destinationCountry: booking?.destinationCountry ?? "",
          departureDate: booking?.requestedDepartureDate ?? "",
          horsesCount: booking?.horseCount ?? 0,
          customerName: booking?.customerName ?? "",
          status: facts.status ?? "",
        }
      : undefined,
    authoritySubmissionId: summary.authoritySubmissionId,
    submissionNo: String(summary.submissionNo),
    dossierId,
    authorityName: summary.authorityName,
    submissionReference: summary.submissionReference,
    submittedAt: summary.submittedAt,
    status: summary.status,
    dossierStatus: "",
    isRequired: summary.isRequired,
    evidenceFile: evidence
      ? {
          fileName: evidence.fileName,
          fileUrl: evidence.fileUrl ?? "",
          fileSize: evidence.fileSizeBytes ?? 0,
        }
      : undefined,
  }
}

export async function updateAuthorityReview(
  submissionId: string,
  input: UpdateAuthorityReviewInput,
): Promise<UpdateAuthorityReviewResult> {
  const response = await apiClient.patch<unknown, ApiEnvelope<UpdateAuthorityReviewResult>>(
    `/authority-submissions/${encodeURIComponent(submissionId)}/decision`,
    input,
  )

  if (!response.isSuccess) throw new Error(response.message)
  return response.value
}


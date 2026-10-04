import apiClient from '@/lib/axios'
import type {
  ApiEnvelope,
  ComplianceDossierContext,
  QuarantineProof,
  SubmitQuarantineProofRequest,
  SubmitQuarantineProofResponse,
} from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function callApi<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    const data = (error as { response?: { data?: { errorCode?: string } } }).response?.data
    if (data?.errorCode) throw new Error(data.errorCode, { cause: error })
    throw error
  }
}

function unwrap<T>(payload: ApiEnvelope<T>): T {
  return payload.value
}

// ─── Q1: Submit BCP Quarantine Proof (UC-28a) ─────────────────────────────────
// POST /api/v1/compliance-dossiers/{dossierId}/quarantine-proofs
// multipart/form-data   Role: ESC, DRV

export async function submitQuarantineProof(
  dossierId: number,
  params: SubmitQuarantineProofRequest,
): Promise<SubmitQuarantineProofResponse> {
  const form = new FormData()
  form.append('bcpName', params.bcpName)
  if (params.locationId != null) form.append('locationId', String(params.locationId))
  if (params.officialVetName) form.append('officialVetName', params.officialVetName)
  if (params.bcpReceiptNumber) form.append('bcpReceiptNumber', params.bcpReceiptNumber)
  if (params.inspectionAt) form.append('inspectionAt', params.inspectionAt)
  // Holdback is an immediate operational signal; quickNote is intentionally optional.
  if (params.isHoldback != null) form.append('isHoldback', String(params.isHoldback))
  if (params.quickNote) form.append('quickNote', params.quickNote)
  for (const file of params.files) {
    form.append('files', file)
  }

  const res = await callApi(
    apiClient.post<unknown, ApiEnvelope<SubmitQuarantineProofResponse>>(
      `/compliance-dossiers/${dossierId}/quarantine-proofs`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  )
  return unwrap(res)
}

// ─── Q2: Get Quarantine Proof Detail ──────────────────────────────────────────
// GET /api/v1/quarantine-proofs/{proofId}    Role: TS, LM

export async function getQuarantineProof(proofId: number): Promise<QuarantineProof> {
  const res = await callApi(
    apiClient.get<unknown, ApiEnvelope<QuarantineProof>>(
      `/quarantine-proofs/${proofId}`,
    ),
  )
  return unwrap(res)
}

// ─── D7: Get ComplianceDossier context (for trip info header) ─────────────────
// GET /api/v1/compliance-dossiers/{dossierId}

export async function getDossierContext(dossierId: number): Promise<ComplianceDossierContext> {
  const res = await callApi(
    apiClient.get<unknown, ApiEnvelope<ComplianceDossierContext>>(
      `/compliance-dossiers/${dossierId}`,
    ),
  )
  return unwrap(res)
}

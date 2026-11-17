import apiClient from '@/lib/axios'
import type {
  ApiEnvelope,
  ComplianceDossierContext,
  FinalizeQuarantineProofRequest,
  FinalizeQuarantineProofResponse,
  QuarantineProof,
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

// ─── Q2: Get Quarantine Proof Detail ──────────────────────────────────────────
// GET /api/v1/quarantine-proofs/{proofId}    Role: TS, LM

export async function getQuarantineProof(proofId: string): Promise<QuarantineProof> {
  const res = await callApi(
    apiClient.get<unknown, ApiEnvelope<QuarantineProof>>(
      `/quarantine-proofs/${encodeURIComponent(proofId)}`,
    ),
  )
  return unwrap(res)
}

export async function finalizeQuarantineProof(
  proofId: string,
  payload: FinalizeQuarantineProofRequest,
): Promise<FinalizeQuarantineProofResponse> {
  const formData = new FormData()
  if (payload.action) formData.append('Action', payload.action)
  if (payload.officialVetName) formData.append('OfficialVetName', payload.officialVetName)
  if (payload.bcpReceiptNo) formData.append('BcpReceiptNo', payload.bcpReceiptNo)
  if (payload.status) formData.append('Status', payload.status)
  if (payload.conditions) formData.append('Conditions', payload.conditions)
  if (payload.microchipChecklist) {
    formData.append('MicrochipChecklist', JSON.stringify(payload.microchipChecklist))
  }
  if (payload.rejectionReason) formData.append('RejectionReason', payload.rejectionReason)
  if (payload.verificationNote) formData.append('VerificationNote', payload.verificationNote)

  const res = await callApi(
    apiClient.patch<unknown, ApiEnvelope<FinalizeQuarantineProofResponse>>(
      `/quarantine-proofs/${encodeURIComponent(proofId)}/finalize`,
      formData,
    ),
  )
  return unwrap(res)
}

// ─── D7: Get ComplianceDossier context (for trip info header) ─────────────────
// GET /api/v1/compliance-dossiers/{dossierId}

export async function getDossierContext(dossierId: string): Promise<ComplianceDossierContext> {
  const res = await callApi(
    apiClient.get<unknown, ApiEnvelope<ComplianceDossierContext>>(
      `/compliance-dossiers/${encodeURIComponent(dossierId)}`,
    ),
  )
  return unwrap(res)
}

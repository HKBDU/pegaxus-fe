import apiClient from '@/lib/axios'
import { getDossierContext } from '@/features/quarantine/services'
import type {
  ApiEnvelope,
  CustomsClearanceProofDetail,
  FinalizeCustomsClearanceProofRequest,
  FinalizeCustomsClearanceProofResponse,
  SubmitCustomsClearanceProofRequest,
  SubmitCustomsClearanceProofResponse,
} from './types'
import type { ComplianceDossierContext } from '@/features/quarantine/types'

async function callApi<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    const errorCode = (error as { response?: { data?: { errorCode?: string } } }).response?.data?.errorCode
    if (errorCode) throw new Error(errorCode, { cause: error })
    throw error
  }
}

function unwrap<T>(payload: ApiEnvelope<T>): T {
  return payload.value
}

export { getDossierContext }

export async function submitCustomsClearanceProof(
  dossierId: string,
  params: SubmitCustomsClearanceProofRequest,
): Promise<SubmitCustomsClearanceProofResponse> {
  const payload = {
    customsPortName: params.customsPortName || undefined,
    locationId: params.locationId != null ? String(params.locationId) : undefined,
    mrnNumber: params.mrnNumber || undefined,
    customsLane: params.customsLane || undefined,
    isHeld: params.isHeld ?? false,
    quickNote: params.quickNote || undefined,
    files: params.files,
  }

  const res = await callApi(
    apiClient.post<unknown, ApiEnvelope<SubmitCustomsClearanceProofResponse>>(
      `/compliance-dossiers/${encodeURIComponent(dossierId)}/customs-clearance-proofs`,
      payload,
    ),
  )
  return unwrap(res)
}

export async function getCustomsClearanceProof(proofId: string): Promise<CustomsClearanceProofDetail> {
  const res = await callApi(
    apiClient.get<unknown, ApiEnvelope<CustomsClearanceProofDetail>>(
      `/customs-clearance-proofs/${encodeURIComponent(proofId)}`,
    ),
  )
  return unwrap(res)
}

export async function finalizeCustomsClearanceProof(
  proofId: string,
  payload: FinalizeCustomsClearanceProofRequest,
): Promise<FinalizeCustomsClearanceProofResponse> {
  const formData = new FormData()
  if (payload.action) formData.append('Action', payload.action)
  if (payload.mrnNumber) formData.append('MrnNumber', payload.mrnNumber)
  if (payload.customsLane) formData.append('CustomsLane', payload.customsLane)
  if (payload.ataCarnetExpiryDate) formData.append('AtaCarnetExpiryDate', payload.ataCarnetExpiryDate)
  if (payload.status) formData.append('Status', payload.status)
  if (payload.verificationNote) formData.append('VerificationNote', payload.verificationNote)
  if (payload.rejectionReason) formData.append('RejectionReason', payload.rejectionReason)

  const res = await callApi(
    apiClient.patch<unknown, ApiEnvelope<FinalizeCustomsClearanceProofResponse>>(
      `/customs-clearance-proofs/${encodeURIComponent(proofId)}/finalize`,
      formData,
    ),
  )
  return unwrap(res)
}

export type { ComplianceDossierContext }

import apiClient from '@/lib/axios'
import { getDossierContext } from '@/features/quarantine/services'
import type {
  ApiEnvelope,
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
  dossierId: number,
  params: SubmitCustomsClearanceProofRequest,
): Promise<SubmitCustomsClearanceProofResponse> {
  const form = new FormData()
  form.append('customsPortName', params.customsPortName)
  if (params.locationId != null) form.append('locationId', String(params.locationId))
  if (params.mrnNumber) form.append('mrnNumber', params.mrnNumber)
  if (params.customsLane) form.append('customsLane', params.customsLane)
  if (params.isHeld != null) form.append('isHeld', String(params.isHeld))
  if (params.quickNote) form.append('quickNote', params.quickNote)
  params.files.forEach((file) => form.append('files', file))

  const res = await callApi(
    apiClient.post<unknown, ApiEnvelope<SubmitCustomsClearanceProofResponse>>(
      `/compliance-dossiers/${dossierId}/customs-clearance-proofs`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
  )
  return unwrap(res)
}

export type { ComplianceDossierContext }

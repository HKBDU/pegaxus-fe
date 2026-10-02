export type CustomsLane = 'GREEN_LANE' | 'ORANGE_LANE' | 'RED_LANE'

export interface SubmitCustomsClearanceProofRequest {
  customsPortName: string
  locationId?: number
  mrnNumber?: string
  customsLane?: CustomsLane
  isHeld?: boolean
  quickNote?: string
  files: File[]
}

export interface SubmitCustomsClearanceProofResponse {
  customsClearanceProofId: number
}

export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}

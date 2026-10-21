import {
  APPROVAL_DECISION,
  EMERGENCY_COST_CATEGORY,
  EMERGENCY_COST_STATUS,
  HORSE_INCIDENT_TYPE,
  INCIDENT_ACTION,
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  VEHICLE_INCIDENT_TYPE,
} from '@/shared/constants/incident'

export type IncidentCategory = (typeof INCIDENT_CATEGORY)[keyof typeof INCIDENT_CATEGORY]
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY]
export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS]
export type VehicleIncidentType = (typeof VEHICLE_INCIDENT_TYPE)[keyof typeof VEHICLE_INCIDENT_TYPE]
export type HorseIncidentType = (typeof HORSE_INCIDENT_TYPE)[keyof typeof HORSE_INCIDENT_TYPE]
export type EmergencyCostCategory = (typeof EMERGENCY_COST_CATEGORY)[keyof typeof EMERGENCY_COST_CATEGORY]
export type EmergencyCostStatus = (typeof EMERGENCY_COST_STATUS)[keyof typeof EMERGENCY_COST_STATUS]
export type ApprovalDecision = (typeof APPROVAL_DECISION)[keyof typeof APPROVAL_DECISION]
export type IncidentAction = (typeof INCIDENT_ACTION)[keyof typeof INCIDENT_ACTION]

export type IncidentAudience = 'INTERNAL' | 'CUSTOMER'
export type IncidentRole = 'CUSTOMER' | 'DRIVER' | 'OPERATOR' | 'VETERINARIAN' | 'MANAGER' | 'ADMIN'

export interface IncidentSummary {
  id: string
  bookingId: string
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  title: string
  reportedAt: string
  lastUpdatedAt: string
  availableActions: IncidentAction[]
}

export interface IncidentDetail extends IncidentSummary {
  description: string
  reportedBy: IncidentActor
  audience?: IncidentAudience
  routePlanId?: string
  vehicle?: VehicleIncidentDetail
  horse?: HorseIncidentDetail
  costs?: EmergencyCostRequest[]
  customer?: CustomerIncidentView
}

export interface IncidentActor {
  id: string
  name: string
  role: IncidentRole
  phone?: string
}

export interface VehicleIncidentDetail {
  type: VehicleIncidentType
  vehicleId: string
  vehiclePlateNumber?: string
  location?: string
  estimatedResolutionAt?: string
  notes?: string
}

export interface HorseIncidentDetail {
  type: HorseIncidentType
  horseId: string
  horseName?: string
  symptoms?: string
  treatment?: string
  veterinarianId?: string
  notes?: string
}

export interface EmergencyCostRequest {
  id: string
  incidentId: string
  category: EmergencyCostCategory
  description: string
  amount: number
  currency: string
  status: EmergencyCostStatus
  requestedBy: IncidentActor
  decision?: ApprovalDecision
  decidedBy?: IncidentActor
  requestedAt: string
  lastUpdatedAt: string
}

export interface AvailableAction {
  key: IncidentAction
  label: string
  requiresConfirmation?: boolean
  disabled?: boolean
}

export interface CustomerIncidentView {
  id: string
  bookingId: string
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  title: string
  description?: string
  reportedAt: string
  lastUpdatedAt: string
  costsHidden: true
  contactPhoneHidden: true
}

export interface IncidentListResponse {
  items: IncidentSummary[]
  total: number
  page: number
  pageSize: number
}

export interface IncidentDetailResponse {
  data: IncidentDetail
  lastUpdatedAt: string
  availableActions: AvailableAction[]
}

export interface CustomerIncidentResponse {
  data: CustomerIncidentView
  lastUpdatedAt: string
}

import {
  EMERGENCY_COST_CATEGORY,
  EMERGENCY_COST_STATUS,
  INCIDENT_ACTION,
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  VEHICLE_INCIDENT_TYPE,
  HORSE_INCIDENT_TYPE,
} from '@/shared/constants/incident'
import type {
  CustomerIncidentView,
  EmergencyCostRequest,
  IncidentDetail,
  IncidentSummary,
} from '@/shared/types/incident'

const operator = { id: 'usr-001', name: 'Alex Morgan', role: 'OPERATOR' as const, phone: '+84123456789' }
const driver = { id: 'usr-002', name: 'Jordan Lee', role: 'DRIVER' as const, phone: '+84987654321' }

export const incidentMockSummaries: IncidentSummary[] = [
  {
    id: 'IN1', bookingId: 'BK-1001', category: INCIDENT_CATEGORY.VEHICLE, severity: INCIDENT_SEVERITY.HIGH,
    status: INCIDENT_STATUS.REPORTED, title: 'Vehicle engine failure', reportedAt: '2026-10-20T08:15:00Z',
    lastUpdatedAt: '2026-10-20T08:30:00Z', availableActions: [INCIDENT_ACTION.SUPPLEMENT_VEHICLE, INCIDENT_ACTION.PROPOSE_REROUTE, INCIDENT_ACTION.RAISE_SEVERITY],
  },
  {
    id: 'IN2', bookingId: 'BK-1002', category: INCIDENT_CATEGORY.HORSE_HEALTH, severity: INCIDENT_SEVERITY.CRITICAL,
    status: INCIDENT_STATUS.PENDING, title: 'Horse requires veterinary attention', reportedAt: '2026-10-20T09:00:00Z',
    lastUpdatedAt: '2026-10-20T09:45:00Z', availableActions: [INCIDENT_ACTION.FOLLOW_UP_HORSE, INCIDENT_ACTION.REQUEST_COST, INCIDENT_ACTION.HOLD_ROUTE],
  },
  {
    id: 'IN3', bookingId: 'BK-1003', category: INCIDENT_CATEGORY.BOTH, severity: INCIDENT_SEVERITY.HIGH,
    status: INCIDENT_STATUS.PENDING, title: 'Collision affecting horse transport', reportedAt: '2026-10-19T14:20:00Z',
    lastUpdatedAt: '2026-10-19T15:10:00Z', availableActions: [INCIDENT_ACTION.SUPPLEMENT_VEHICLE, INCIDENT_ACTION.ADD_HORSE_DETAIL, INCIDENT_ACTION.REQUEST_COST],
  },
  {
    id: 'IN4', bookingId: 'BK-1004', category: INCIDENT_CATEGORY.ROUTE_CHANGE, severity: INCIDENT_SEVERITY.MEDIUM,
    status: INCIDENT_STATUS.REPORTED, title: 'Route change required', reportedAt: '2026-10-18T11:00:00Z',
    lastUpdatedAt: '2026-10-18T11:30:00Z', availableActions: [INCIDENT_ACTION.PROPOSE_REROUTE, INCIDENT_ACTION.ESCALATE_REROUTE],
  },
  {
    id: 'IN5', bookingId: 'BK-1005', category: INCIDENT_CATEGORY.VEHICLE, severity: INCIDENT_SEVERITY.LOW,
    status: INCIDENT_STATUS.RESOLVED, title: 'Tire damage repaired', reportedAt: '2026-10-17T07:00:00Z',
    lastUpdatedAt: '2026-10-17T10:00:00Z', availableActions: [INCIDENT_ACTION.SELF_RESOLVE],
  },
  {
    id: 'IN6', bookingId: 'BK-1006', category: INCIDENT_CATEGORY.HORSE_HEALTH, severity: INCIDENT_SEVERITY.MEDIUM,
    status: INCIDENT_STATUS.CANCELLED, title: 'Possible dehydration ruled out', reportedAt: '2026-10-16T12:00:00Z',
    lastUpdatedAt: '2026-10-16T13:00:00Z', availableActions: [],
  },
  {
    id: 'IN7', bookingId: 'BK-1007', category: INCIDENT_CATEGORY.VEHICLE, severity: INCIDENT_SEVERITY.CRITICAL,
    status: INCIDENT_STATUS.PENDING, title: 'Temperature control failure', reportedAt: '2026-10-21T06:30:00Z',
    lastUpdatedAt: '2026-10-21T06:45:00Z', availableActions: [INCIDENT_ACTION.SUPPLEMENT_VEHICLE, INCIDENT_ACTION.HOLD_ROUTE, INCIDENT_ACTION.ESCALATE_REROUTE],
  },
]

const pendingCost: EmergencyCostRequest = {
  id: 'COST-001', incidentId: 'IN2', category: EMERGENCY_COST_CATEGORY.VETERINARY,
  description: 'Emergency veterinary examination', amount: 3_500_000, currency: 'VND',
  status: EMERGENCY_COST_STATUS.PENDING, requestedBy: operator,
  requestedAt: '2026-10-20T09:30:00Z', lastUpdatedAt: '2026-10-20T09:30:00Z',
}

export const incidentMockDetails: IncidentDetail[] = [
  {
    ...incidentMockSummaries[0], description: 'The transport vehicle has stopped after an engine failure.', reportedBy: driver,
    vehicle: { type: VEHICLE_INCIDENT_TYPE.ENGINE_FAILURE, vehicleId: 'VH-001', vehiclePlateNumber: '51A-123.45', location: 'Ninh Binh', notes: 'Vehicle cannot continue safely.' },
  },
  {
    ...incidentMockSummaries[1], description: 'The horse shows signs of respiratory distress and needs immediate assessment.', reportedBy: driver,
    horse: { type: HORSE_INCIDENT_TYPE.RESPIRATORY_ISSUE, horseId: 'HR-002', horseName: 'Silver Comet', symptoms: 'Rapid breathing', veterinarianId: 'VET-009' },
    costs: [pendingCost],
  },
  {
    ...incidentMockSummaries[2], description: 'A road collision caused damage to the vehicle and minor horse distress.', reportedBy: driver,
    vehicle: { type: VEHICLE_INCIDENT_TYPE.ACCIDENT, vehicleId: 'VH-003', location: 'Da Nang' },
    horse: { type: HORSE_INCIDENT_TYPE.STRESS, horseId: 'HR-003', horseName: 'Blue Wind', symptoms: 'Restlessness' },
  },
  {
    ...incidentMockSummaries[3], description: 'The planned route is temporarily unavailable due to a road closure.', reportedBy: operator,
  },
  {
    ...incidentMockSummaries[4], description: 'The damaged tire was replaced and the vehicle passed its safety check.', reportedBy: driver,
    vehicle: { type: VEHICLE_INCIDENT_TYPE.TIRE_DAMAGE, vehicleId: 'VH-005', vehiclePlateNumber: '30F-555.55' },
  },
  {
    ...incidentMockSummaries[6], description: 'The vehicle temperature control system is not maintaining the required range.', reportedBy: driver,
    vehicle: { type: VEHICLE_INCIDENT_TYPE.TEMPERATURE_CONTROL_FAILURE, vehicleId: 'VH-007', location: 'Hue' },
  },
]

export const incidentMockCustomer: CustomerIncidentView = {
  id: 'IN2', bookingId: 'BK-1002', category: INCIDENT_CATEGORY.HORSE_HEALTH, severity: INCIDENT_SEVERITY.CRITICAL,
  status: INCIDENT_STATUS.PENDING, title: 'Horse requires veterinary attention',
  description: 'The horse is receiving immediate veterinary attention.', reportedAt: '2026-10-20T09:00:00Z',
  lastUpdatedAt: '2026-10-20T09:45:00Z',
  costsHidden: true, contactPhoneHidden: true,
}

export const incidentMocks = {
  summaries: incidentMockSummaries,
  details: incidentMockDetails,
  customer: incidentMockCustomer,
  pendingCost,
} as const

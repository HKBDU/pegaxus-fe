/** Feature `handover` (Flow 4, UC-62): enums, labels, limits and URLs. Values follow DB V8 and `api-contract/flow4.md` section 8. */

export const HANDOVER_TYPES = ["PICKUP", "TRANSFER", "BORDER_HANDOVER", "CARRIER_HANDOVER", "DELIVERY", "OTHER"] as const
export type HandoverType = (typeof HANDOVER_TYPES)[number]

export const HANDOVER_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number]

/** `PROVIDER` is not in DB V8 yet (B-03): the BE answers 422 until it is, and the label is ready for when it is. */
export const HANDOVER_PARTY_TYPES = ["CUSTOMER", "EMPLOYEE", "PROVIDER"] as const
export type HandoverPartyType = (typeof HANDOVER_PARTY_TYPES)[number]

/** Buttons come from `availableActions` of the record, never from role + status (contract: "Nut hanh dong chi theo co BE tra"). */
export const HANDOVER_ACTIONS = ["START", "COMPLETE", "CANCEL"] as const
export type HandoverAction = (typeof HANDOVER_ACTIONS)[number]

export const TYPE_LABEL: Record<HandoverType, string> = {
  PICKUP: "Pickup",
  TRANSFER: "Transfer",
  BORDER_HANDOVER: "Border handover",
  CARRIER_HANDOVER: "Carrier handover",
  DELIVERY: "Delivery",
  OTHER: "Other",
}

export const STATUS_LABEL: Record<HandoverStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export const PARTY_LABEL: Record<HandoverPartyType, string> = {
  CUSTOMER: "Customer",
  EMPLOYEE: "Pegaxus employee",
  PROVIDER: "Provider",
}

export const TYPE_OPTIONS = HANDOVER_TYPES.map((value) => ({ value, label: TYPE_LABEL[value] }))
export const STATUS_OPTIONS = HANDOVER_STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }))

/** Which group of users a page is drawn for: staff (admin), the crew on a phone, or the Customer (read only). */
export type HandoverAudience = "admin" | "crew" | "customer"

/** HO5 signature images: PNG, at most 200 KB each. */
export const SIGNATURE_MAX_BYTES = 200 * 1024
/** HO6: the reason must have at least 10 characters after trim. */
export const CANCEL_REASON_MIN = 10
/** Field limits of the party snapshot and the location (HO3/HO5 validators). */
export const LIMITS = { partyName: 200, contactName: 150, contactPhone: 30, locationName: 200, address: 500, country: 100, note: 2000 } as const

/** Radius used for the hint when the record carries no `geofence` (the BE value, `TrackingOptions.GeofenceRadiusMeters`, wins). */
export const HANDOVER_GEOFENCE_METERS = 500

/** Every handover of a transport fits in one page: one per boundary plus the cancelled ones. */
export const LIST_PAGE_SIZE = 100
export const TABLE_PAGE_SIZE = 8

const base = {
  admin: (transportId: string) => `/admin/ongoing-transports/${encodeURIComponent(transportId)}/handovers`,
  crew: (transportId: string) => `/crew/transports/${encodeURIComponent(transportId)}/handovers`,
  customer: (bookingId: string, transportId: string) =>
    `/bookings/${encodeURIComponent(bookingId)}/transports/${encodeURIComponent(transportId)}/handovers`,
}

/** Shared URL contract with the owners of `ongoing-transport` (links to `.../handovers/new?...` and `.../handovers/:id`). */
export const handoverPaths = {
  list: (audience: HandoverAudience, transportId: string, bookingId?: string) =>
    audience === "customer" && bookingId ? base.customer(bookingId, transportId) : audience === "crew" ? base.crew(transportId) : base.admin(transportId),
  record: (audience: HandoverAudience, transportId: string, handoverRecordId: string, bookingId?: string) =>
    `${handoverPaths.list(audience, transportId, bookingId)}/${encodeURIComponent(handoverRecordId)}`,
  start: (audience: HandoverAudience, transportId: string, boundary: { handoverType?: string; from?: string | null; to?: string | null }) => {
    const query = new URLSearchParams()
    if (boundary.handoverType) query.set("handoverType", boundary.handoverType)
    if (boundary.from) query.set("fromRoutePlanRouteId", boundary.from)
    if (boundary.to) query.set("toRoutePlanRouteId", boundary.to)
    const text = query.toString()
    return `${handoverPaths.list(audience, transportId)}/new${text ? `?${text}` : ""}`
  },
} as const

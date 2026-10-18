/** Feature flags of the live tracking tab (Flow 4, UC-53 viewer side). */
export const FEATURES = {
  /**
   * `true`: one GP1 snapshot, then vehicle samples arrive through the transport tracking hub (`LocationUpdated`).
   * `false`: no WebSocket, GP1 is called again every `SNAPSHOT_POLL_MS` while the browser tab is visible (L-06).
   */
  realtimeStream: true,
} as const

/** `LIVE` up to 30 s after the newest sample, `DELAYED` up to 2 min, `LOST` after that or with no sample (O-F4-18). */
export const SIGNAL_LIVE_MS = 30_000
export const SIGNAL_DELAYED_MS = 120_000
/** How often the signal chip is re-evaluated while no new sample arrives. */
export const SIGNAL_TICK_MS = 5_000
export const SNAPSHOT_POLL_MS = 15_000
/** Two samples further apart than this are not joined by the trail: the vehicle lost its signal in between (ALT-01). */
export const TRAIL_BREAK_MS = 120_000
/** Keep the trail bounded: 15 s samples fill this in about eight hours. */
export const TRAIL_MAX_POINTS = 2_000
/** The remaining distance/ETA is recomputed only after the vehicle moved this far AND this long passed. */
export const ESTIMATE_MIN_MOVE_METERS = 500
export const ESTIMATE_MIN_INTERVAL_MS = 30_000
/** A sample of another leg means the next stop changed: reload GP1, at most this often. */
export const SNAPSHOT_REFRESH_MIN_MS = 10_000

/** GP1 only answers for these Transport statuses (API contract 7.1). */
export const TRACKING_TRANSPORT_STATUSES = ["READY", "IN_TRANSIT", "COMPLETED"] as const

/** Dev only: `?demo=1` on the GPS tab shows a simulated trip instead of calling the BE (see mock/demo.ts). Always false in a build. */
export const isDemoMode = () => import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1"

export type TrackingAudience = "admin" | "customer"

/** Who may open Tab 4: staff of the transport (GP1 needs no assignment) and the Customer of the booking. Not crew. */
export const TRACKING_ADMIN_ROLES = ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"] as const
export const TRACKING_CUSTOMER_ROLES = ["CUSTOMER"] as const

/**
 * URLs of the transport tabs. The Tab GPS slug is `gps`; the other slugs follow the Flow 4 route table of the
 * owners of those tabs (`ongoing-transport`, `horse-health`) and are only used for the tab links.
 */
const adminBase = (transportId: string) => `/admin/ongoing-transports/${encodeURIComponent(transportId)}`
const customerBase = (bookingId: string, transportId: string) =>
  `/bookings/${encodeURIComponent(bookingId)}/transports/${encodeURIComponent(transportId)}`

export const trackingPaths = {
  adminPattern: "/admin/ongoing-transports/:transportId/gps",
  customerPattern: "/bookings/:bookingId/transports/:transportId/gps",
  tabs: (audience: TrackingAudience, transportId: string, bookingId?: string) => {
    const base = audience === "customer" && bookingId ? customerBase(bookingId, transportId) : adminBase(transportId)
    return { overview: base, route: `${base}/route`, health: `${base}/health`, gps: `${base}/gps` }
  },
} as const

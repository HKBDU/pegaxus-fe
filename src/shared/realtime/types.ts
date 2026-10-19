/** Shapes of the BE notification feature (SIGNALR_NOTIFICATION.md, api `/notifications`). */

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"
export type NotificationDeliveryStatus = "PENDING" | "DELIVERED" | "READ"

/** Hub event `ReceiveNotification` and one row of `GET /notifications`. `actionUrl` only exists on the REST rows. */
export interface AppNotification {
  id: string
  /** BOOKING, TRANSPORT, COMPLIANCE, ROUTE, PAYMENT, SYSTEM ... (group of the notification). */
  type: string
  title: string
  message: string
  priority: NotificationPriority
  status: NotificationDeliveryStatus
  createdAt: string
  referenceType: string | null
  referenceId: string | null
  actionUrl?: string | null
  deliveredAt?: string | null
  readAt?: string | null
}

/**
 * Event `LocationUpdated` of the transport tracking hub (`/hubs/transport-tracking`, API contract 7.3): one GPS sample
 * of the vehicle. It has no server time, so the viewer judges freshness with the `serverTime` of the GP1 snapshot.
 */
export interface TransportLocationUpdate {
  transportId: string
  routePlanRouteId: string | null
  latitude: number
  longitude: number
  headingDegrees: number | null
  speedKmh: number | null
  accuracyMeters: number | null
  recordedAt: string
}

export type RealtimeConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected"

/** Ephemeral (not stored) hub events: add the payload type here when the BE starts emitting one. */
export interface RealtimeEventMap {
  ReceiveNotification: AppNotification
  BookingEditingStarted: { bookingId: string; accountId: string; timestamp: string }
  BookingEditingStopped: { bookingId: string; accountId: string; timestamp: string }
}

export type RealtimeEventName = keyof RealtimeEventMap

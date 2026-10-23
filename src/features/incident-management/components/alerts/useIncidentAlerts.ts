import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/features/auth/store"
import { useNotificationStore, type AppNotification } from "@/shared/realtime"

import { ALERT_NOTIFICATION_TYPES } from "../../constants"
import { incidentKeys } from "../../hooks/useIncidents"
import { useIncidentViewer } from "../../hooks/useViewer"
import { incidentService } from "../../services"

/** What the banner reacts to: incident reports and the Hold & Wait order. Cost requests are shown by the toast only. */
const ALERT_REFERENCES = new Set(["IncidentReport", "IncidentHold"])

const rank = (notification: AppNotification) => (notification.priority === "URGENT" ? 1 : 0)

export const isIncidentAlert = (notification: AppNotification) =>
  notification.status !== "READ" &&
  (notification.priority === "HIGH" || notification.priority === "URGENT") &&
  ALERT_NOTIFICATION_TYPES.has(notification.type) &&
  ALERT_REFERENCES.has(notification.referenceType ?? "")

/**
 * Staff and crew only (a Customer never gets the banner). Picks ONE unread HIGH / URGENT notification at a time, the most
 * severe and newest first. The push carries no incident data, so the incident is read with IN8 for the banner fields.
 */
export function useIncidentAlerts() {
  const { isAdminStaff, isCrew } = useIncidentViewer()
  const enabled = isAdminStaff || isCrew
  const session = useAuthStore((state) => state.sessionVersion)
  const client = useQueryClient()
  const items = useNotificationStore((state) => state.items)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [muted, setMuted] = useState<ReadonlySet<string>>(new Set())

  const queue = useMemo(
    () =>
      enabled
        ? items
            .filter((item) => isIncidentAlert(item) && !hidden.has(item.id))
            .sort((a, b) => rank(b) - rank(a) || b.createdAt.localeCompare(a.createdAt))
        : [],
    [enabled, hidden, items],
  )
  const active = queue[0] ?? null

  // A new incident notification means the lists and the open detail page are out of date.
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!enabled) return
    const ids = new Set(items.filter((item) => ALERT_NOTIFICATION_TYPES.has(item.type)).map((item) => item.id))
    const previous = seen.current
    seen.current = ids
    if (previous && [...ids].some((id) => !previous.has(id))) void client.invalidateQueries({ queryKey: incidentKeys.all })
  }, [client, enabled, items])

  const incidentReportId = active?.referenceType === "IncidentReport" ? active.referenceId : null
  const incidentQuery = useQuery({
    queryKey: incidentKeys.alert(incidentReportId ?? "", session),
    queryFn: ({ signal }) => incidentService.get(incidentReportId as string, signal),
    enabled: Boolean(incidentReportId),
    retry: false,
    staleTime: 30_000,
  })

  return {
    active,
    queueSize: queue.length,
    incident: incidentQuery.data ?? null,
    isMuted: active ? muted.has(active.id) : false,
    mute: (id: string) => setMuted((current) => new Set(current).add(id)),
    hide: (id: string) => setHidden((current) => new Set(current).add(id)),
  }
}

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { ROLE_ROUTES } from "@/app/route-config"
import { useMarkNotificationRead } from "@/features/notification/hooks"
import { resolveNotificationPath, type AppNotification } from "@/shared/realtime"

import { useAlertsDrawerStore } from "../../alerts-drawer-store"
import { incidentRoutes } from "../../constants"
import { useIncidentViewer } from "../../hooks/useViewer"
import { installMockAlertTrigger } from "../../mock"
import { isIncidentMockMode } from "../../services"
import { AlertsDrawer } from "./AlertsDrawer"
import { EmergencyAlertBanner } from "./EmergencyAlertBanner"
import { EmergencyAlertModal } from "./EmergencyAlertModal"
import { useAlertSound } from "./useAlertSound"
import { useIncidentAlerts } from "./useIncidentAlerts"

/**
 * SCR-F5-004. Mounted once per layout (admin shell, crew shell). It renders nothing for a Customer or when there is no unread
 * HIGH / URGENT incident notification: banner (+ sound for URGENT), the one-time "Immediate action required" card and the drawer.
 */
export function IncidentAlertHost() {
  const navigate = useNavigate()
  const { principal, isManager, isCoordinator, isAdminStaff, isCrew } = useIncidentViewer()
  const alerts = useIncidentAlerts()
  const markRead = useMarkNotificationRead()
  const drawerOpen = useAlertsDrawerStore((state) => state.open)
  const setDrawerOpen = useAlertsDrawerStore((state) => state.setOpen)
  const [modalSeen, setModalSeen] = useState<ReadonlySet<string>>(new Set())
  const { active, incident } = alerts

  const urgent = active?.priority === "URGENT"
  const { blocked } = useAlertSound(Boolean(active && urgent && !alerts.isMuted))
  const canReroute = isManager || isCoordinator

  useEffect(() => (isIncidentMockMode() ? installMockAlertTrigger() : undefined), [])

  const open = (notification: AppNotification) => {
    markRead.mutate(notification.id)
    setDrawerOpen(false)
    navigate(resolveNotificationPath(notification, principal) ?? ROLE_ROUTES.notifications)
  }
  const reroute = () => {
    if (!active?.referenceId) return
    markRead.mutate(active.id)
    navigate(incidentRoutes.reroute(active.referenceId))
  }
  if (!isAdminStaff && !isCrew) return null
  const showModal = Boolean(active && urgent && incident && active.referenceType === "IncidentReport" && !modalSeen.has(active.id))

  return (
    <>
      {active ? (
        <EmergencyAlertBanner
          alert={active}
          incident={incident}
          more={alerts.queueSize - 1}
          muted={alerts.isMuted}
          soundBlocked={blocked}
          canReroute={canReroute}
          onOpen={() => open(active)}
          onReroute={reroute}
          onMute={() => alerts.mute(active.id)}
          onHide={() => alerts.hide(active.id)}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      ) : null}
      {active && incident && showModal ? (
        <EmergencyAlertModal
          incident={incident}
          open
          canReroute={canReroute}
          onView={() => open(active)}
          onReroute={reroute}
          onDismiss={() => setModalSeen((current) => new Set(current).add(active.id))}
        />
      ) : null}
      <AlertsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSelect={open} onViewAll={() => { setDrawerOpen(false); navigate(ROLE_ROUTES.notifications) }} />
    </>
  )
}

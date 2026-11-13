import { AlertTriangle, RefreshCw, Stethoscope, UserRound } from "lucide-react"
import { Link, useLocation, useParams } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { normalizeRole } from "@/features/auth/access-control"
import { LoadingState } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"

import { HorseHealthAccordion } from "../components/HorseHealthAccordion"
import { healthPanel, noticeError, noticeMuted } from "../components/health-ui"
import { HORSE_HEALTH_ROUTES } from "../constants"
import { useHorseHealthOverview } from "../hooks/useHorseHealth"
import { isHorseHealthMockMode } from "../services"

export default function HealthTabPage() {
  const { transportId = "" } = useParams<{ transportId: string }>()
  const location = useLocation()
  const principal = useAuthStore((state) => state.principal)
  const isEscort = principal?.roles.some((role) => normalizeRole(role) === "ESCORT") ?? false
  const query = useHorseHealthOverview(transportId)
  const data = query.data
  const audience = location.pathname.startsWith("/admin/") ? "admin" : location.pathname.startsWith("/bookings/") ? "customer" : "crew"
  const healthHref = audience === "admin"
    ? `/admin/ongoing-transports/${encodeURIComponent(transportId)}/health`
    : audience === "customer"
      ? `/bookings/${encodeURIComponent(location.pathname.split("/")[2] ?? "")}/transports/${encodeURIComponent(transportId)}/health`
      : HORSE_HEALTH_ROUTES.health(transportId)
  const historyHref = (horseId: string) => `${healthHref}/${encodeURIComponent(horseId)}`

  return (
    <div className="space-y-3">
      {isHorseHealthMockMode() && (
        <p className={noticeMuted}>FE mock data enabled. Set VITE_HORSE_HEALTH_MOCK=false to call the API.</p>
      )}
      {query.isPending ? (
        <LoadingState />
      ) : query.error && !data ? (
        <div className={noticeError}>
          <p className="m-0 flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Unable to load horse health overview.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()} className="mt-3 rounded-xs">
            <RefreshCw aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : data ? (
        <>
          {/* The transport status already sits in the page header, so this strip only carries the escort and the action. */}
          <div className={`${healthPanel} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}>
            <p className="m-0 flex items-center gap-2 text-xs text-slate-500">
              <UserRound className="size-4 text-primary" aria-hidden="true" />
              Current escort:
              <span className="font-medium text-slate-800">{data.currentEscort?.fullName ?? "Not assigned"}</span>
            </p>
            {isEscort && (
              <Button asChild size="sm" className="rounded-xs">
                <Link to={`${HORSE_HEALTH_ROUTES.health(transportId)}/new`}>
                  <Stethoscope aria-hidden="true" />
                  Record horse status
                </Link>
              </Button>
            )}
          </div>
          {query.error && <p className={noticeMuted}>Live refresh failed. Showing data from {data.serverTime}.</p>}
          <div className="space-y-2">
            {data.horses.map((item) => (
              <HorseHealthAccordion key={item.horse.horseId} item={item} transportId={transportId} historyHref={historyHref} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

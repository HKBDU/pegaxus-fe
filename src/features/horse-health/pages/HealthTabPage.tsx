import { AlertTriangle, RefreshCw, Stethoscope } from "lucide-react"
import { Link, useLocation, useParams } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { normalizeRole } from "@/features/auth/access-control"
import { LoadingState } from "@/shared/components/common"

import { HorseHealthAccordion } from "../components/HorseHealthAccordion"
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

  return <div className="space-y-4">
    {isHorseHealthMockMode() && <p className="border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-[#181818]">FE mock data enabled. Set VITE_HORSE_HEALTH_MOCK=false to call the API.</p>}
    {query.isPending ? <LoadingState /> : query.error && !data ? <div className="border border-red-600 bg-red-50 p-4 text-sm text-red-600"><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />Unable to load horse health overview.</p><button type="button" onClick={() => void query.refetch()} className="mt-3 inline-flex min-h-12 items-center gap-2 border border-red-600 px-3 font-semibold"><RefreshCw className="size-4" />Retry</button></div> : data ? <>
      <div className="border border-slate-300 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Transport</p><p className="text-sm font-bold text-[#181818]">{data.transportId}</p><span className="mt-1 inline-flex bg-[#f39200] px-2 py-1 text-xs font-bold uppercase text-[#181818]">{data.transportStatus.replace("_", " ")}</span></div>{data.currentEscort && <p className="text-sm text-slate-600">Current escort: <span className="font-semibold text-[#181818]">{data.currentEscort.fullName}</span></p>}</div>{isEscort && <Link to={`${HORSE_HEALTH_ROUTES.health(transportId)}/new`} className="mt-4 inline-flex min-h-12 items-center gap-2 border border-[#f39200] px-4 text-sm font-bold text-[#181818] hover:bg-orange-50"><Stethoscope className="size-4 text-[#f39200]" />Record horse status</Link>}</div>
      {query.error && <p className="border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-[#181818]">Live refresh failed. Showing data from {data.serverTime}.</p>}
      <div className="space-y-2">{data.horses.map((item) => <HorseHealthAccordion key={item.horse.horseId} item={item} transportId={transportId} historyHref={historyHref} />)}</div>
    </> : null}
  </div>
}

import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"

import { ErrorState, LoadingState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { useIsDesktop } from "@/shared/hooks"
import { formatUtcDateTime } from "@/shared/utils/datetime"

import { AssignedTransportsTable } from "../components/AssignedTransportsTable"
import { CrewShell } from "../components/CrewShell"
import { HORSE_HEALTH_ROUTES } from "../constants"
import { useAssignedTransports } from "../hooks/useAssignedTransports"
import type { AssignedTransport } from "../types"

function formatDate(value: string | null) {
  return formatUtcDateTime(value)
}

function TransportListItem({ transport }: { transport: AssignedTransport }) {
  return <article className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">{transport.transportCode}</h2>
        <p className="mt-1 text-xs text-slate-500">Booking code: {transport.bookingCode}</p>
      </div>
      <span className="rounded-[2px] bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">{transport.status.replace("_", " ")}</span>
    </div>
    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
      <div><p className="text-xs text-slate-400">Horses</p><p className="mt-1 font-semibold text-slate-800">{transport.horseCount}</p></div>
      <div><p className="text-xs text-slate-400">Current leg</p><p className="mt-1 font-semibold text-slate-800">{transport.currentSegment ? `${transport.currentSegment.fromLocationName} → ${transport.currentSegment.toLocationName}` : "Not started"}</p></div>
      <div><p className="text-xs text-slate-400">Departure</p><p className="mt-1 font-semibold text-slate-800">{formatDate(transport.departureAt)}</p></div>
    </div>
    <Link to={HORSE_HEALTH_ROUTES.transportDetail(transport.transportId)} className="mt-4 inline-flex min-h-10 items-center gap-2 border border-slate-200 px-3 text-sm font-semibold text-slate-800 hover:border-orange-300">
      View Transport Plan <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  </article>
}

export default function AssignedTransportsPage() {
  const query = useAssignedTransports()
  const isDesktop = useIsDesktop()

  // Desktop: the table of the booking list inside the employee shell. Phones keep the cards below.
  if (isDesktop) {
    return <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6"><PageHeader title="ASSIGNED TRANSPORTS" backHref={HORSE_HEALTH_ROUTES.home} showBack={false} /></div>
        {query.isPending ? <LoadingState /> : query.error && !query.data
          ? <ErrorState message={query.error instanceof Error ? query.error.message : "Unable to load assigned transports."} onRetry={() => void query.refetch()} />
          : <AssignedTransportsTable transports={query.data?.items ?? []} />}
      </div>
    </div>
  }

  return <CrewShell><div className="mx-auto max-w-3xl space-y-4">
    <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Assigned transports</h1>
    {query.isPending ? <LoadingState /> : query.error && !query.data ? <ErrorState message={query.error instanceof Error ? query.error.message : "Unable to load assigned transports."} onRetry={() => void query.refetch()} /> : query.data?.items.length === 0 ? <div className="border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-semibold text-slate-800">No assigned transports</p><button type="button" onClick={() => void query.refetch()} className="mt-4 inline-flex min-h-10 items-center gap-2 bg-slate-900 px-4 text-sm font-semibold text-white"><RefreshCw className="size-4" />Refresh</button></div> : <div className="space-y-3">{query.error && <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Live refresh failed. Showing last known transports.</div>}{query.data?.items.map((transport) => <TransportListItem key={transport.transportId} transport={transport} />)}</div>}
  </div></CrewShell>
}

import { BellRing, Check, MapPin, Route, VolumeX, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { INCIDENT_CATEGORY_OPTIONS, INCIDENT_SEVERITY_OPTIONS } from "@/shared/constants/incident"
import type { AppNotification } from "@/shared/realtime"

import type { Incident } from "../../types"
import { placeLine, roleLabel } from "../../utils"

interface EmergencyAlertBannerProps {
  alert: AppNotification
  incident: Incident | null
  more: number
  muted: boolean
  soundBlocked: boolean
  canReroute: boolean
  onOpen: () => void
  onReroute: () => void
  onMute: () => void
  onHide: () => void
  onOpenDrawer: () => void
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-[0.08em] opacity-75">{label}</dt>
      <dd className="m-0 line-clamp-2 break-words text-xs font-medium leading-4">{children}</dd>
    </div>
  )
}

/** SCR-F5-004 banner: the most severe unread HIGH / URGENT incident notification, above the page header. */
export function EmergencyAlertBanner({ alert, incident, more, muted, soundBlocked, canReroute, onOpen, onReroute, onMute, onHide, onOpenDrawer }: EmergencyAlertBannerProps) {
  const urgent = alert.priority === "URGENT"
  const isHold = alert.referenceType === "IncidentHold"
  const buttonClass = cn(
    "inline-flex h-9 items-center gap-1.5 rounded-[2px] border px-3 sm:h-8 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
    urgent ? "border-white/60 text-white hover:bg-white/15" : "border-slate-900/40 text-slate-950 hover:bg-black/10",
  )

  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cn("relative z-10 border-b-4 px-3 py-2.5 sm:px-6", urgent ? "border-red-950 bg-red-700 text-white" : "border-amber-700 bg-amber-400 text-slate-950")}
    >
      {urgent ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-pulse bg-white/10 motion-reduce:animate-none" /> : null}
      <div className="relative mx-auto flex max-w-[1152px] flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <BellRing className={cn("mt-0.5 size-5 shrink-0", urgent && "animate-bounce motion-reduce:animate-none")} aria-hidden="true" />
          <div className="min-w-0">
            <p className="m-0 font-heading text-sm font-bold uppercase leading-5 tracking-[0.04em]">
              {incident ? `${urgent ? "Urgent incident" : "High-priority incident"} — ${incident.incidentCode}` : alert.title}
              {more > 0 ? <span className="ml-2 rounded-full bg-black/25 px-2 py-0.5 text-[10px] normal-case tracking-normal">+{more} more</span> : null}
            </p>
            {incident && !isHold ? (
              <>
                <p className="m-0 mt-0.5 text-xs font-medium sm:hidden">
                  {INCIDENT_CATEGORY_OPTIONS[incident.category].label} · {INCIDENT_SEVERITY_OPTIONS[incident.severity].label} · {incident.transport?.transportCode}
                </p>
                <dl className="m-0 mt-1 hidden grid-cols-2 gap-x-5 gap-y-1 sm:grid sm:grid-cols-4">
                  <Fact label="Transport">{incident.transport?.transportCode}</Fact>
                  <Fact label="Category / severity">
                    {INCIDENT_CATEGORY_OPTIONS[incident.category].label} · {INCIDENT_SEVERITY_OPTIONS[incident.severity].label}
                  </Fact>
                  <Fact label="Reported by">
                    {incident.reportedBy.fullName} ({roleLabel(incident.reportedBy.role)}){incident.reportedBy.phone ? ` · ${incident.reportedBy.phone}` : ""}
                  </Fact>
                  <Fact label="Location">
                    <MapPin className="mr-1 inline size-3" aria-hidden="true" />
                    {placeLine(incident.location)}
                  </Fact>
                </dl>
              </>
            ) : (
              <p className="m-0 mt-0.5 line-clamp-2 text-xs leading-4 opacity-90">{alert.message}</p>
            )}
            {urgent && soundBlocked && !muted ? <p className="m-0 mt-1 text-[11px] font-medium underline">Sound is blocked by the browser. Click anywhere on the page to turn it on.</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 lg:shrink-0">
          {isHold ? (
            <button type="button" className={buttonClass} onClick={onOpen}>
              <Check className="size-3.5" aria-hidden="true" />
              Acknowledge instruction
            </button>
          ) : (
            <button type="button" className={buttonClass} onClick={onOpen}>Open incident</button>
          )}
          {canReroute && !isHold && incident ? (
            <button type="button" className={buttonClass} onClick={onReroute}>
              <Route className="size-3.5" aria-hidden="true" />
              Reroute
            </button>
          ) : null}
          {urgent && !muted ? (
            <button type="button" className={buttonClass} onClick={onMute}>
              <VolumeX className="size-3.5" aria-hidden="true" />
              Mute sound
            </button>
          ) : null}
          <button type="button" className={buttonClass} onClick={onOpenDrawer}>All alerts</button>
          <button type="button" aria-label="Hide this banner" className={cn(buttonClass, "w-8 justify-center px-0")} onClick={onHide}>
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

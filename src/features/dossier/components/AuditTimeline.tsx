import { cn } from "@/lib/utils"
import type { AuditEvent } from "@/features/dossier/types"
import { formatLocalDateTime, formatUtcDateTime, getAuditTone, getInitials, getRoleLabel, type AuditTone } from "@/features/dossier/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"

const toneDot: Record<AuditTone, string> = {
  neutral: "bg-slate-400",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  danger: "bg-red-500",
  warning: "bg-amber-400",
  accent: "bg-[#ef8f00]",
}

const toneBadge: Record<AuditTone, string> = {
  neutral: "border-slate-300 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  accent: "border-orange-200 bg-orange-50 text-orange-700",
}

const GRID = "@min-[52rem]:grid-cols-[9rem_10rem_9rem_8rem_minmax(0,1fr)]"

interface AuditTimelineProps {
  events: AuditEvent[]
  isLoading?: boolean
  /** ALT-01: open the version history of the document an event refers to. Hidden when not provided. */
  onViewVersionHistory?: (event: AuditEvent) => void
}

/** SCR-F2-024: newest event first. Read-only on purpose, the audit table is append-only (UC-31 EXC-01). */
export function AuditTimeline({ events, isLoading, onViewVersionHistory }: AuditTimelineProps) {
  return (
    <div className="booking-panel @container min-w-0 border bg-white">
      <div role="row" className={cn("hidden min-w-0 gap-4 border-b border-slate-200 bg-[#e9e6de] py-3 pl-12 pr-4 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600 @min-[52rem]:grid", GRID)}>
        <span role="columnheader">Timestamp</span>
        <span role="columnheader">Action</span>
        <span role="columnheader">Actor</span>
        <span role="columnheader">Target entity</span>
        <span role="columnheader">Details</span>
      </div>

      {isLoading ? (
        <div className="grid gap-px">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="p-4"><Skeleton className="h-10 rounded-none bg-slate-100" /></div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="m-0 p-10 text-center text-sm text-slate-500">No audit events match the current filters.</p>
      ) : (
        <ol className="relative m-0 list-none p-0">
          {events.map((event, index) => {
            const tone = getAuditTone(event.actionType)
            return (
              <li key={`${event.occurredAt}-${event.actionType}-${index}`} className="relative border-b border-slate-100 last:border-b-0">
                {/* Vertical rail: one segment per row so it also works when the list is paged. */}
                <span aria-hidden="true" className={cn("absolute left-[1.15rem] w-px bg-amber-300", index === 0 ? "top-1/2" : "top-0", index === events.length - 1 ? "bottom-1/2" : "bottom-0")} />
                <span aria-hidden="true" className={cn("absolute left-4 top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-2 ring-white", toneDot[tone])} />

                <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-2 py-4 pl-12 pr-4", GRID)}>
                  <div className="min-w-0 text-xs [overflow-wrap:anywhere]">
                    <p className="m-0 font-semibold text-slate-900">{formatUtcDateTime(event.occurredAt)}</p>
                    <p className="m-0 mt-0.5 text-[0.7rem] text-slate-400">{formatLocalDateTime(event.occurredAt)} (local)</p>
                  </div>

                  <div className="min-w-0">
                    <span className={cn("inline-flex max-w-full items-center rounded-[2px] border px-2 py-1 font-mono text-[0.62rem] font-medium leading-4", toneBadge[tone])}>
                      <span className="min-w-0 [overflow-wrap:anywhere]">{event.actionType}</span>
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[0.65rem] font-semibold text-slate-600">{getInitials(event.actor.fullName)}</span>
                    <div className="min-w-0 text-xs">
                      <p className="m-0 font-semibold text-slate-900 [overflow-wrap:anywhere]">{event.actor.fullName}</p>
                      <p className="m-0 text-[0.7rem] text-slate-500 [overflow-wrap:anywhere]">{getRoleLabel(event.actor.role)}</p>
                    </div>
                  </div>

                  <div className="min-w-0 text-xs">
                    <p className="m-0 font-semibold text-slate-900 [overflow-wrap:anywhere]">{event.targetEntity}</p>
                    <p className="m-0 text-[0.7rem] text-slate-500 [overflow-wrap:anywhere]">{String(event.targetEntityId)}</p>
                  </div>

                  <div className="min-w-0 text-xs leading-5 text-slate-700">
                    <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{event.note || "—"}</p>
                    {event.actionType === "DOCUMENT_VERSION_SUBMITTED" && onViewVersionHistory ? (
                      <button type="button" className="mt-0.5 max-w-full text-left text-[0.7rem] font-semibold text-[#ef8f00] [overflow-wrap:anywhere] hover:underline" onClick={() => onViewVersionHistory(event)}>
                        View version history →
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

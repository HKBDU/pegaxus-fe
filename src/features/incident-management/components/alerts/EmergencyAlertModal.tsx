import { Route, Siren } from "lucide-react"

import { CategoryBadge, SeverityBadge } from "@/shared/components/incident"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

import type { Incident } from "../../types"
import { coordinates, placeLine, roleLabel, timeAgo } from "../../utils"
import { actionButtonClass, fieldLabelClass, outlineButtonClass, primaryButtonClass } from "../ui"

interface EmergencyAlertModalProps {
  incident: Incident
  open: boolean
  canReroute: boolean
  onView: () => void
  onReroute: () => void
  onDismiss: () => void
}

/** Full-attention card for an URGENT incident, shown once per alert; "Dismiss to banner" keeps the banner on screen. */
export function EmergencyAlertModal({ incident, open, canReroute, onView, onReroute, onDismiss }: EmergencyAlertModalProps) {
  const gps = coordinates(incident.location)
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent showCloseButton={false} className="max-h-[92dvh] gap-3 overflow-y-auto rounded-[2px] border-red-300 bg-white p-0 sm:max-w-lg">
        <DialogHeader className="gap-1 bg-red-700 px-4 py-3 text-white">
          <DialogTitle className="m-0! flex items-center gap-2 font-heading text-base! leading-5! font-bold! uppercase tracking-[0.04em]! text-white">
            <Siren className="size-5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            Immediate action required
          </DialogTitle>
          <DialogDescription className="text-xs text-red-100">A critical incident was just reported on an active transport.</DialogDescription>
        </DialogHeader>

        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2.5 px-4">
          <div><dt className={fieldLabelClass}>Incident code</dt><dd className="m-0 text-base font-bold text-slate-900">{incident.incidentCode}</dd></div>
          <div><dt className={fieldLabelClass}>Transport</dt><dd className="m-0 text-sm font-semibold leading-5 text-slate-900">{incident.transport?.transportCode}</dd></div>
          <div><dt className={fieldLabelClass}>Category</dt><dd className="m-0"><CategoryBadge category={incident.category} /></dd></div>
          <div><dt className={fieldLabelClass}>Severity</dt><dd className="m-0"><SeverityBadge severity={incident.severity} /></dd></div>
          <div className="col-span-2">
            <dt className={fieldLabelClass}>Reported by</dt>
            <dd className="m-0 text-sm font-semibold leading-5 text-slate-900">{incident.reportedBy.fullName} ({roleLabel(incident.reportedBy.role)}){incident.reportedBy.phone ? ` · ${incident.reportedBy.phone}` : ""}</dd>
          </div>
          <div className="col-span-2">
            <dt className={fieldLabelClass}>Location</dt>
            <dd className="m-0 text-sm font-semibold leading-5 text-slate-900">{placeLine(incident.location)}{gps ? <span className="text-gray-500"> ({gps})</span> : null}</dd>
          </div>
          <div className="col-span-2"><dt className={fieldLabelClass}>Reported</dt><dd className="m-0 text-sm font-semibold leading-5 text-slate-900">{timeAgo(incident.reportedAt, new Date(incident.serverTime).getTime())}</dd></div>
          <div className="col-span-2">
            <dt className={fieldLabelClass}>Quick summary</dt>
            <dd className="m-0 text-sm leading-6 text-gray-800"><strong>{incident.title}.</strong> {incident.description}</dd>
          </div>
        </dl>

        <DialogFooter className="flex-col-reverse gap-1.5 border-t border-slate-200 bg-[#faf9f6] px-4 py-3 sm:flex-row sm:justify-end [&>button]:h-10 sm:[&>button]:h-8">
          <button type="button" className={`${actionButtonClass} ${outlineButtonClass}`} onClick={onDismiss}>Dismiss to banner</button>
          {canReroute ? (
            <button type="button" className={`${actionButtonClass} ${outlineButtonClass}`} onClick={onReroute}>
              <Route className="size-3.5" aria-hidden="true" />
              Assign route decision
            </button>
          ) : null}
          <button type="button" className={`${actionButtonClass} ${primaryButtonClass}`} onClick={onView}>View incident</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

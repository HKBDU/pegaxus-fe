import { CircleAlert, FileText, Trash2, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { MandatoryBadge, ScopeBadge } from "@/features/compliance-catalog/components/RequirementBadges"
import type { DossierRequirementItem } from "@/features/compliance-catalog/dossier-types"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="m-0 min-w-0 break-words font-medium text-slate-900">{children}</dd>
    </>
  )
}

interface RemoveDossierRequirementDialogProps {
  requirement: DossierRequirementItem | null
  bookingCode: string
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * SCR-F2-010. An optional line can be removed after a confirmation; a mandatory one, or one that already has a
 * document, is shown as protected (UC-19 EXC-01, R10) and the dialog only explains why.
 */
export function RemoveDossierRequirementDialog({ requirement, bookingCode, isPending, onConfirm, onClose }: RemoveDossierRequirementDialogProps) {
  const protectedByMandatory = Boolean(requirement?.isMandatory)
  const protectedByDocument = Boolean(requirement?.document) && !protectedByMandatory
  const blocked = protectedByMandatory || protectedByDocument

  return (
    <Dialog open={requirement !== null} onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent className="gap-3 rounded-[2px] border-slate-200 bg-white p-3.5 sm:max-w-sm">
        {requirement ? (
          <>
            <DialogHeader className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-2 text-left">
              <span className={`grid size-6 place-items-center rounded-[2px] ${blocked ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                {blocked ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
              </span>
              <div className="grid gap-1">
                <DialogTitle className="m-0! w-full! justify-self-start! text-left! font-heading text-base! font-bold! tracking-normal! text-slate-900">
                  {blocked ? "Cannot remove requirement" : "Remove dossier requirement?"}
                </DialogTitle>
                <DialogDescription className="text-xs leading-5 text-slate-600">
                  {protectedByMandatory
                    ? "Mandatory requirements cannot be removed."
                    : protectedByDocument
                      ? "A document was already submitted for this requirement, so it cannot be removed any more."
                      : "Only this dossier line will be removed."}
                </DialogDescription>
              </div>
            </DialogHeader>

            <dl className="m-0 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-[2px] border border-slate-200 bg-slate-50 p-3 text-xs">
              <Row label="Requirement">{requirement.requirementName}</Row>
              <Row label="Scope"><ScopeBadge scope={requirement.horseId === null ? "TRIP" : "HORSE"} /></Row>
              {requirement.horseName ? <Row label="Horse">{requirement.horseName}</Row> : null}
              <Row label="Mandatory"><MandatoryBadge mandatory={requirement.isMandatory} /></Row>
              {requirement.document ? <Row label="Document">{requirement.document.documentCode}</Row> : null}
              <Row label="Booking">{bookingCode}</Row>
            </dl>

            {blocked ? (
              <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <p className="m-0">
                  {protectedByMandatory
                    ? "Mandatory requirement. Manage its upload and review instead."
                    : "Cannot remove a DossierRequirement that already has a ComplianceDocument."}
                </p>
              </div>
            ) : (
              <p className="m-0 flex items-start gap-2 rounded-[2px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Removes this line from the dossier only. The catalog requirement remains.
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" disabled={isPending} className="h-8 rounded-[2px] border-slate-300 bg-white px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-900 shadow-none" onClick={onClose}>
                {blocked ? "Close" : "Keep requirement"}
              </Button>
              {!blocked ? (
                <Button type="button" size="sm" disabled={isPending} className="h-8 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 shadow-none hover:bg-[#db8300]" onClick={onConfirm}>
                  <Trash2 className="size-3.5" />
                  {isPending ? "Removing..." : "Remove requirement"}
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

import { formatBookingDate } from "@/features/booking/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import type { DossierRequirement } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";

export function DossierRequirementDetailsDialog({ requirement, onClose }: { requirement: DossierRequirement; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[2px] bg-white">
        <DialogHeader><DialogTitle className="font-heading text-xl uppercase text-primary">Requirement Details</DialogTitle><DialogDescription>Read-only information from the dossier requirement.</DialogDescription></DialogHeader>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Requirement</dt><dd className="mt-1 font-semibold">{requirement.requirementName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Applies To</dt><dd className="mt-1">{requirement.horseId === null ? "Trip-level" : requirement.horseName ?? "Horse-specific"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="mt-1"><DossierStatusBadge status={requirement.status} /></dd></div>
          <div><dt className="text-xs text-muted-foreground">Mandatory</dt><dd className="mt-1">{requirement.isMandatory ? "Yes" : "No"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Due Date</dt><dd className="mt-1">{requirement.dueDate ? formatBookingDate(requirement.dueDate) : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Valid Until</dt><dd className="mt-1">{requirement.validUntil ? formatBookingDate(requirement.validUntil) : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Satisfied At</dt><dd className="mt-1">{requirement.satisfiedAt ? formatBookingDate(requirement.satisfiedAt, true) : "—"}</dd></div>
          {requirement.waivedReason ? <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Waiver Reason</dt><dd className="mt-1 whitespace-pre-wrap break-words">{requirement.waivedReason}</dd></div> : null}
          {requirement.note ? <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Note</dt><dd className="mt-1 whitespace-pre-wrap break-words">{requirement.note}</dd></div> : null}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

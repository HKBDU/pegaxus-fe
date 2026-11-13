import { DateTimeUtc } from "@/shared/components/DateTimeUtc";
import { formatBookingDate } from "@/features/booking/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import type { DossierRequirement } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";
import { useDossierRequirement } from "../hooks/useComplianceDocument";
import { DocumentRequestComments } from "./DocumentRequestComments";
import { Button } from "@/shared/components/ui/button";
import { getDossierLoadErrorKind } from "../source";

export function DossierRequirementDetailsDialog({
  requirement: initialRequirement,
  dossierId,
  role,
  onClose,
}: {
  requirement: DossierRequirement;
  dossierId: string;
  role?: string;
  onClose: () => void;
}) {
  const query = useDossierRequirement(
    dossierId,
    String(initialRequirement.dossierRequirementId),
  );
  const requirement = query.data ?? initialRequirement;
  const errorKind = query.isError ? getDossierLoadErrorKind(query.error) : null;
  const errorMessages = {
    unauthorized: "Your session has expired. Please sign in again.",
    forbidden: "You do not have permission to view this requirement.",
    "not-found":
      "This requirement is no longer available. Refresh the dossier.",
    contract:
      "Requirement details could not be read. Please contact support if this continues.",
    load: "We could not load this requirement and its document requests. Your dossier has not been changed.",
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[2px] bg-white">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase text-primary">
            Requirement Details
          </DialogTitle>
          <DialogDescription>
            What must be provided, which horse or trip it applies to, and when
            it is due. Submitted files are available under View submitted
            document.
          </DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <p
            role="status"
            className="rounded-[2px] bg-slate-50 p-4 text-sm text-slate-600"
          >
            Loading requirement details…
          </p>
        ) : errorKind ? (
          <div
            role="alert"
            className="space-y-3 rounded-[2px] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="m-0 font-semibold">Requirement details unavailable</p>
            <p className="m-0">{errorMessages[errorKind]}</p>
            {errorKind === "load" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                Retry loading details
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Requirement</dt>
                <dd className="mt-1 font-semibold">
                  {requirement.requirementName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Applies To</dt>
                <dd className="mt-1">
                  {requirement.horseId === null
                    ? "Trip-level"
                    : (requirement.horseName ?? "Horse-specific")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <DossierStatusBadge status={requirement.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Mandatory</dt>
                <dd className="mt-1">
                  {requirement.isMandatory ? "Yes" : "No"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Due Date</dt>
                <dd className="mt-1">
                  {requirement.dueDate
                    ? formatBookingDate(requirement.dueDate)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Valid Until</dt>
                <dd className="mt-1">
                  {requirement.validUntil
                    ? formatBookingDate(requirement.validUntil)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Satisfied At</dt>
                <dd className="mt-1">
                  {requirement.satisfiedAt ? (
                    <DateTimeUtc value={requirement.satisfiedAt} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {requirement.waivedReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    Waiver Reason
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words">
                    {requirement.waivedReason}
                  </dd>
                </div>
              ) : null}
              {requirement.note ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Note</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words">
                    {requirement.note}
                  </dd>
                </div>
              ) : null}
              {requirement.instruction ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    Submission instructions
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words">
                    {requirement.instruction}
                  </dd>
                </div>
              ) : null}
            </dl>
            {!requirement.document && query.data?.documentRequests?.length ? (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <h4 className="font-heading text-sm font-bold uppercase text-slate-800">
                  Document requests & follow-up
                </h4>
                {query.data.documentRequests.map((request) => (
                  <DocumentRequestComments
                    key={request.documentRequestId}
                    dossierId={dossierId}
                    requirementId={String(requirement.dossierRequirementId)}
                    request={request}
                    canReadComments={
                      role === "CUSTOMER" || role === "TRANSPORT_SPECIALIST"
                    }
                    canComment={
                      (role === "CUSTOMER" ||
                        role === "TRANSPORT_SPECIALIST") &&
                      request.status === "OPEN"
                    }
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

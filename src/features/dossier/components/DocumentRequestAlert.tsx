import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { formatBookingDate } from "@/features/booking/utils";
import {
  DOCUMENT_REQUEST_TYPES,
  documentRequestTypeLabels,
} from "../constants";
import type { DocumentRequestSummary } from "../types";

export function DocumentRequestAlert({
  request,
  action,
}: {
  request: DocumentRequestSummary;
  action?: ReactNode;
}) {
  const type = DOCUMENT_REQUEST_TYPES.find(
    (value) => value === request.requestType,
  );
  const heading = type ? documentRequestTypeLabels[type] : "Document follow-up";
  const open = request.status === "OPEN";
  const statusLabels: Record<string, string> = {
    OPEN: "Action required",
    FULFILLED: "Fulfilled",
    CLOSED: "Closed",
    CANCELLED: "Cancelled",
  };
  const reasonLabels: Record<string, string> = {
    UNCLEAR_IMAGE: "Unclear image",
    EXPIRED: "Expired document",
    MISSING_STAMP: "Missing stamp",
    WRONG_PAGE: "Wrong page",
    METADATA_MISMATCH: "Document information does not match",
    OTHER: "Other",
  };
  return (
    <section
      aria-label={heading}
      className={`dossier-revision-notice min-w-0 rounded-[2px] border border-l-2 p-4 text-sm [overflow-wrap:anywhere] ${open ? "border-amber-200 border-l-primary bg-amber-50/60" : "border-slate-200 border-l-slate-300 bg-slate-50"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2 text-slate-800">
          <TriangleAlert
            aria-hidden="true"
            className={`mt-0.5 size-4 shrink-0 ${open ? "text-primary" : "text-slate-400"}`}
          />
          <div className="min-w-0">
            <h3 className="font-heading text-base font-bold uppercase">
              {heading}
            </h3>
            <p className="mt-1 text-xs">{request.requestCode}</p>
            {request.status ? (
              <p className="mt-1 text-xs font-medium">
                {statusLabels[request.status] ?? "Document follow-up"}
              </p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      {request.errorCategory ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Reason:{" "}
          {reasonLabels[request.errorCategory] ??
            request.errorCategory.replaceAll("_", " ").toLowerCase()}
        </p>
      ) : null}
      <p className="mt-3 whitespace-pre-wrap break-words text-foreground">
        {request.message}
      </p>
      {request.dueDate ? (
        <p className="mt-3 text-xs text-muted-foreground">
          <strong>Deadline:</strong> {formatBookingDate(request.dueDate)}
        </p>
      ) : null}
    </section>
  );
}

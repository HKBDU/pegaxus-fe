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
  const heading = type ? documentRequestTypeLabels[type] : "Document Request";
  return (
    <section
      role="alert"
      aria-label={heading}
      className="dossier-revision-notice rounded-[2px] border border-destructive/20 bg-destructive/5 p-4 text-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2 text-destructive">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <div>
            <h3 className="font-heading text-base font-bold uppercase">
              {heading}
            </h3>
            <p className="mt-1 text-xs">{request.requestCode}</p>
          </div>
        </div>
        {action}
      </div>
      {request.errorCategory ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Reason: {request.errorCategory.replaceAll("_", " ")}
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

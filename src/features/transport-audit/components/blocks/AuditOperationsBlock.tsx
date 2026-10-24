import {
  AlertTriangle,
  FileText,
  ShieldCheck,
  MapPin,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditOperationsData } from "../../types";
import { BlockCard, StatusPill } from "./block-utils";
import { DownloadEpodButton } from "../DownloadEpodButton";
import { formatAuditDateTime } from "../../utils";

export function AuditOperationsBlock({ data }: { data?: AuditOperationsData }) {
  const handovers = data?.handovers ?? [];
  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-3.5">
      <BlockCard
        title="Handover Records & e-POD"
        empty={!handovers.length}
        action={
          <span className="text-xs text-slate-500">
            {handovers.length} {handovers.length === 1 ? "record" : "records"}{" "}
            archived
          </span>
        }
      >
        {handovers.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d9] bg-[#faf8f5]/60 hover:bg-[#faf8f5]/60">
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Record code
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Handover stage
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Completion time
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Digital signature
                  </TableHead>
                  <TableHead className="h-8 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    e-POD certificate
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {handovers.map((handover) => (
                  <TableRow
                    key={handover.handoverRecordId}
                    className="border-b border-slate-100 hover:bg-amber-500/[0.02]"
                  >
                    <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <FileText className="size-3.5 text-slate-400" />
                        <span>{handover.handoverCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <StatusPill tone="info">
                        {handover.handoverType}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-600">
                      {formatAuditDateTime(handover.completedAt)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {handover.digitalSignatureVerified ? (
                        <StatusPill tone="success">
                          <ShieldCheck className="size-3" />
                          <span>Verified</span>
                        </StatusPill>
                      ) : (
                        <StatusPill tone="warning">Pending</StatusPill>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <DownloadEpodButton
                        handoverRecordId={handover.handoverRecordId}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </BlockCard>

      <BlockCard
        title="Incident & Deviation Log"
        empty={!incidents.length}
        action={
          incidents.length ? (
            <span className="text-xs text-rose-600 font-semibold">
              {incidents.length} logged
            </span>
          ) : (
            <span className="text-xs text-emerald-600 font-medium">
              Zero deviations
            </span>
          )
        }
      >
        {incidents.length ? (
          <div className="space-y-2.5">
            {incidents.map((incident) => {
              const isCritical =
                incident.severity === "CRITICAL" || incident.severity === "HIGH";
              const isResolved = incident.status === "RESOLVED";

              return (
                <article
                  key={incident.incidentReportId}
                  className={`rounded-[2px] border p-3 transition-colors ${
                    isCritical
                      ? "border-rose-200 bg-rose-50/30"
                      : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`size-4 ${
                          isCritical ? "text-rose-600" : "text-amber-600"
                        }`}
                      />
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {incident.incidentCode}
                      </span>
                      <StatusPill tone={isCritical ? "danger" : "warning"}>
                        {incident.severity}
                      </StatusPill>
                      <StatusPill tone={isResolved ? "success" : "neutral"}>
                        {incident.status}
                      </StatusPill>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatAuditDateTime(incident.occurredAt)}
                      </span>
                      {incident.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {incident.location}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-slate-700">
                    <p className="font-medium text-slate-900 leading-relaxed">
                      {incident.summary}
                    </p>
                    {incident.resolutionNotes ? (
                      <div className="mt-1.5 rounded-[2px] bg-white border border-slate-200 p-2 text-slate-600">
                        <span className="font-semibold text-slate-700">
                          Resolution outcome:{" "}
                        </span>
                        {incident.resolutionNotes}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </BlockCard>
    </div>
  );
}

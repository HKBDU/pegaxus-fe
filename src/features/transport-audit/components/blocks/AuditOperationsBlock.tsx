import { AlertTriangle, Clock, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditOperationsData } from "../../types";
import { BlockCard, StatusPill, humanize } from "./block-utils";
import { DownloadEpodButton } from "../DownloadEpodButton";
import { formatAuditDateTime } from "../../utils";

const headClass =
  "h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600";

export function AuditOperationsBlock({ data }: { data?: AuditOperationsData }) {
  const handovers = data?.handovers ?? [];
  const incidents = data?.incidents ?? [];
  const auditDossiers = [...(data?.auditDossiers ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

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
                  <TableHead className={headClass}>Record code</TableHead>
                  <TableHead className={headClass}>Handover stage</TableHead>
                  <TableHead className={headClass}>Status</TableHead>
                  <TableHead className={headClass}>Completion time</TableHead>
                  <TableHead className={`${headClass} text-right`}>
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
                        {humanize(handover.handoverType)}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <StatusPill
                        tone={handover.status === "COMPLETED" ? "success" : "warning"}
                        dot
                      >
                        {humanize(handover.status)}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-600">
                      {formatAuditDateTime(handover.completedAt)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      {handover.status === "COMPLETED" ? (
                        <DownloadEpodButton
                          handoverRecordId={handover.handoverRecordId}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d9] bg-[#faf8f5]/60 hover:bg-[#faf8f5]/60">
                  <TableHead className={headClass}>Incident code</TableHead>
                  <TableHead className={headClass}>Category</TableHead>
                  <TableHead className={headClass}>Severity</TableHead>
                  <TableHead className={headClass}>Status</TableHead>
                  <TableHead className={headClass}>Occurred at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => {
                  const isCritical =
                    incident.severity === "CRITICAL" || incident.severity === "HIGH";

                  return (
                    <TableRow
                      key={incident.incidentReportId}
                      className={
                        isCritical
                          ? "border-b border-rose-100 bg-rose-50/30"
                          : "border-b border-slate-100"
                      }
                    >
                      <TableCell className="py-2.5 font-mono text-xs font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle
                            className={`size-3.5 ${isCritical ? "text-rose-600" : "text-amber-600"}`}
                          />
                          <span>{incident.incidentCode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        {humanize(incident.category)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StatusPill tone={isCritical ? "danger" : "warning"}>
                          {humanize(incident.severity)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StatusPill
                          tone={
                            incident.status === "RESOLVED" || incident.status === "CLOSED"
                              ? "success"
                              : "neutral"
                          }
                        >
                          {humanize(incident.status)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600">
                        {formatAuditDateTime(incident.occurredAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </BlockCard>

      <BlockCard
        title="Audit Dossier Entries"
        empty={!auditDossiers.length}
        action={
          <span className="text-xs text-slate-500">
            {auditDossiers.length}{" "}
            {auditDossiers.length === 1 ? "entry" : "entries"}
          </span>
        }
      >
        {auditDossiers.length ? (
          <ol className="space-y-2">
            {auditDossiers.map((entry) => (
              <li
                key={entry.auditDossierId}
                className="rounded-[2px] border border-slate-200 bg-white p-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusPill tone="info">{humanize(entry.actionType)}</StatusPill>
                    <span className="text-[11px] text-slate-500">
                      {entry.targetEntity}
                    </span>
                    <StatusPill
                      tone={entry.visibility === "PUBLIC" ? "success" : "neutral"}
                    >
                      {humanize(entry.visibility)}
                    </StatusPill>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="size-3" />
                    {formatAuditDateTime(entry.createdAt)}
                  </span>
                </div>
                {entry.summary ? (
                  <p className="mt-1.5 text-slate-700">{entry.summary}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </BlockCard>
    </div>
  );
}

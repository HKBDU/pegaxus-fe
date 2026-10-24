import { AlertTriangle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditOperationsData } from "../../types";
import { BlockCard } from "./block-utils";
import { DownloadEpodButton } from "../DownloadEpodButton";
import { formatAuditDateTime } from "../../utils";
export function AuditOperationsBlock({ data }: { data?: AuditOperationsData }) {
  const handovers = data?.handovers ?? [];
  const incidents = data?.incidents ?? [];
  return (
    <div className="space-y-4">
      <BlockCard title="Handover records" empty={!handovers.length}>
        {handovers.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {handovers.map((handover) => (
                <TableRow key={handover.handoverRecordId}>
                  <TableCell className="font-mono">
                    {handover.handoverCode}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{handover.handoverType}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatAuditDateTime(handover.completedAt)}
                  </TableCell>
                  <TableCell>
                    {handover.digitalSignatureVerified ? "Verified" : "Pending"}
                  </TableCell>
                  <TableCell>
                    <DownloadEpodButton
                      handoverRecordId={handover.handoverRecordId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </BlockCard>
      <BlockCard title="Incident log" empty={!incidents.length}>
        {incidents.length ? (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <article
                key={incident.incidentReportId}
                className="flex gap-3 border-b pb-3 last:border-0"
              >
                <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <strong>{incident.incidentCode}</strong>
                    <Badge
                      variant={
                        incident.severity === "CRITICAL" ||
                        incident.severity === "HIGH"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {incident.severity}
                    </Badge>
                    <Badge variant="outline">{incident.status}</Badge>
                  </div>
                  <p className="text-sm">{incident.summary}</p>
                  <p className="text-xs text-slate-500">
                    {formatAuditDateTime(incident.occurredAt)} ·{" "}
                    {incident.location ?? "Unknown location"}
                  </p>
                  {incident.resolutionNotes ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Resolution: {incident.resolutionNotes}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </BlockCard>
    </div>
  );
}

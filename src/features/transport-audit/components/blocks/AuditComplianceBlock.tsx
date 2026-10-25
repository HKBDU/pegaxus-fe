import { FileCheck, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { AuditComplianceData } from "../../types";
import { BlockCard, CopyValue, StatusPill, ValueGrid } from "./block-utils";
import { formatAuditDateTime } from "../../utils";

export function AuditComplianceBlock({
  data,
  onPreviewDoc,
}: {
  data?: AuditComplianceData;
  onPreviewDoc?: (title: string, url?: string) => void;
}) {
  const dossiers = data?.dossiers ?? [];
  const customs = data?.customsClearance;

  return (
    <div className="space-y-3.5">
      <BlockCard
        title="Cross-Border Compliance Dossiers"
        empty={!dossiers.length}
        action={
          <span className="text-xs text-slate-500">
            {dossiers.length}{" "}
            {dossiers.length === 1 ? "regulatory dossier" : "regulatory dossiers"}
          </span>
        }
      >
        {dossiers.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e6e2d9] bg-[#faf8f5]/60 hover:bg-[#faf8f5]/60">
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Dossier Code
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Category
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Compliance status
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Certified documents
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossiers.map((dossier) => {
                  const isApproved =
                    dossier.status === "APPROVED" ||
                    dossier.status === "VALIDATED" ||
                    dossier.status === "COMPLETED";

                  return (
                    <TableRow
                      key={dossier.dossierId}
                      className="border-b border-slate-100 hover:bg-amber-500/[0.02]"
                    >
                      <TableCell className="py-2.5 font-mono text-xs font-semibold text-slate-900">
                        {dossier.dossierCode}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StatusPill tone="info">{dossier.type}</StatusPill>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StatusPill tone={isApproved ? "success" : "warning"}>
                          {dossier.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {dossier.documents.map((doc) => {
                            const isDocValid = doc.status === "APPROVED";

                            return (
                              <div
                                key={doc.documentId}
                                className="inline-flex items-center gap-1.5 rounded-[2px] border border-slate-200 bg-white px-2 py-1 text-xs shadow-xs"
                              >
                                <FileCheck className="size-3 text-slate-400" />
                                <span className="font-medium text-slate-700">
                                  {doc.title}
                                </span>
                                <StatusPill
                                  tone={isDocValid ? "success" : "neutral"}
                                >
                                  {doc.status}
                                </StatusPill>
                                {doc.fileUrl ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1 text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                    onClick={() =>
                                      onPreviewDoc?.(doc.title, doc.fileUrl)
                                    }
                                  >
                                    <ExternalLink className="size-2.5 mr-0.5" />
                                    View
                                  </Button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
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
        title="Customs Clearance & Border Control Post (BCP)"
        empty={!customs}
        action={
          customs?.clearedAt ? (
            <StatusPill tone="success">
              <ShieldCheck className="size-3" />
              <span>Cleared</span>
            </StatusPill>
          ) : (
            <StatusPill tone="warning">Pending clearance</StatusPill>
          )
        }
      >
        <ValueGrid
          columns={4}
          items={[
            {
              label: "Movement Ref No. (MRN)",
              value: <CopyValue value={customs?.mrnNumber} />,
            },
            {
              label: "Designated Border Post",
              value: customs?.borderControlPostName ?? "—",
            },
            {
              label: "Clearance timestamp",
              value: formatAuditDateTime(customs?.clearedAt),
            },
            {
              label: "Inspection classification",
              value: customs?.inspectionType ? (
                <StatusPill tone="brand">{customs.inspectionType}</StatusPill>
              ) : (
                "—"
              ),
            },
          ]}
        />
      </BlockCard>
    </div>
  );
}

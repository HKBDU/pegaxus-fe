import { Badge } from "@/shared/components/ui/badge";
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
import { BlockCard, CopyValue } from "./block-utils";
import { formatAuditDateTime } from "../../utils";
export function AuditComplianceBlock({
  data,
  onPreviewDoc,
}: {
  data?: AuditComplianceData;
  onPreviewDoc?: (title: string, url?: string) => void;
}) {
  const dossiers = data?.dossiers ?? [];
  return (
    <div className="space-y-4">
      <BlockCard title="Compliance dossiers" empty={!dossiers.length}>
        {dossiers.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dossier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dossiers.map((dossier) => (
                <TableRow key={dossier.dossierId}>
                  <TableCell className="font-mono">
                    {dossier.dossierCode}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{dossier.type}</Badge>
                  </TableCell>
                  <TableCell>{dossier.status}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {dossier.documents.map((document) => (
                        <div
                          key={document.documentId}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span>{document.title}</span>
                          <Badge variant="outline">{document.status}</Badge>
                          {document.fileUrl ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-[2px] bg-white px-2 text-xs"
                              onClick={() =>
                                onPreviewDoc?.(document.title, document.fileUrl)
                              }
                            >
                              Preview
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </BlockCard>
      <BlockCard title="Customs & BCP" empty={!data?.customsClearance}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase text-slate-500">MRN</p>
            <CopyValue value={data?.customsClearance?.mrnNumber} />
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">
              Border control post
            </p>
            <p className="text-sm">
              {data?.customsClearance?.borderControlPostName ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Cleared at</p>
            <p className="text-sm">
              {formatAuditDateTime(data?.customsClearance?.clearedAt)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Inspection</p>
            <p className="text-sm">
              {data?.customsClearance?.inspectionType ?? "—"}
            </p>
          </div>
        </div>
      </BlockCard>
    </div>
  );
}

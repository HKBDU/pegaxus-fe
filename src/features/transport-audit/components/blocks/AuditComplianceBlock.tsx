import { FileCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatUtcDate } from "@/shared/utils/datetime";
import type {
  AuditComplianceData,
  AuditComplianceDossier,
  AuditDocumentVersion,
} from "../../types";
import {
  BlockCard,
  CopyValue,
  StatusPill,
  ValueGrid,
  humanize,
  toEnumKey,
} from "./block-utils";
import { formatAuditDateTime } from "../../utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

// Covers the dossier, requirement, document, review and proof status enums of the BE.
const STATUS_TONES: Record<string, Tone> = {
  APPROVED: "success",
  SATISFIED: "success",
  PASSED: "success",
  CLEARED: "success",
  PROVIDED: "info",
  WAIVED: "info",
  READY_FOR_SUBMISSION: "info",
  SUBMITTED: "info",
  PENDING: "warning",
  REQUESTED: "warning",
  IN_PREPARATION: "warning",
  PENDING_VERIFICATION: "warning",
  PASSED_WITH_CONDITIONS: "warning",
  REVISION_REQUIRED: "warning",
  HELD: "warning",
  REJECTED: "danger",
  EXPIRED: "danger",
  FAILED: "danger",
  HOLDBACK: "danger",
};

const statusTone = (status: string): Tone =>
  STATUS_TONES[toEnumKey(status)] ?? "neutral";

function Status({ value }: { value: string }) {
  return <StatusPill tone={statusTone(value)}>{humanize(value)}</StatusPill>;
}

const latestVersion = (versions: AuditDocumentVersion[]) =>
  versions.reduce<AuditDocumentVersion | undefined>(
    (latest, version) =>
      !latest || version.versionNo > latest.versionNo ? version : latest,
    undefined,
  );

const latestReview = (version?: AuditDocumentVersion) =>
  [...(version?.reviews ?? [])].sort((a, b) =>
    b.reviewedAt.localeCompare(a.reviewedAt),
  )[0];

function RequirementsTable({ dossier }: { dossier: AuditComplianceDossier }) {
  if (!dossier.requirements.length) {
    return (
      <p className="py-3 text-center text-xs text-slate-500">
        No requirements recorded for this dossier.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#e6e2d9] bg-[#faf8f5]/60 hover:bg-[#faf8f5]/60">
            <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Requirement
            </TableHead>
            <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Status
            </TableHead>
            <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Document
            </TableHead>
            <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Validity
            </TableHead>
            <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Latest version & review
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dossier.requirements.map((requirement) => {
            const document = requirement.document;
            const version = document ? latestVersion(document.versions) : undefined;
            const review = latestReview(version);

            return (
              <TableRow
                key={requirement.dossierRequirementId}
                className="border-b border-slate-100 align-top hover:bg-amber-500/[0.02]"
              >
                <TableCell className="py-2.5 text-xs">
                  <div className="font-semibold text-slate-900">
                    {requirement.requirementName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {requirement.isMandatory ? "Mandatory" : "Optional"}
                    {requirement.horseId ? " · Per horse" : ""}
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <Status value={requirement.status} />
                </TableCell>
                <TableCell className="py-2.5 text-xs">
                  {document ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="size-3 text-slate-400" />
                        <span className="font-mono font-semibold text-slate-800">
                          {document.documentCode}
                        </span>
                        <Status value={document.status} />
                      </div>
                      <div className="text-[11px] text-slate-600">
                        No. {document.documentNumber ?? "—"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Issued by {document.issuingAuthority ?? "—"}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">No document submitted</span>
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-xs text-slate-600">
                  {document ? (
                    <>
                      <div>Issued: {formatUtcDate(document.issuedDate)}</div>
                      <div className="mt-0.5">Expires: {formatUtcDate(document.expiryDate)}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-xs">
                  {version ? (
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-800">
                        v{version.versionNo} · {version.fileName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Uploaded {formatAuditDateTime(version.uploadedAt)}
                      </div>
                      {review ? (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                          <Status value={review.result} />
                          <span>{formatAuditDateTime(review.reviewedAt)}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">Not reviewed</div>
                      )}
                      {review?.reviewComment ? (
                        <div className="text-[11px] text-slate-600">
                          “{review.reviewComment}”
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function BorderProofs({ dossier }: { dossier: AuditComplianceDossier }) {
  const quarantine = dossier.quarantineProof;
  const customs = dossier.customsClearanceProof;
  if (!quarantine && !customs) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {quarantine ? (
        <div className="rounded-[2px] border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              BCP Quarantine Proof
            </h4>
            <Status value={quarantine.status} />
          </div>
          <ValueGrid
            values={[
              ["Border control post", quarantine.bcpName],
              ["Inspection time", formatAuditDateTime(quarantine.inspectionAt)],
              ["Official veterinarian", quarantine.officialVeterinarianName ?? "—"],
              ["Verified at", formatAuditDateTime(quarantine.verifiedAt)],
              ["Conditions", quarantine.conditions ?? "—"],
              ["Verification note", quarantine.verificationNote ?? "—"],
            ]}
          />
        </div>
      ) : null}
      {customs ? (
        <div className="rounded-[2px] border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Customs Clearance Proof
            </h4>
            <Status value={customs.status} />
          </div>
          <ValueGrid
            values={[
              ["Customs port", customs.customsPortName],
              [
                "Movement Ref No. (MRN)",
                customs.mrnNumber ? <CopyValue value={customs.mrnNumber} key="mrn" /> : "—",
              ],
              ["Cleared at", formatAuditDateTime(customs.clearanceAt)],
              ["Verified at", formatAuditDateTime(customs.verifiedAt)],
              ["Verification note", customs.verificationNote ?? "—"],
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

export function AuditComplianceBlock({ data }: { data?: AuditComplianceData }) {
  const dossiers = data?.dossiers ?? [];

  if (!dossiers.length) {
    return <BlockCard title="Cross-Border Compliance Dossiers" empty />;
  }

  return (
    <div className="space-y-3.5">
      {dossiers.map((dossier) => (
        <BlockCard
          key={dossier.complianceDossierId}
          title={`Compliance Dossier · ${dossier.dossierCode}`}
          headerExtra={
            <div className="flex items-center gap-1.5">
              <StatusPill tone="info">{humanize(dossier.dossierType)}</StatusPill>
              <Status value={dossier.status} />
            </div>
          }
        >
          <div className="space-y-3.5">
            <ValueGrid
              columns={4}
              values={[
                ["Dossier code", <CopyValue value={dossier.dossierCode} key="code" />],
                ["Opened at", formatAuditDateTime(dossier.openedAt)],
                ["Approved at", formatAuditDateTime(dossier.approvedAt)],
                [
                  "Requirements",
                  `${dossier.requirements.filter((r) => r.status === "SATISFIED").length} / ${dossier.requirements.length} satisfied`,
                ],
              ]}
            />
            <RequirementsTable dossier={dossier} />
            <BorderProofs dossier={dossier} />
          </div>
        </BlockCard>
      ))}
    </div>
  );
}

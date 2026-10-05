import { ShieldCheck } from "lucide-react";
import { formatBookingDate } from "@/features/booking/utils";
import type { ComplianceDocumentDetail, DossierOverview, DossierRequirement } from "../types";

export function DocumentReviewContext({ dossier, requirement, document }: {
  dossier: DossierOverview;
  requirement: DossierRequirement;
  document: ComplianceDocumentDetail;
}) {
  const context = [
    ["Booking Code", dossier.bookingCode],
    ["Dossier Code", dossier.dossierCode],
    ["Requirement", requirement.requirementName],
    ["Applied To", requirement.horseId === null ? "Trip-level" : requirement.horseName ?? "Horse-specific"],
    ["Mandatory", requirement.isMandatory ? "Yes" : "No"],
    ["Valid Until", requirement.validUntil ? formatBookingDate(requirement.validUntil) : "—"],
  ];
  const metadata = [
    ["Document Number", document.documentNumber ?? "—"],
    ["Issuing Authority", document.issuingAuthority ?? "—"],
    ["Issued Date", document.issuedDate ? formatBookingDate(document.issuedDate) : "—"],
    ["Expiry Date", document.expiryDate ? formatBookingDate(document.expiryDate) : "—"],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[2px] border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div><strong>Transport Specialist</strong><p className="mt-1 text-xs leading-relaxed">You are reviewing a customer submitted document. Review actions are recorded in the audit history.</p></div>
      </div>
      <section className="space-y-3 rounded-[2px] border border-slate-200 bg-white p-4">
        <h3 className="font-heading text-base uppercase">Requirement / Booking Context</h3>
        <dl className="space-y-2 text-xs">
          {context.map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="shrink-0 text-slate-500">{label}</dt><dd className="break-words text-right font-medium text-slate-900">{value}</dd></div>)}
        </dl>
        <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
          <div className="flex justify-between gap-3"><strong>Dossier Progress</strong><strong className="text-primary">{dossier.progressPercent}%</strong></div>
          <div role="progressbar" aria-label="Mandatory dossier progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dossier.progressPercent} className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, dossier.progressPercent))}%` }} />
          </div>
          <p className="text-slate-500">{dossier.mandatorySatisfiedOrWaived} of {dossier.mandatoryTotal} mandatory requirements satisfied or waived</p>
        </div>
      </section>
      <section className="rounded-[2px] border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-heading text-base uppercase">Document Metadata</h3>
        <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {metadata.map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
        </dl>
      </section>
    </div>
  );
}

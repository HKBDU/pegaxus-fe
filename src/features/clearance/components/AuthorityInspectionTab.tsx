import { ClipboardCheck, ExternalLink, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"

import type { DossierOverview } from "@/features/dossier/types"
import { Card, CardContent } from "@/shared/components/ui/card"

type StatusValue = string | { status: string } | null

function statusLabel(status: StatusValue) {
  const value = typeof status === "string" ? status : status?.status
  return value ? value.replaceAll("_", " ") : "NOT STARTED"
}

function StatusCard({
  label,
  status,
  subtitle,
  icon: Icon,
}: {
  label: string
  status: StatusValue
  subtitle?: string
  icon: typeof ShieldCheck
}) {
  return (
    <Card className="rounded-[2px] border-slate-200 shadow-none">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <Icon className="size-5 text-primary" aria-hidden="true" />
          <div>
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700">{label}</span>
            {subtitle && (
              <span className="text-[10px] font-medium text-slate-500">{subtitle}</span>
            )}
          </div>
        </div>
        <span className="text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">{statusLabel(status)}</span>
      </CardContent>
    </Card>
  )
}

/** Shared Flow 2 authority/inspection entry point owned by the clearance feature. */
export function AuthorityInspectionTab({ dossier }: { dossier: DossierOverview }) {
  const dossierId = dossier.complianceDossierId
  const authorityStatus = ["SUBMITTED", "PENDING", "APPROVED"].includes(dossier.status) ? dossier.status : null

  const origin = dossier.bookingSummary?.originCountry?.trim().toLowerCase()
  const destination = dossier.bookingSummary?.destinationCountry?.trim().toLowerCase()
  const ukIe = new Set(["united kingdom", "uk", "gb", "great britain", "ireland", "ie"])
  const isMandatoryRoute = Boolean((origin && ukIe.has(origin)) || (destination && ukIe.has(destination)))
  const routePolicyTag = isMandatoryRoute ? "Mandatory (EU ↔ UK/IE)" : "Optional (Intra-EU)"

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <StatusCard label="Authority submission" status={authorityStatus} icon={ClipboardCheck} />
        <StatusCard label="BCP quarantine" status={dossier.quarantineStatus} subtitle={routePolicyTag} icon={ShieldCheck} />
        <StatusCard label="Customs clearance" status={dossier.customsClearanceStatus} subtitle={routePolicyTag} icon={ShieldCheck} />
      </div>

      <Card className="rounded-[2px] border-slate-200 shadow-none">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-slate-800">Authority workflow</h3>
            <p className="mt-1 text-sm text-slate-500">Record the authority submission and continue proof verification from the dedicated review screens.</p>
          </div>
          <Link
            to={`/compliance-dossiers/${dossierId}/authority-submission`}
            className="inline-flex items-center gap-2 rounded-[2px] bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800"
          >
            Open submission
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

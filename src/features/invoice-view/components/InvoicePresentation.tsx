import type { ReactNode } from "react"
import { Badge } from "@/shared/components/ui/badge"
import { isFlow6MockMode } from "../source"
import { humanize } from "../constants"

// Small read-only adapters; migrate to Khuyên's shared components when their exports exist.
export function InvoiceBadge({ value }: { value: string }) {
  const colors: Record<string, string> = { DRAFT: "border-slate-200 bg-slate-100 text-slate-600", ISSUED: "border-blue-200 bg-blue-50 text-blue-700",
    PAID: "border-emerald-200 bg-emerald-50 text-emerald-700", OVERDUE: "border-red-200 bg-red-50 text-red-700",
    CANCELLED: "border-red-200 bg-red-50 text-red-700", CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700", FAILED: "border-red-200 bg-red-50 text-red-700" }
  return <Badge variant="outline" className={`whitespace-nowrap rounded-[2px] text-[10px] ${colors[value] ?? "border-slate-200 bg-white text-slate-600"}`}>{humanize(value)}</Badge>
}
export function InvoiceMockIndicator() {
  return isFlow6MockMode() ? <p role="status" className="rounded-[2px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">MOCK DATA · Flow 6 development preview. Authentication remains real; no financial operations run.</p> : null
}
export function InvoiceSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 space-y-4 rounded-[2px] border border-slate-200 bg-white p-5"><h2 className="border-b border-slate-100 pb-3 font-heading text-lg uppercase">{title}</h2>{children}</section>
}
export function InvoiceField({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="min-w-0 space-y-1"><dt className="text-xs text-slate-500">{label}</dt><dd className="break-words whitespace-pre-wrap text-sm text-slate-800">{children === null || children === undefined || children === "" ? "—" : children}</dd></div>
}

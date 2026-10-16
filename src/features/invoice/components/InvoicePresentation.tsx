import type { ReactNode } from "react"
import { isInvoiceMockMode } from "@/features/invoice/utils"

export function InvoiceMockIndicator() {
  return isInvoiceMockMode() ? <p role="status" className="rounded-[2px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">MOCK DATA · Flow 6 development preview. Invoice reads use fixtures; authentication remains real. Financial actions may call real APIs. Use only isolated development data.</p> : null
}
export function InvoiceSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 space-y-4 rounded-[2px] border border-slate-200 bg-white p-5"><h2 className="border-b border-slate-100 pb-3 font-heading text-lg uppercase">{title}</h2>{children}</section>
}
export function InvoiceField({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="min-w-0 space-y-1"><dt className="text-xs text-slate-500">{label}</dt><dd className="break-words whitespace-pre-wrap text-sm text-slate-800">{children === null || children === undefined || children === "" ? "—" : children}</dd></div>
}

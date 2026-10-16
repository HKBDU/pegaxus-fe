import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Building blocks of the fleet detail / edit pages, taken from the booking details page so every page looks the same. */
export const PAGE_SHELL_CLASS = "min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10"
export const PAGE_WIDTH_CLASS = "booking-page-enter mx-auto w-full max-w-[1152px]"
export const panelClass = "border border-[#e5e2d9] bg-white"
export const actionButtonClass =
  "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50"
export const outlineButtonClass = "border-gray-900 bg-white text-gray-900 hover:bg-gray-100"
export const primaryButtonClass = "border-primary bg-primary text-gray-900 hover:border-primary-hover hover:bg-primary-hover"
export const dangerButtonClass = "border-red-300 bg-white text-red-700 hover:bg-red-50"
export const columnHeadClass = "h-11 whitespace-normal px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"

/** Label of a form field: same typography as the detail labels, a little darker so it reads as an input label. */
export const formLabelClass = "font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-600"
/** Text input / select / textarea of the fleet forms (same control as the template and requirement forms). */
export const formControlClass =
  "h-9 w-full rounded-[2px] border border-slate-300 bg-white px-3 text-xs text-[#181818] shadow-none placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 disabled:opacity-60"

export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <dt className={cn("font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500", className)}>{children}</dt>
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="m-0! font-heading text-base! leading-5! font-bold! tracking-normal! text-gray-900! uppercase">{children}</h2>
}

export function SummaryCell({ label, first = false, children }: { label: string; first?: boolean; children: ReactNode }) {
  return (
    <div className={cn("relative min-w-0 py-2.5", !first && "lg:pl-4 lg:before:absolute lg:before:inset-y-2.5 lg:before:left-0 lg:before:w-px lg:before:bg-gray-200")}>
      <dt className="font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500">{label}</dt>
      <dd className="mt-0.5 flex min-h-5 items-center text-xs leading-5 text-gray-800">{children}</dd>
    </div>
  )
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-baseline">
      <FieldLabel className="pr-2">{label}</FieldLabel>
      <dd className="min-w-0 break-words text-xs leading-5 text-gray-800">{value || "—"}</dd>
    </div>
  )
}

/** A titled card of read-only rows. */
export function InfoCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn(panelClass, "p-4", className)}>
      <CardTitle>{title}</CardTitle>
      <dl className="mt-3 space-y-1.5">{children}</dl>
    </section>
  )
}

/** A titled card of form fields. */
export function FormCard({ title, children, className, columns = 2 }: { title: string; children: ReactNode; className?: string; columns?: 1 | 2 }) {
  return (
    <section className={cn(panelClass, "p-4", className)}>
      <CardTitle>{title}</CardTitle>
      <div className={cn("mt-3 grid gap-x-4 gap-y-3", columns === 2 && "sm:grid-cols-2")}>{children}</div>
    </section>
  )
}

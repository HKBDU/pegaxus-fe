import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { EMPTY } from "../utils"

export const panelClass = "border border-[#e5e2d9] bg-white"
export const actionButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50"
export const primaryButtonClass = "border-primary bg-primary text-gray-900 hover:border-primary-hover hover:bg-primary-hover"
export const outlineButtonClass = "border-gray-900 bg-white text-gray-900 hover:bg-gray-100"
export const dangerButtonClass = "border-red-300 bg-white text-red-700 hover:bg-red-50"
/** Small, grey, upper-case: reads as a caption. The value under it is bigger, bolder and darker, so the two never look alike. */
export const fieldLabelClass = "font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-slate-500"
export const fieldValueClass = "m-0 mt-0.5 min-w-0 break-words text-sm font-semibold leading-5 text-slate-900"

interface PanelProps {
  title: string
  action?: ReactNode
  icon?: LucideIcon
  id?: string
  className?: string
  children: ReactNode
}

export function Panel({ title, action, icon: Icon, id, className, children }: PanelProps) {
  return (
    <section id={id} className={cn(panelClass, "scroll-mt-20 px-3.5 py-3.5 sm:px-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#eceae3] pb-2.5">
        <h2 className="m-0! flex min-w-0 items-center gap-2 font-heading text-base! leading-5! font-bold! tracking-normal! text-gray-900! uppercase">
          {Icon ? (
            <span className="grid size-7 shrink-0 place-items-center rounded-[2px] bg-amber-50 text-amber-600">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          ) : null}
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A responsive grid of {@link InfoRow}s: two columns on a phone, up to four on a wide screen. */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("m-0 grid grid-cols-2 gap-x-5 gap-y-3.5 md:grid-cols-3 lg:grid-cols-4", className)}>{children}</dl>
}

/** Label on top, value below. */
export function InfoRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className={fieldLabelClass}>{label}</dt>
      <dd className={fieldValueClass}>{children || EMPTY}</dd>
    </div>
  )
}

/** Block row for free text (descriptions, notes): the text sits in a tinted box with an amber edge. */
export function TextBlock({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className={fieldLabelClass}>{label}</dt>
      <dd className="m-0 mt-1 whitespace-pre-line break-words rounded-[2px] border-l-[3px] border-amber-400 bg-[#faf9f6] px-3 py-2 text-sm leading-6 text-slate-800">{children || EMPTY}</dd>
    </div>
  )
}

/**
 * Yes / No answer as a small pill. `warnWhen` is the answer that is bad news (e.g. "No" for "Vehicle operable", "Yes" for
 * "Towing required"): it turns amber, the other answer green.
 */
export function Flag({ value, warnWhen }: { value: boolean | null | undefined; warnWhen: "yes" | "no" }) {
  if (value === null || value === undefined) return <>{EMPTY}</>
  const warn = (warnWhen === "yes") === value
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", warn ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      {value ? "Yes" : "No"}
    </span>
  )
}

/** Big-number tile (vital signs). */
export function StatTile({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <div className="min-w-0 rounded-[2px] border border-[#e5e2d9] bg-white px-3 py-2">
      <p className={cn(fieldLabelClass, "m-0")}>{label}</p>
      <p className="m-0 mt-0.5 text-xl font-bold leading-6 text-slate-900">
        {value === null ? EMPTY : value}
        {value !== null && unit ? <span className="ml-1 text-xs font-medium text-slate-500">{unit}</span> : null}
      </p>
    </div>
  )
}

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { EMPTY } from "../utils"

export const panelClass = "border border-[#e5e2d9] bg-white"
export const actionButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50"
export const primaryButtonClass = "border-primary bg-primary text-gray-900 hover:border-primary-hover hover:bg-primary-hover"
export const outlineButtonClass = "border-gray-900 bg-white text-gray-900 hover:bg-gray-100"
export const dangerButtonClass = "border-red-300 bg-white text-red-700 hover:bg-red-50"
export const fieldLabelClass = "font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500"

export function Panel({ title, action, id, className, children }: { title: string; action?: ReactNode; id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn(panelClass, "scroll-mt-20 px-4 py-3.5", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="m-0! font-heading text-base! leading-5! font-bold! tracking-normal! text-gray-900! uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function InfoRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-baseline gap-x-2", className)}>
      <dt className={fieldLabelClass}>{label}</dt>
      <dd className="m-0 min-w-0 break-words text-xs leading-5 text-gray-800">{children || EMPTY}</dd>
    </div>
  )
}

/** Block row: label on top, free text below (descriptions, notes). */
export function TextBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={fieldLabelClass}>{label}</dt>
      <dd className="m-0 mt-0.5 whitespace-pre-line break-words text-xs leading-5 text-gray-800">{children || EMPTY}</dd>
    </div>
  )
}

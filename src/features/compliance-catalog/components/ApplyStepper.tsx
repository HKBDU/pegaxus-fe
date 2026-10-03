import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const STEPS = ["Select Template", "Customize Requirements", "Review & Create"] as const

/** The three wizard steps of UC-18; finished steps show a check, the current one is highlighted. */
export function ApplyStepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Progress" className="m-0 mx-auto flex w-full max-w-2xl list-none items-center p-0">
      {STEPS.map((label, index) => {
        const number = index + 1
        const done = number < step
        const current = number === step
        return (
          <li key={label} aria-current={current ? "step" : undefined} className={cn("flex items-center", index < STEPS.length - 1 && "flex-1")}>
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  done || current ? "bg-[#ef8f00] text-white" : "bg-slate-200 text-slate-500",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : number}
              </span>
              <span className={cn("whitespace-nowrap text-xs", current ? "font-semibold text-[#ef8f00]" : done ? "font-medium text-slate-700" : "text-slate-400")}>
                {label}
              </span>
            </span>
            {index < STEPS.length - 1 ? <span aria-hidden="true" className={cn("mx-3 h-px flex-1", done ? "bg-[#ef8f00]" : "bg-slate-200")} /> : null}
          </li>
        )
      })}
    </ol>
  )
}

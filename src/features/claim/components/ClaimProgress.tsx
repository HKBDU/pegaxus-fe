import { formatInvoiceDateTime } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import type { Claim } from "@/features/claim/types"
import { Checkbox } from "@/shared/components/ui/checkbox"

interface Step {
  key: string
  label: string
  at: string | null
  state: "done" | "current" | "todo" | "failed"
}

/** Progress as the customer reads it: derived only from the dates the BE returns, never from guessed rules. */
function buildSteps(claim: Claim): Step[] {
  const decidedAt = claim.resolution?.resolvedAt ?? null
  const decision: Step =
    claim.status === "REJECTED"
      ? { key: "decision", label: "Rejected", at: claim.resolvedAt ?? decidedAt, state: "failed" }
      : { key: "decision", label: "Approved", at: decidedAt, state: decidedAt ? "done" : "todo" }
  const steps: Step[] = [
    { key: "submitted", label: "Submitted", at: claim.submittedAt, state: "done" },
    { key: "review", label: "Under review", at: claim.reviewedAt, state: claim.reviewedAt ? "done" : "todo" },
    decision,
  ]
  if (claim.status !== "REJECTED") steps.push({ key: "resolved", label: "Resolved", at: claim.status === "RESOLVED" ? claim.resolvedAt : null, state: claim.status === "RESOLVED" ? "done" : "todo" })
  if (claim.status === "CANCELLED") steps.push({ key: "cancelled", label: "Cancelled", at: claim.cancelledAt, state: "failed" })

  // The first open step of a live claim is the one being worked on.
  if (claim.status !== "CANCELLED") {
    const next = steps.find((step) => step.state === "todo")
    if (next) next.state = "current"
  }
  return steps
}

const boxClass: Record<Step["state"], string> = {
  done: "border-emerald-600 bg-emerald-600 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600",
  failed: "border-red-600 bg-red-600 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600",
  current: "border-[#ef8f00] bg-amber-50",
  todo: "border-slate-300 bg-white",
}

/** Read-only steps: shadcn checkboxes (checked = reached) so the page keeps the look of the rest of the web. */
export function ClaimProgress({ claim }: { claim: Claim }) {
  const steps = buildSteps(claim)
  return (
    <ol aria-label="Claim progress" className="grid gap-3 sm:grid-flow-col sm:auto-cols-fr">
      {steps.map((step) => (
        <li key={step.key} className="flex items-start gap-2.5" aria-current={step.state === "current" ? "step" : undefined}>
          <Checkbox
            checked={step.state === "done" || step.state === "failed"}
            tabIndex={-1}
            aria-label={step.label}
            className={cn("pointer-events-none mt-0.5 size-4 rounded-[3px] shadow-none data-[state=checked]:text-white", boxClass[step.state])}
          />
          <div className="min-w-0">
            <p className={cn("font-heading text-[11px] font-semibold uppercase tracking-[0.05em]", step.state === "todo" ? "text-gray-400" : step.state === "failed" ? "text-red-700" : "text-gray-900")}>{step.label}</p>
            <p className="text-[11px] text-gray-500">{step.at ? formatInvoiceDateTime(step.at) : step.state === "current" ? "In progress" : "—"}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

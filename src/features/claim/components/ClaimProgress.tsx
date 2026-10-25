import { Check, X } from "lucide-react"
import { formatInvoiceDateTime } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import type { Claim } from "@/features/claim/types"

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

export function ClaimProgress({ claim }: { claim: Claim }) {
  const steps = buildSteps(claim)
  return (
    <ol aria-label="Claim progress" className="grid gap-3 sm:grid-flow-col sm:auto-cols-fr">
      {steps.map((step) => (
        <li key={step.key} className="flex items-start gap-2.5" aria-current={step.state === "current" ? "step" : undefined}>
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center border text-[10px] font-bold",
              step.state === "done" && "border-emerald-600 bg-emerald-600 text-white",
              step.state === "current" && "border-[#ef8f00] bg-amber-50 text-[#a85f00]",
              step.state === "failed" && "border-red-600 bg-red-600 text-white",
              step.state === "todo" && "border-[#d8d5cb] bg-white text-gray-400",
            )}
          >
            {step.state === "done" ? <Check className="size-3" /> : step.state === "failed" ? <X className="size-3" /> : null}
          </span>
          <div className="min-w-0">
            <p className={cn("font-heading text-[11px] font-bold uppercase tracking-[0.05em]", step.state === "todo" ? "text-gray-400" : "text-gray-900")}>{step.label}</p>
            <p className="text-[11px] text-gray-500">{step.at ? formatInvoiceDateTime(step.at) : step.state === "current" ? "In progress" : "—"}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

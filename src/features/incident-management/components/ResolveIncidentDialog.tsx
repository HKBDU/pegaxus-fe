import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, ChevronDown, Copy, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { CategoryBadge, StatusBadge, VndText } from "@/shared/components/incident"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Textarea } from "@/shared/components/ui/textarea"

import { useResolveIncident, useSelfResolveIncident } from "../hooks/useIncidents"
import { RESOLUTION_MAX, RESOLUTION_MIN, resolveFormSchema, selfResolveFormSchema } from "../schemas"
import type { Incident, ResolveFormValues } from "../types"
import { formatDateTime } from "../utils"
import { IncidentErrorAlert } from "./IncidentErrorAlert"
import { actionButtonClass, fieldLabelClass, outlineButtonClass, primaryButtonClass } from "./ui"

interface ResolveIncidentDialogProps {
  incident: Incident
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `manager`: IN9 with the settlement check (Logistics Manager). `self`: IN11 (Driver / Escort). */
  mode: "manager" | "self"
  /** Re-read the incident after a 409 conflict. */
  onReload: () => void
}

function Tile({ label, children, tone }: { label: string; children: React.ReactNode; tone: string }) {
  return (
    <div className={`rounded-[2px] border px-3 py-2 ${tone}`}>
      <p className="m-0 font-heading text-[10px] font-medium uppercase tracking-[0.06em] text-gray-500">{label}</p>
      <p className="m-0 mt-0.5 text-base font-semibold leading-5 text-gray-900">{children}</p>
    </div>
  )
}

/** SCR-F5-005. Close an incident (IN9) or mark it as solved by the crew (IN11). RESOLVED is final: nothing reopens it. */
export function ResolveIncidentDialog({ incident, open, onOpenChange, mode, onReload }: ResolveIncidentDialogProps) {
  const isManager = mode === "manager"
  const resolve = useResolveIncident(incident.incidentReportId)
  const selfResolve = useSelfResolveIncident(incident.incidentReportId)
  const mutation = isManager ? resolve : selfResolve
  const [error, setError] = useState<unknown>(null)
  const [showApproved, setShowApproved] = useState(false)

  const form = useForm<ResolveFormValues>({
    resolver: zodResolver(isManager ? resolveFormSchema : selfResolveFormSchema),
    defaultValues: { resolutionSummary: "", emergencySettlementConfirmed: false },
    mode: "onChange",
  })

  const summary = form.watch("resolutionSummary")
  const approved = incident.costRequests.filter((request) => request.status === "APPROVED")
  const rejected = incident.costRequests.filter((request) => request.status === "REJECTED")
  const pending = incident.costSummary.pendingCount
  const blockedByCost = isManager && !incident.canResolve

  const close = (next: boolean) => {
    if (!next) {
      form.reset()
      setError(null)
      mutation.reset()
    }
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      if (isManager) {
        await resolve.mutateAsync({ lastUpdatedAt: incident.updatedAt, resolutionSummary: values.resolutionSummary.trim(), emergencySettlementConfirmed: values.emergencySettlementConfirmed })
      } else {
        await selfResolve.mutateAsync({ lastUpdatedAt: incident.updatedAt, resolutionSummary: values.resolutionSummary.trim() })
      }
      toast.success(`Incident ${incident.incidentCode} resolved`)
      close(false)
    } catch (caught) {
      setError(caught)
    }
  })

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] gap-3 overflow-y-auto rounded-[2px] border-slate-200 bg-white p-4 text-slate-900 sm:max-w-xl">
        <DialogHeader className="gap-0.5 pr-6">
          <DialogTitle className="m-0! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">
            {isManager ? "Confirm cost settlement & resolve incident" : "Mark incident as resolved"}
          </DialogTitle>
          <DialogDescription className="text-xs leading-4 text-slate-600">
            {isManager
              ? "Closing the incident is final. Check the emergency costs below before you continue."
              : "Tell the Logistics Manager how the problem was solved. A resolved incident cannot be reopened."}
          </DialogDescription>
        </DialogHeader>

        <dl className="m-0 flex flex-wrap gap-x-6 gap-y-2 border border-slate-200 bg-[#faf9f6] px-3 py-2.5">
          <div>
            <dt className={fieldLabelClass}>Incident</dt>
            <dd className="m-0 flex items-center gap-1 text-xs font-semibold">
              {incident.incidentCode}
              <button
                type="button"
                aria-label="Copy incident code"
                onClick={() => void navigator.clipboard?.writeText(incident.incidentCode).then(() => toast.success("Incident code copied"))}
                className="text-slate-400 hover:text-slate-700"
              >
                <Copy className="size-3" />
              </button>
            </dd>
          </div>
          <div><dt className={fieldLabelClass}>Category</dt><dd className="m-0"><CategoryBadge category={incident.category} /></dd></div>
          <div><dt className={fieldLabelClass}>Occurred at</dt><dd className="m-0 text-xs">{formatDateTime(incident.occurredAt)}</dd></div>
          <div><dt className={fieldLabelClass}>Status</dt><dd className="m-0"><StatusBadge status={incident.status} /></dd></div>
        </dl>

        {isManager ? (
          <section aria-label="Settlement summary" className="grid gap-2">
            <p className={`${fieldLabelClass} m-0`}>Settlement summary</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Approved" tone="border-emerald-200 bg-emerald-50/50">{approved.length}</Tile>
              <Tile label="Rejected" tone="border-red-200 bg-red-50/50">{rejected.length}</Tile>
              <Tile label="Pending" tone="border-amber-200 bg-amber-50/60">{pending}</Tile>
              <Tile label="Total approved" tone="border-slate-200 bg-white"><VndText amount={incident.costSummary.approvedTotal} className="text-sm" /></Tile>
            </div>
            {pending > 0 ? (
              <p role="status" className="m-0 flex items-start gap-1.5 rounded-[2px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {pending} emergency cost request{pending > 1 ? "s are" : " is"} still pending. Decide {pending > 1 ? "them" : "it"} before resolving the incident.
              </p>
            ) : (
              <p role="status" className="m-0 flex items-center gap-1.5 rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                No pending emergency cost requests. The incident can be closed.
              </p>
            )}
          </section>
        ) : null}

        <Form {...form}>
          <form id="resolve-incident-form" onSubmit={onSubmit} className="grid gap-3">
            <FormField
              control={form.control}
              name="resolutionSummary"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="font-heading text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">Resolution summary</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      maxLength={RESOLUTION_MAX}
                      disabled={mutation.isPending}
                      placeholder="Describe how the incident was resolved and what was done"
                      className="min-h-24 resize-y rounded-[2px] border-slate-300 bg-white px-3 py-2 text-xs leading-4 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                    />
                  </FormControl>
                  <div className="flex items-start justify-between gap-2">
                    <FormMessage />
                    <span className={`ml-auto text-[11px] ${summary.trim().length < RESOLUTION_MIN ? "text-slate-500" : "text-emerald-700"}`}>
                      {summary.length} / {RESOLUTION_MAX} (min {RESOLUTION_MIN})
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {isManager ? (
              <FormField
                control={form.control}
                name="emergencySettlementConfirmed"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <label className="flex cursor-pointer items-start gap-2 text-xs leading-4 text-slate-800">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} disabled={mutation.isPending} className="mt-0.5 size-3.5 rounded-[2px] border-slate-300 shadow-none" />
                      </FormControl>
                      I confirm that all emergency costs of this incident are settled.
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </form>
        </Form>

        {isManager && approved.length ? (
          <div className="border border-slate-200">
            <button type="button" aria-expanded={showApproved} onClick={() => setShowApproved((value) => !value)} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">
              Approved emergency cost requests ({approved.length})
              <ChevronDown className={`size-3.5 transition-transform ${showApproved ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {showApproved ? (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 border-t border-slate-200 p-2">
                {approved.map((request) => (
                  <li key={request.emergencyCostRequestId} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                    {request.requestCode} · <VndText amount={request.approvedAmount ?? 0} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {error ? <IncidentErrorAlert error={error} onReload={() => { close(false); onReload() }} /> : null}

        <DialogFooter className="gap-1.5 sm:justify-end">
          <button type="button" className={`${actionButtonClass} ${outlineButtonClass}`} onClick={() => close(false)} disabled={mutation.isPending}>
            Close
          </button>
          <button type="submit" form="resolve-incident-form" className={`${actionButtonClass} ${primaryButtonClass}`} disabled={mutation.isPending || blockedByCost || !form.formState.isValid}>
            {mutation.isPending ? "Resolving..." : isManager ? "Confirm resolve incident" : "Mark as resolved"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

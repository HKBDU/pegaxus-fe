import { Building2, FileText, Pencil, Truck, UserRound } from "lucide-react"
import type { ReactNode } from "react"

import { ProviderModeBadge, ProviderStatusBadge } from "@/features/fleet/components/ProviderBadges"
import { useProvider } from "@/features/fleet/hooks"
import type { Provider } from "@/features/fleet/types"
import { formatFleetDateTime, getFleetErrorMessage } from "@/features/fleet/utils"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

const labelClass = "text-xs font-semibold leading-4 text-slate-800"
const hintClass = "text-[11px] leading-4 text-slate-500"

function Card({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <header className="mb-3 flex items-start gap-2 border-b border-slate-100 pb-3">
        <span className="mt-0.5 text-sky-600" aria-hidden="true">{icon}</span>
        <div>
          <h3 className="m-0! text-sm! font-semibold! leading-5! text-slate-900!">{title}</h3>
          <p className={`${hintClass} m-0`}>{subtitle}</p>
        </div>
      </header>
      <dl className="m-0 grid gap-x-4 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

/** Read-only counterpart of a form field: same label, value shown as plain text ("—" when empty). */
function Field({ label, children, className }: { label: string; children?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className={labelClass}>{label}</dt>
      <dd className="m-0 mt-1 min-h-9 whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
        {children || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  )
}

interface ProviderDetailDialogProps {
  /** The dialog is open while a provider (a list row) is given; the detail is re-read with PV2. */
  provider: Provider | null
  onOpenChange: (open: boolean) => void
  /** Optional: switches to the edit form (SCR-F3-021) for the same provider. */
  onEdit?: (provider: Provider) => void
}

/** UC-41: view transport provider details (read-only version of SCR-F3-021). */
export function ProviderDetailDialog({ provider, onOpenChange, onEdit }: ProviderDetailDialogProps) {
  const query = useProvider(provider?.transportProviderId)
  // The list row is shown instantly, then replaced by the fresh PV2 answer.
  const data = query.data ?? provider

  return (
    <Dialog open={provider !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[640px]">
        <DialogHeader className="flex-row items-start gap-3 border-b border-slate-100 px-6 py-4 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#ef5b0c] text-white" aria-hidden="true">
            <Truck className="size-5" />
          </span>
          <div className="grid gap-0.5">
            <DialogTitle className="m-0! text-base! font-semibold! leading-6! text-slate-900!">Transport Provider Details</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Review the registered details of this transport provider.</DialogDescription>
          </div>
        </DialogHeader>

        {data ? (
          <div className="grid min-w-0 gap-4 overflow-y-auto px-6 py-5">
            {query.isError ? (
              <p role="alert" className="m-0 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {getFleetErrorMessage(query.error, "Unable to refresh this provider. Showing the last loaded details.")}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div>
                <p className={`${hintClass} m-0`}>Provider code</p>
                <p className="m-0 text-base font-bold text-slate-900">{data.providerCode}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={hintClass}>Status</span>
                <ProviderStatusBadge status={data.status} />
              </div>
            </div>

            <Card icon={<Building2 className="size-4" />} title="Basic Information" subtitle="Core details of the transport provider.">
              <Field label="Provider Name">{data.providerName}</Field>
              <Field label="Tax Code / VAT Number">{data.taxCode}</Field>
              <Field label="Service Type" className="sm:col-span-2">
                {data.supportedModes.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {data.supportedModes.map((mode) => (
                      <ProviderModeBadge key={mode} mode={mode} />
                    ))}
                  </span>
                ) : null}
              </Field>
            </Card>

            <Card icon={<UserRound className="size-4" />} title="Contact Information" subtitle="Primary contact details for operational coordination.">
              <Field label="Email">{data.email}</Field>
              <Field label="Hotline">{data.phone}</Field>
              <Field label="Business Representative">{data.contactName}</Field>
              <Field label="Country">{data.country}</Field>
              <Field label="Address" className="sm:col-span-2">{data.address}</Field>
            </Card>

            <Card icon={<FileText className="size-4" />} title="Additional Information" subtitle="Notes visible to coordinators when choosing providers.">
              <Field label="Note" className="sm:col-span-2">{data.note}</Field>
            </Card>

            <p className={`${hintClass} m-0 flex flex-wrap gap-x-4`}>
              <span>Created {formatFleetDateTime(data.createdAt)}</span>
              <span>Last updated {formatFleetDateTime(data.updatedAt)}</span>
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="outline" className="h-9 rounded-md px-4 text-sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && data ? (
            <Button type="button" className="h-9 gap-1.5 rounded-md bg-[#ef5b0c] px-4 text-sm font-semibold text-white hover:bg-[#d84f08]" onClick={() => onEdit(data)}>
              <Pencil className="size-3.5" />
              Edit Provider
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

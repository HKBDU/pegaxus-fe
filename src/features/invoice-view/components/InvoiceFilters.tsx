import { useState } from "react"
import { CalendarDays, Search } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { controlClass, humanize, invoiceTypes, invoiceStatuses, invoiceSorts } from "../constants"
import { invoiceSortSchema, invoiceStatusSchema, invoiceTypeSchema } from "../schemas"
import type { InvoiceQueryParams } from "../types"

function InvoiceDateRange({ title, from, to, onChange }: { title: string; from?: string; to?: string; onChange: (from?: string, to?: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from: "", to: "" })
  const [error, setError] = useState("")
  function apply(clear = false) {
    if (!clear && draft.from && draft.to && draft.to < draft.from) { setError("End date must not precede start date."); return }
    onChange(clear ? undefined : draft.from || undefined, clear ? undefined : draft.to || undefined)
    setOpen(false)
  }
  return <Popover open={open} onOpenChange={(next) => { if (next) { setDraft({ from: from ?? "", to: to ?? "" }); setError("") }; setOpen(next) }}>
    <PopoverTrigger asChild><Button variant="outline" className={`${controlClass} w-full min-w-0 justify-start px-2.5`}><CalendarDays className="size-3.5 shrink-0" /><span className="truncate">{title}{from || to ? `: ${from ?? "Any"} — ${to ?? "Any"}` : ""}</span></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-72 space-y-3"><h3 className="text-sm font-semibold">{title}</h3>
      <DatePicker aria-label={`${title} from`} value={draft.from} placeholder="From date" maxDate={draft.to || undefined} onChange={(from) => setDraft(current => ({ ...current, from }))} className={controlClass} />
      <DatePicker aria-label={`${title} to`} value={draft.to} placeholder="To date" minDate={draft.from || undefined} onChange={(to) => setDraft(current => ({ ...current, to }))} className={controlClass} />
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-between gap-2"><Button variant="outline" size="sm" onClick={() => apply(true)}>Clear</Button><Button size="sm" onClick={() => apply()}>Apply</Button></div>
    </PopoverContent>
  </Popover>
}
export function InvoiceFilters({ params, onChange, onReset, search, onSearchChange }: {
  params: InvoiceQueryParams; onChange: (patch: Partial<InvoiceQueryParams>) => void; onReset: () => void; search: string; onSearchChange: (search: string) => void
}) {
  const sorts = invoiceSorts.map(value => { const [field, direction] = value.split(":"); return { value, label: `${({ createdAt: "Created", issuedAt: "Issued", dueDate: "Due date", totalAmount: "Amount" })[field]} ${direction === "asc" ? "↑" : "↓"}` } })
  return <div role="group" aria-label="Invoice filters" className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
    <div className="relative min-w-0 sm:col-span-2"><Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-slate-400" /><Input aria-label="Search invoices" value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Search invoices / bookings / customers..." className={`${controlClass} pl-8`} /></div>
    <div className="[&>button]:w-full"><DataTableRadioFilter title="Type" value={params.type ?? "ALL"} options={[{ value: "ALL", label: "All types" }, ...invoiceTypes.map(value => ({ value, label: humanize(value) }))]} onValueChange={value => onChange({ type: value === "ALL" ? undefined : invoiceTypeSchema.parse(value) })} /></div>
    <div className="[&>button]:w-full"><DataTableRadioFilter title="Status" value={params.status ?? "ALL"} options={[{ value: "ALL", label: "All statuses" }, ...invoiceStatuses.map(value => ({ value, label: humanize(value) }))]} onValueChange={value => onChange({ status: value === "ALL" ? undefined : invoiceStatusSchema.parse(value) })} /></div>
    <Input aria-label="Filter by TransportPlan ID" placeholder="TransportPlan ID" value={params.transportPlanId ?? ""} onChange={event => onChange({ transportPlanId: event.target.value.trim() || undefined })} className={controlClass} />
    <InvoiceDateRange title="Issued date range" from={params.issuedFrom} to={params.issuedTo} onChange={(issuedFrom, issuedTo) => onChange({ issuedFrom, issuedTo })} />
    <InvoiceDateRange title="Due date range" from={params.dueFrom} to={params.dueTo} onChange={(dueFrom, dueTo) => onChange({ dueFrom, dueTo })} />
    <div className="flex min-w-0 gap-2"><div className="min-w-0 flex-1 [&>button]:w-full"><DataTableRadioFilter title="Newest created" ariaLabel="Sort invoices" value={params.sortBy} defaultValue="createdAt:desc" hideTitleWhenFiltered options={sorts} onValueChange={value => onChange({ sortBy: invoiceSortSchema.parse(value) })} /></div><Button variant="outline" size="sm" onClick={onReset} className={controlClass}>Reset</Button></div>
  </div>
}

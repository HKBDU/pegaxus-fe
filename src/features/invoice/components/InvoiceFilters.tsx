import { useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import { CalendarDays, Search, X } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { controlClass, invoiceTypes, invoiceStatuses, invoiceSorts, INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from "@/features/invoice/constants"
import { invoiceSortSchema, invoiceStatusSchema, invoiceTypeSchema } from "@/features/invoice/schemas"
import type { InvoiceQueryParams } from "@/features/invoice/types"

const sortLabels: Record<InvoiceQueryParams["sortBy"], string> = {
  "createdAt:desc": "Newest first", "createdAt:asc": "Oldest first",
  "issuedAt:desc": "Issued: newest first", "issuedAt:asc": "Issued: oldest first",
  "dueDate:asc": "Due: earliest first", "dueDate:desc": "Due: latest first",
  "totalAmount:desc": "Amount: highest first", "totalAmount:asc": "Amount: lowest first",
}

function InvoiceDateRange({ title, from, to, onChange }: { title: string; from?: string; to?: string; onChange: (from?: string, to?: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from: "", to: "" })
  const [error, setError] = useState("")
  const dateLabel = (value?: string) => value ? format(parseISO(value), "dd MMM") : "Any"
  const label = from || to ? `${title.replace(" Date", "")}: ${dateLabel(from)} — ${dateLabel(to)}` : title
  const description = from || to ? `${title}: ${from ?? "Any"} — ${to ?? "Any"}` : title
  function apply(clear = false) {
    if (!clear && draft.from && draft.to && draft.to < draft.from) { setError("End date must not precede start date."); return }
    onChange(clear ? undefined : draft.from || undefined, clear ? undefined : draft.to || undefined)
    setOpen(false)
  }
  return <Popover open={open} onOpenChange={(next) => { if (next) { setDraft({ from: from ?? "", to: to ?? "" }); setError("") }; setOpen(next) }}>
    <PopoverTrigger asChild><Button type="button" variant="outline" aria-label={description} title={description} className={`${controlClass} w-[168px] shrink-0 justify-start px-2.5 font-normal`}><CalendarDays aria-hidden="true" className="size-3.5 shrink-0" /><span className="truncate">{label}</span></Button></PopoverTrigger>
    <PopoverContent align="start" className="w-72 space-y-3 rounded-[2px] border-slate-200 p-3"><h3 className="text-sm font-semibold">{title}</h3>
      <DatePicker aria-label={`${title} from`} value={draft.from} placeholder="From date" maxDate={draft.to || undefined} onChange={(from) => setDraft(current => ({ ...current, from }))} className={controlClass} />
      <DatePicker aria-label={`${title} to`} value={draft.to} placeholder="To date" minDate={draft.from || undefined} onChange={(to) => setDraft(current => ({ ...current, to }))} className={controlClass} />
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-between gap-2"><Button type="button" variant="outline" size="sm" aria-label={`Clear ${title}`} onClick={() => apply(true)}>Clear</Button><Button type="button" size="sm" onClick={() => apply()}>Apply</Button></div>
    </PopoverContent>
  </Popover>
}
export function InvoiceFilters({ params, onChange, search, onSearchChange }: {
  params: InvoiceQueryParams; onChange: (patch: Partial<InvoiceQueryParams>) => void; search: string; onSearchChange: (search: string) => void
}) {
  const searchInput = useRef<HTMLInputElement>(null)
  const sorts = invoiceSorts.map(value => ({ value, label: sortLabels[value] }))
  return <div role="group" aria-label="Invoice filters" className="min-w-0 overflow-x-auto py-1">
    <div className="flex w-full min-w-max flex-nowrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1"><Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-slate-400" /><Input ref={searchInput} aria-label="Search invoice number, booking code or customer name" value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Search invoices / bookings / customers..." className={`${controlClass} pl-8 pr-8`} />
        {search ? <Button type="button" variant="ghost" size="icon" aria-label="Clear invoice search" className="absolute top-1 right-1 size-6 rounded-[2px] text-slate-500" onClick={() => { onSearchChange(""); searchInput.current?.focus() }}><X aria-hidden="true" className="size-3.5" /></Button> : null}
      </div>
      <div className="w-36 shrink-0 [&>button]:w-full"><DataTableRadioFilter title="All types" ariaLabel="Invoice type" hideTitleWhenFiltered value={params.type ?? "ALL"} options={[{ value: "ALL", label: "All types" }, ...invoiceTypes.map(value => ({ value, label: INVOICE_TYPE_LABELS[value] }))]} onValueChange={value => onChange({ type: value === "ALL" ? undefined : invoiceTypeSchema.parse(value) })} /></div>
      <div className="w-32 shrink-0 [&>button]:w-full"><DataTableRadioFilter title="All statuses" ariaLabel="Invoice status" hideTitleWhenFiltered value={params.status ?? "ALL"} options={[{ value: "ALL", label: "All statuses" }, ...invoiceStatuses.map(value => ({ value, label: INVOICE_STATUS_LABELS[value] }))]} onValueChange={value => onChange({ status: value === "ALL" ? undefined : invoiceStatusSchema.parse(value) })} /></div>
      <InvoiceDateRange title="Issued Date" from={params.issuedFrom} to={params.issuedTo} onChange={(issuedFrom, issuedTo) => onChange({ issuedFrom, issuedTo })} />
      <InvoiceDateRange title="Due Date" from={params.dueFrom} to={params.dueTo} onChange={(dueFrom, dueTo) => onChange({ dueFrom, dueTo })} />
      <div className="w-40 shrink-0 [&>button]:w-full"><DataTableRadioFilter title="Newest first" ariaLabel="Sort invoices" value={params.sortBy} defaultValue="createdAt:desc" hideTitleWhenFiltered options={sorts} onValueChange={value => onChange({ sortBy: value === "createdAt:desc" ? undefined : invoiceSortSchema.parse(value) })} /></div>
      {params.transportPlanId ? <Button type="button" variant="outline" className={`${controlClass} shrink-0 gap-1.5 border-amber-200 bg-amber-50 px-2.5 text-amber-800`} aria-label="Remove Transport Plan filter" onClick={() => onChange({ transportPlanId: undefined })}>Transport Plan<X aria-hidden="true" className="size-3.5" /></Button> : null}
    </div>
  </div>
}

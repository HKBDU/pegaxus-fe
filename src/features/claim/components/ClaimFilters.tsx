import { format, parseISO } from "date-fns"
import { CalendarDays, Search, X } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS, CLAIM_TYPES, CLAIM_TYPE_LABELS, type ClaimSort, type ClaimStatus } from "@/features/claim/constants"
import { ClaimStatusBadge } from "@/features/claim/components/ClaimPrimitives"
import type { ClaimQueryParams } from "@/features/claim/types"
import { Button } from "@/shared/components/ui/button"
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Input } from "@/shared/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"

const filterControl = "h-8 rounded-[2px] border-slate-300 bg-white font-sans text-xs font-normal shadow-none"

const SORT_LABELS: Record<ClaimSort, string> = {
  "submittedAt:desc": "Newest first",
  "submittedAt:asc": "Oldest first",
}

function SubmittedRange({ from, to, onChange }: { from?: string; to?: string; onChange: (from?: string, to?: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from: "", to: "" })
  const [error, setError] = useState("")
  const dateLabel = (value?: string) => (value ? format(parseISO(value), "dd MMM") : "Any")
  const label = from || to ? `Submitted: ${dateLabel(from)} — ${dateLabel(to)}` : "Submitted date"

  function apply(clear = false) {
    if (!clear && draft.from && draft.to && draft.to < draft.from) return setError("End date must not precede start date.")
    onChange(clear ? undefined : draft.from || undefined, clear ? undefined : draft.to || undefined)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft({ from: from ?? "", to: to ?? "" })
          setError("")
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-label="Submitted date range" className={`${filterControl} w-full min-w-0 justify-start px-2.5`}>
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3 rounded-[2px] border-slate-200 p-3">
        <h3 className="text-sm font-semibold">Submitted date</h3>
        <DatePicker aria-label="Submitted from" value={draft.from} placeholder="From date" maxDate={draft.to || undefined} onChange={(value) => setDraft((current) => ({ ...current, from: value }))} className={filterControl} />
        <DatePicker aria-label="Submitted to" value={draft.to} placeholder="To date" minDate={draft.from || undefined} onChange={(value) => setDraft((current) => ({ ...current, to: value }))} className={filterControl} />
        <div className="min-h-5">{error ? <p role="alert" className="text-xs leading-5 text-destructive">{error}</p> : null}</div>
        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => apply(true)}>Clear</Button>
          <Button type="button" size="sm" onClick={() => apply()}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ClaimFiltersProps {
  params: ClaimQueryParams
  search: string
  onSearchChange: (search: string) => void
  onChange: (patch: Partial<ClaimQueryParams>) => void
  viewOptions?: ReactNode
}

/** screen §10A: search, type, status, submitted range and order, laid out like the Transport Requests toolbar. */
export function ClaimFilters({ params, search, onSearchChange, onChange, viewOptions }: ClaimFiltersProps) {
  const searchInput = useRef<HTMLInputElement>(null)
  return (
    <div role="toolbar" aria-label="Claim filters" className="grid grid-cols-3 gap-2 lg:grid-cols-[minmax(9rem,1fr)_8rem_8rem_10rem_8rem_auto]">
      <div className="relative col-span-3 lg:col-span-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          ref={searchInput}
          aria-label="Search claim code, booking code or customer name"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search claim, booking or customer"
          maxLength={200}
          spellCheck={false}
          className={`${filterControl} pl-8 pr-8 placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20`}
        />
        {search ? (
          <button
            type="button"
            aria-label="Clear claim search"
            onClick={() => {
              onSearchChange("")
              searchInput.current?.focus()
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
      <DataTableRadioFilter
        title="Type"
        ariaLabel="Claim type"
        value={params.claimType ?? "ALL"}
        options={[{ value: "ALL", label: "All types" }, ...CLAIM_TYPES.map((value) => ({ value, label: CLAIM_TYPE_LABELS[value] }))]}
        onValueChange={(value) => onChange({ claimType: value === "ALL" ? undefined : (value as ClaimQueryParams["claimType"]) })}
      />
      <DataTableRadioFilter
        title="Status"
        ariaLabel="Claim status"
        value={params.status ?? "ALL"}
        options={[{ value: "ALL", label: "All statuses" }, ...CLAIM_STATUSES.map((value) => ({ value, label: CLAIM_STATUS_LABELS[value] }))]}
        onValueChange={(value) => onChange({ status: value === "ALL" ? undefined : (value as ClaimQueryParams["status"]) })}
        renderOption={(option) => (option.value === "ALL" ? <span>{option.label}</span> : <ClaimStatusBadge status={option.value as ClaimStatus} />)}
      />
      <SubmittedRange from={params.submittedFrom} to={params.submittedTo} onChange={(submittedFrom, submittedTo) => onChange({ submittedFrom, submittedTo })} />
      <DataTableRadioFilter
        title="Sort"
        ariaLabel="Sort claims"
        value={params.sortBy}
        defaultValue="submittedAt:desc"
        options={(Object.keys(SORT_LABELS) as ClaimSort[]).map((value) => ({ value, label: SORT_LABELS[value] }))}
        onValueChange={(value) => onChange({ sortBy: value as ClaimSort })}
      />
      {viewOptions ? <div className="flex items-center justify-end">{viewOptions}</div> : null}
    </div>
  )
}

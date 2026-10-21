import { LIMITS } from "../constants"
import type { HandoverRecord, LocationDraft } from "../types"
import { formatDateTime, typeLabel } from "../utils"
import { DraftInput } from "./DraftInput"

interface Props {
  record: HandoverRecord
  editing?: boolean
  location?: LocationDraft
  onLocationChange?: (location: LocationDraft) => void
}

function Item({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="font-heading text-[0.6875rem] font-semibold tracking-[0.06em] text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold break-words text-gray-900">{children}</dd>
    </div>
  )
}

/** Header box of the design: code, sequence, type, times, location and the two route legs. */
export function RecordSummary({ record, editing = false, location, onLocationChange }: Props) {
  const place = [record.location.locationName, record.location.address, record.location.country].filter(Boolean).join(", ")
  return (
    <section aria-label="Handover summary" className="rounded-[2px] border border-slate-300 bg-white p-3 sm:p-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        <Item label="Handover code" className="col-span-2 sm:col-span-1">{record.handoverCode}</Item>
        <Item label="Sequence no.">{record.sequenceNo}</Item>
        <Item label="Type">{typeLabel(record.handoverType)}</Item>
        <Item label="Planned at">{formatDateTime(record.plannedHandoverAt)}</Item>
        <Item label="Handover time">{formatDateTime(record.actualHandoverAt)}</Item>
      </dl>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="font-heading text-[0.6875rem] font-semibold tracking-[0.06em] text-gray-500 uppercase">Location</p>
        {editing && location && onLocationChange ? (
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            <DraftInput label="Place name" value={location.locationName} maxLength={LIMITS.locationName} onChange={(locationName) => onLocationChange({ ...location, locationName })} />
            <DraftInput label="Address" value={location.address} maxLength={LIMITS.address} onChange={(address) => onLocationChange({ ...location, address })} />
            <DraftInput label="Country" value={location.country} maxLength={LIMITS.country} onChange={(country) => onLocationChange({ ...location, country })} />
          </div>
        ) : (
          <p className="mt-0.5 text-sm font-semibold break-words text-gray-900">{place || "—"}</p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 text-xs text-gray-600 sm:flex-row sm:flex-wrap sm:gap-x-6">
        <p>
          <span className="font-heading font-semibold tracking-[0.06em] text-gray-500 uppercase">From route </span>
          <span className="font-semibold text-gray-900">{record.fromSegment ? `#${record.fromSegment.displayOrder} ${record.fromSegment.fromLocationName} → ${record.fromSegment.toLocationName}` : "—"}</span>
        </p>
        <p>
          <span className="font-heading font-semibold tracking-[0.06em] text-gray-500 uppercase">To route </span>
          <span className="font-semibold text-gray-900">{record.toSegment ? `#${record.toSegment.displayOrder} ${record.toSegment.fromLocationName} → ${record.toSegment.toLocationName}` : "—"}</span>
        </p>
      </div>
    </section>
  )
}

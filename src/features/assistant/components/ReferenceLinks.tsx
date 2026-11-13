import { Link } from "react-router-dom"
import { trackingPaths } from "@/features/live-tracking/constants"
import type { AssistantReference } from "../types"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function referencePath(reference: AssistantReference): string | null {
  if (!UUID.test(reference.id)) return null
  if (reference.type === "booking") return `/bookings/${reference.id}`
  if (reference.type === "dossier") return `/compliance-dossiers/${reference.id}`
  if (reference.type === "tracking" && reference.bookingId && UUID.test(reference.bookingId))
    return trackingPaths.tabs("customer", reference.id, reference.bookingId).gps
  return null
}
export function ReferenceLinks({ references }: { references: AssistantReference[] }) {
  const valid = references.flatMap((reference) => { const to = referencePath(reference); return to ? [{ reference, to }] : [] })
  if (!valid.length) return null
  return <div className="mt-3 border-t border-slate-200 pt-2" aria-label="Sources">
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
    <ul className="space-y-1">{valid.map(({ reference, to }) => <li key={`${reference.type}-${reference.id}`}>
      <Link className="text-xs font-medium text-orange-700 underline-offset-2 hover:underline" to={to}>{reference.label}</Link>
      {reference.updatedAt ? <time className="ml-2 text-[10px] text-slate-500" dateTime={reference.updatedAt}>{new Date(reference.updatedAt).toLocaleString()}</time> : null}
    </li>)}</ul>
  </div>
}

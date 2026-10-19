import { LIMITS, PARTY_LABEL, type HandoverPartyType } from "../constants"
import type { HandoverParty, PartyDraft } from "../types"
import { DraftInput } from "./DraftInput"

interface Props {
  side: "From" | "To"
  party: HandoverParty
  editing?: boolean
  draft?: PartyDraft
  onDraftChange?: (draft: PartyDraft) => void
  errors?: Partial<Record<keyof PartyDraft, string>>
}

/** One side of the handover: who hands over (From) or receives (To), with the contact details of the actual representative. */
export function PartyBlock({ side, party, editing = false, draft, onDraftChange, errors }: Props) {
  const name = draft?.partyName || party.partyName
  return (
    <div className="min-w-0 p-3 sm:p-4">
      <p className="font-heading text-[0.6875rem] font-semibold tracking-[0.06em] text-gray-500 uppercase">{side}</p>
      {editing && draft && onDraftChange ? (
        <div className="mt-1 grid gap-2">
          <DraftInput label="Name" value={draft.partyName} maxLength={LIMITS.partyName} error={errors?.partyName} onChange={(partyName) => onDraftChange({ ...draft, partyName })} />
          <DraftInput label="Contact person" value={draft.contactName} maxLength={LIMITS.contactName} error={errors?.contactName} onChange={(contactName) => onDraftChange({ ...draft, contactName })} />
          <DraftInput label="Phone" value={draft.contactPhone} maxLength={LIMITS.contactPhone} inputMode="tel" autoComplete="tel" error={errors?.contactPhone} onChange={(contactPhone) => onDraftChange({ ...draft, contactPhone })} />
        </div>
      ) : (
        <div className="mt-1 space-y-0.5 text-sm text-gray-700">
          <p className="text-base font-bold break-words text-gray-900">{name || "—"}</p>
          <p>{PARTY_LABEL[party.type as HandoverPartyType] ?? party.type}</p>
          {draft?.contactName || party.contactName ? <p className="break-words">{draft?.contactName || party.contactName}</p> : null}
          {draft?.contactPhone || party.contactPhone ? <p>{draft?.contactPhone || party.contactPhone}</p> : null}
        </div>
      )}
    </div>
  )
}

/** The From | To box of the design: side by side from `sm`, stacked on phones. */
export function PartiesSection(props: { from: Omit<Props, "side">; to: Omit<Props, "side"> }) {
  return (
    <section aria-label="Parties" className="grid divide-y divide-slate-300 rounded-[2px] border border-slate-300 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      <PartyBlock side="From" {...props.from} />
      <PartyBlock side="To" {...props.to} />
    </section>
  )
}

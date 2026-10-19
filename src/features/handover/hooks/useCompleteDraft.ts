import { useCallback, useEffect, useRef, useState } from "react"
import type { CompleteDraft, HandoverRecord, SignatureStroke } from "../types"

interface Stored {
  draft: CompleteDraft
  sender: SignatureStroke[]
  receiver: SignatureStroke[]
}

const storageKey = (handoverRecordId: string) => `handover-draft:${handoverRecordId}`

function read(handoverRecordId: string): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(handoverRecordId))
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

export function draftFromRecord(record: HandoverRecord): CompleteDraft {
  return {
    horseConditionNote: record.horseConditionNote ?? "",
    documentHandoverNote: record.documentHandoverNote ?? "",
    equipmentHandoverNote: record.equipmentHandoverNote ?? "",
    discrepancyNote: record.discrepancyNote ?? "",
    from: { partyName: record.from.partyName ?? "", contactName: record.from.contactName ?? "", contactPhone: record.from.contactPhone ?? "" },
    to: { partyName: record.to.partyName ?? "", contactName: record.to.contactName ?? "", contactPhone: record.to.contactPhone ?? "" },
    location: { locationName: record.location.locationName ?? "", address: record.location.address ?? "", country: record.location.country ?? "" },
  }
}

/**
 * The half-filled completion form survives a reload or a phone rotation (sessionStorage, per handover record), so the
 * driver does not lose notes or the customer's signature. It is only ever sent when the user presses the button.
 */
export function useCompleteDraft(record: HandoverRecord) {
  const id = record.handoverRecordId
  const [state, setState] = useState<Stored>(() => read(id) ?? { draft: draftFromRecord(record), sender: [], receiver: [] })
  const latest = useRef(state)

  useEffect(() => {
    latest.current = state
    try {
      window.sessionStorage.setItem(storageKey(id), JSON.stringify(state))
    } catch {
      // Storage can be full or blocked (private mode): the form still works, only without the safety net.
    }
  }, [id, state])

  const setDraft = useCallback((draft: CompleteDraft) => setState((current) => ({ ...current, draft })), [])
  const setSender = useCallback((sender: SignatureStroke[]) => setState((current) => ({ ...current, sender })), [])
  const setReceiver = useCallback((receiver: SignatureStroke[]) => setState((current) => ({ ...current, receiver })), [])
  const clear = useCallback(() => {
    try {
      window.sessionStorage.removeItem(storageKey(id))
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
  }, [id])

  return { ...state, setDraft, setSender, setReceiver, clear }
}

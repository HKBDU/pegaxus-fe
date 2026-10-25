import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/store";
import type { CompleteDraft, HandoverRecord, SignatureStroke } from "../types";

interface Stored {
  draft: CompleteDraft;
  sender: SignatureStroke[];
  receiver: SignatureStroke[];
}

const STORAGE_PREFIX = "handover-draft:v2:";
// Memory remains a fallback when browser storage is unavailable.
const drafts = new Map<string, Stored>();

function storageSession(account: string | undefined) {
  const marker = `${STORAGE_PREFIX}${account ?? "anonymous"}:session`;
  try {
    const existing = window.sessionStorage.getItem(marker);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(marker, created);
    return created;
  } catch {
    return `memory-${useAuthStore.getState().sessionVersion}`;
  }
}

function read(key: string): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    // Legacy unscoped drafts cannot be associated with an authenticated account.
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

useAuthStore.subscribe((state, previous) => {
  if (
    state.sessionVersion !== previous.sessionVersion ||
    state.principal?.id !== previous.principal?.id
  ) {
    drafts.clear();
    try {
      const keys: string[] = [];
      for (let index = 0; index < window.sessionStorage.length; index += 1) {
        const key = window.sessionStorage.key(index);
        if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
      }
      for (const key of keys) window.sessionStorage.removeItem(key);
    } catch {
      // Storage may be blocked; the in-memory drafts have already been cleared.
    }
  }
});

export function draftFromRecord(record: HandoverRecord): CompleteDraft {
  return {
    horseConditionNote: record.horseConditionNote ?? "",
    documentHandoverNote: record.documentHandoverNote ?? "",
    equipmentHandoverNote: record.equipmentHandoverNote ?? "",
    discrepancyNote: record.discrepancyNote ?? "",
    from: {
      partyName: record.from.partyName ?? "",
      contactName: record.from.contactName ?? "",
      contactPhone: record.from.contactPhone ?? "",
    },
    to: {
      partyName: record.to.partyName ?? "",
      contactName: record.to.contactName ?? "",
      contactPhone: record.to.contactPhone ?? "",
    },
    location: {
      locationName: record.location.locationName ?? "",
      address: record.location.address ?? "",
      country: record.location.country ?? "",
    },
  };
}

/**
 * Preserve notes and signature strokes through reloads in this account's browser session.
 * Coordinates and signed image URLs are never included in this snapshot.
 */
export function useCompleteDraft(record: HandoverRecord) {
  const id = record.handoverRecordId;
  const session = useAuthStore((state) => state.sessionVersion);
  const account = useAuthStore((state) => state.principal?.id);
  const [storageSessionId] = useState(() => storageSession(account));
  const key = `${STORAGE_PREFIX}${account ?? "anonymous"}:${storageSessionId}:${id}`;
  const initialKey = useRef(key);
  const initialSession = useRef(session);
  const [state, setState] = useState<Stored>(
    () =>
      drafts.get(key) ??
      read(key) ?? {
        draft: draftFromRecord(record),
        sender: [],
        receiver: [],
      },
  );

  useEffect(() => {
    // The form is keyed by identity; do not copy an old draft even if a caller forgets to remount it.
    if (
      initialKey.current !== key ||
      initialSession.current !== session ||
      useAuthStore.getState().sessionVersion !== session ||
      useAuthStore.getState().principal?.id !== account
    )
      return;
    drafts.set(key, state);
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // A blocked or full store does not prevent editing or submitting the form.
    }
  }, [key, state, session, account]);

  const setDraft = useCallback(
    (draft: CompleteDraft) => setState((current) => ({ ...current, draft })),
    [],
  );
  const setSender = useCallback(
    (sender: SignatureStroke[]) =>
      setState((current) => ({ ...current, sender })),
    [],
  );
  const setReceiver = useCallback(
    (receiver: SignatureStroke[]) =>
      setState((current) => ({ ...current, receiver })),
    [],
  );
  const clear = useCallback(() => {
    drafts.delete(key);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // No persistent entry to clear when storage is unavailable.
    }
  }, [key]);

  return { ...state, setDraft, setSender, setReceiver, clear };
}

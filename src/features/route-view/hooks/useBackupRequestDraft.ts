import { useCallback, useMemo } from "react";
import { useAuthStore } from "@/features/auth/store";
import { backupRequestDefaults, type BackupRequestValues } from "../emergency-form";

const STORAGE_PREFIX = "backup-request-draft:v1:";

// A draft belongs to one signed-in account; drop every draft when the session changes.
useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion === previous.sessionVersion && state.principal?.id === previous.principal?.id) return;
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Storage may be blocked; there is nothing to clear then.
  }
});

function read(key: string): BackupRequestValues | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Record<keyof BackupRequestValues, unknown>>;
    const values = { ...backupRequestDefaults };
    for (const name of Object.keys(values) as (keyof BackupRequestValues)[]) {
      const value = stored[name];
      if (typeof value === "string") values[name] = value;
    }
    return values;
  } catch {
    return null;
  }
}

/**
 * Keeps what the RC typed in the backup activation request for this browser tab, so leaving the page or reloading it
 * does not lose the draft. The draft is removed once the request is sent or the RC signs out.
 */
export function useBackupRequestDraft(routePlanId: string) {
  const accountId = useAuthStore((state) => state.principal?.id);
  const key = `${STORAGE_PREFIX}${accountId ?? "anonymous"}:${routePlanId}`;
  const initial = useMemo(() => read(key), [key]);
  const save = useCallback(
    (values: BackupRequestValues) => {
      try {
        const empty = (Object.keys(values) as (keyof BackupRequestValues)[]).every((name) => !values[name].trim());
        if (empty) window.sessionStorage.removeItem(key);
        else window.sessionStorage.setItem(key, JSON.stringify(values));
      } catch {
        // Storage may be blocked or full; the form still works without a saved draft.
      }
    },
    [key],
  );
  const clear = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Nothing to clear when storage is blocked.
    }
  }, [key]);
  return { initial, save, clear };
}

import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { UNSAFE_DataRouterContext, type Blocker } from "react-router-dom";
import {
  DataRouterBlocker,
  UnsavedChangesDialog,
} from "@/shared/components/UnsavedChangesDialog";

export interface UseUnsavedChangesOptions {
  /** True when the form has unsaved user modifications */
  isDirty: boolean;
  /** True when form submission is in progress or completed (bypasses blocker) */
  isSubmitting?: boolean;
  /** Optional callback to run when discarding changes (e.g., releasing an edit lock) */
  onDiscard?: () => void | Promise<void>;
  /** Dialog title */
  title?: string;
  /** Dialog message */
  description?: string;
  /** Custom predicate for blocking if finer control is needed */
  customShouldBlock?: (currentPath: string, nextPath: string) => boolean;
}

export interface UseUnsavedChangesResult {
  /** True if navigation is currently blocked */
  isBlocked: boolean;
  /** The confirmation dialog element to render */
  dialogElement: ReactNode;
  /** Handler to dismiss the prompt and remain on the form */
  keepEditing: () => void;
  /** Handler to confirm discarding changes and proceed with navigation */
  discardChanges: () => Promise<void>;
  /**
   * Synchronously bypass the blocker for the next navigation (e.g. immediately before navigate() on a successful save).
   * Automatically resets after 1000ms if navigation does not occur so subsequent edits remain protected.
   */
  allowNextNavigation: () => void;
}

/**
 * Standard hook for protecting workflows with unsaved changes.
 * Intercepts client-side router navigation via React Router useBlocker
 * and native browser reload/tab-close events via beforeunload.
 */
export function useUnsavedChanges({
  isDirty,
  isSubmitting = false,
  onDiscard,
  title,
  description,
  customShouldBlock,
}: UseUnsavedChangesOptions): UseUnsavedChangesResult {
  const hasDataRouter = Boolean(useContext(UNSAFE_DataRouterContext));
  const [activeBlocker, setActiveBlocker] = useState<Blocker | null>(null);
  const bypassRef = useRef(false);
  const bypassTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true;
    clearTimeout(bypassTimerRef.current);
    bypassTimerRef.current = setTimeout(() => {
      bypassRef.current = false;
    }, 1000);
  }, []);

  useEffect(() => () => clearTimeout(bypassTimerRef.current), []);

  // 1. Browser-level safeguard for reload / tab close / external link
  useEffect(() => {
    if (!isDirty || isSubmitting) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  // 2. React Router client-side navigation filter
  const shouldBlock = useCallback(
    ({
      currentLocation,
      nextLocation,
    }: {
      currentLocation: { pathname: string };
      nextLocation: { pathname: string };
    }) => {
      if (bypassRef.current) return false;
      if (!isDirty || isSubmitting) return false;
      if (customShouldBlock) {
        return customShouldBlock(currentLocation.pathname, nextLocation.pathname);
      }
      // Never block internal wizard transitions (same pathname, different search/hash)
      return currentLocation.pathname !== nextLocation.pathname;
    },
    [isDirty, isSubmitting, customShouldBlock],
  );

  const handleBlockerChange = useCallback((blocker: Blocker) => {
    setActiveBlocker(blocker);
  }, []);

  const keepEditing = useCallback(() => {
    if (activeBlocker?.state === "blocked") {
      activeBlocker.reset();
    }
  }, [activeBlocker]);

  const discardChanges = useCallback(async () => {
    if (onDiscard) {
      await onDiscard();
    }
    if (activeBlocker?.state === "blocked") {
      activeBlocker.proceed();
    }
  }, [activeBlocker, onDiscard]);

  const isBlocked = activeBlocker?.state === "blocked";

  const dialogElement = (
    <>
      {hasDataRouter && (
        <DataRouterBlocker
          shouldBlock={shouldBlock}
          onChange={handleBlockerChange}
        />
      )}
      <UnsavedChangesDialog
        open={isBlocked}
        title={title}
        description={description}
        onKeepEditing={keepEditing}
        onDiscard={() => void discardChanges()}
      />
    </>
  );

  return {
    isBlocked,
    dialogElement,
    keepEditing,
    discardChanges,
    allowNextNavigation,
  };
}

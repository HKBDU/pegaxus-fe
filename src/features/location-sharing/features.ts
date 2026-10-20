// Enable only after the target deployment implements HO7 and the new arrival contract.
export const FEATURES = {
  segmentArrival:
    (import.meta.env as Record<string, unknown>).VITE_ENABLE_SEGMENT_ARRIVAL ===
    "true",
} as const;

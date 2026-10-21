// HO7 is absent from BE 353d951 and DEV OpenAPI checked on 2026-10-21.
// Reconfirm endpoint and arrival locking before enabling; a local env flag is not capability evidence.
export const FEATURES = {
  segmentArrival: false,
} as const;

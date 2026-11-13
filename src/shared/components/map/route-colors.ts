/** Line colours of the route layer, shared with any legend that explains them. */
export const ROUTE_LINE_COLORS = {
  /** The focused route of a map that highlights one. */
  focused: "#0f172a",
  /** Every other editable route, such as the segments being built. */
  default: "#2563eb",
  /** Context the user cannot change, such as the primary behind a backup or a completed leg. */
  readonly: "#94a3b8",
  /** A backup segment that reuses a primary route: distinct from the blue backup legs and the grey primary. */
  sharedWithPrimary: "#8b5cf6",
  /** A segment blocked by the Transport Specialist's legal review, so the coordinator finds it at once. */
  blocked: "#c8414b",
} as const;

export const PRICE_LIST_HEADER_LIMITS = {
  nameMax: 200,
  rateMin: 0,
  rateMax: 100,
} as const;

export const PRICE_LIST_HEADER_DEFAULTS = {
  name: "",
  currency: "VND",
  taxRate: "20",
  depositRate: "40",
} as const;

export const PRICE_LIST_HEADER_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Check the highlighted fields and try again.",
  PRICE_LIST_MODIFIED:
    "This price list changed in another session. Discard your edits and reload before editing again.",
  ACTIVE_PRICELIST_LOCKED:
    "This price list is active and locked. Clone it to make changes.",
  PRICE_LIST_EMPTY: "Add price lines before activating this price list.",
  PRICE_LIST_CURRENCY_UNSUPPORTED: "Only VND price lists can be activated.",
  PRICE_LIST_NOT_FOUND: "This price list no longer exists or is unavailable.",
  FORBIDDEN: "Only Logistics Managers can manage price lists.",
  UNAUTHORIZED: "Your session has expired. Sign in again before continuing.",
  TOO_MANY_REQUESTS: "Too many requests. Please wait before trying again.",
  SESSION_CHANGED:
    "Your session changed. Reopen this action using your current session.",
  REQUEST_PENDING: "This action is already being submitted. Please wait.",
  INVALID_RESPONSE:
    "The server response does not match the price list contract. Refresh the list before retrying; the change may already have been saved.",
  OUTCOME_UNKNOWN:
    "The request could not be confirmed. Check the price list before retrying to avoid creating a duplicate.",
};

import { useLocation } from "react-router-dom";

export type AllowedOrigins = string[] | ((from: string) => boolean);
export type BackLabels = Record<string, string> | ((from: string) => string | undefined);

export interface BackTargetOptions {
  /** Safe fallback destination if state.from is missing or invalid. */
  fallback: string;
  /** Label to display when fallback is used. Defaults to "Back". */
  fallbackLabel?: string;
  /** Optional allowed target paths or a validation function. */
  allowedOrigins?: AllowedOrigins;
  /** Optional custom labels mapped by path prefix/exact match, or via a resolver function. */
  labels?: BackLabels;
}

export interface BackTargetResult {
  /** Resolved destination path */
  href: string;
  /** Resolved display label for the back link/button */
  label: string;
  /** True if the target was resolved from a valid history state */
  isFromState: boolean;
}

/**
 * Extracts a candidate string from history state (`state.from`).
 * Accepts either a string or an object with `{ pathname, search?, hash? }`.
 */
export function extractRawFrom(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const fromProp = (state as Record<string, unknown>).from;
  if (typeof fromProp === "string") {
    const trimmed = fromProp.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (fromProp && typeof fromProp === "object" && "pathname" in fromProp) {
    const obj = fromProp as { pathname: unknown; search?: unknown; hash?: unknown };
    if (typeof obj.pathname === "string") {
      const pn = obj.pathname.trim();
      if (!pn) return null;
      const search = typeof obj.search === "string" ? obj.search.trim() : "";
      const hash = typeof obj.hash === "string" ? obj.hash.trim() : "";
      return `${pn}${search}${hash}`;
    }
  }
  return null;
}

/**
 * Validates whether the raw string is a safe, internal relative path.
 * Rejects external URLs, protocol-relative paths (`//`), backslashes (`\`),
 * self-loops matching current pathname, and dangerous URI schemes.
 */
export function isValidBackPath(from: string, currentPathname: string): boolean {
  if (!from.startsWith("/")) return false;
  if (from.startsWith("//")) return false;
  if (from.includes("\\")) return false;

  // Block control characters and dangerous pseudo-schemes
  const lower = from.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return false;
  }

  // Extract path portion to compare with current pathname (prevent self-loop)
  const targetPathname = from.split("?")[0].split("#")[0];
  if (targetPathname === currentPathname) {
    return false;
  }

  return true;
}

function matchesAllowedOrigins(from: string, allowedOrigins?: AllowedOrigins): boolean {
  if (!allowedOrigins) return true;
  if (typeof allowedOrigins === "function") {
    return Boolean(allowedOrigins(from));
  }
  return allowedOrigins.some((origin) => {
    return (
      from === origin ||
      from.startsWith(`${origin}/`) ||
      from.startsWith(`${origin}?`) ||
      from.startsWith(`${origin}#`)
    );
  });
}

function resolveLabel(
  from: string,
  labels?: BackLabels,
  fallbackLabel: string = "Back",
): string {
  if (!labels) return fallbackLabel;
  if (typeof labels === "function") {
    return labels(from) ?? fallbackLabel;
  }

  // 1. Exact match on full target
  if (labels[from]) return labels[from];

  // 2. Exact match on pathname part
  const targetPathname = from.split("?")[0].split("#")[0];
  if (labels[targetPathname]) return labels[targetPathname];

  // 3. Prefix match (longest matching prefix takes precedence)
  const sortedPrefixes = Object.keys(labels).sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    if (
      from === prefix ||
      from.startsWith(`${prefix}/`) ||
      from.startsWith(`${prefix}?`) ||
      from.startsWith(`${prefix}#`)
    ) {
      return labels[prefix];
    }
  }

  return fallbackLabel;
}

/**
 * Pure function to resolve back destination from current location and options.
 */
export function resolveBackTarget(
  location: { pathname: string; state: unknown },
  options: BackTargetOptions,
): BackTargetResult {
  const fallbackLabel = options.fallbackLabel ?? "Back";
  const rawFrom = extractRawFrom(location.state);

  if (!rawFrom) {
    return {
      href: options.fallback,
      label: fallbackLabel,
      isFromState: false,
    };
  }

  if (
    !isValidBackPath(rawFrom, location.pathname) ||
    !matchesAllowedOrigins(rawFrom, options.allowedOrigins)
  ) {
    return {
      href: options.fallback,
      label: fallbackLabel,
      isFromState: false,
    };
  }

  const label = resolveLabel(rawFrom, options.labels, fallbackLabel);
  return {
    href: rawFrom,
    label,
    isFromState: true,
  };
}

/**
 * Standard hook for context-aware back navigation.
 * Validates `location.state.from` against security rules and falls back safely.
 */
export function useBackTarget(options: BackTargetOptions): BackTargetResult {
  const location = useLocation();
  return resolveBackTarget(location, options);
}


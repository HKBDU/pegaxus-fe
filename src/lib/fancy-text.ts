/**
 * Unicode Mathematical Sans-Serif Bold transformation utility.
 * Used for stylized browser tab branding.
 */

export const FANCY_TITLE_ENABLED: boolean =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_FANCY_TITLE_ENABLED !== undefined
    ? import.meta.env.VITE_FANCY_TITLE_ENABLED !== "false" && import.meta.env.VITE_FANCY_TITLE_ENABLED !== false
    : true

const UPPER_A_CODE = 65
const UPPER_Z_CODE = 90
const LOWER_A_CODE = 97
const LOWER_Z_CODE = 122
const DIGIT_0_CODE = 48
const DIGIT_9_CODE = 57

const FANCY_UPPER_BASE = 0x1d5d4
const FANCY_LOWER_BASE = 0x1d5ee
const FANCY_DIGIT_BASE = 0x1d7ec

export const BRAND_NAME = "PEGAXUS"
export const MAX_TITLE_LENGTH = 40

/**
 * Converts SCREAMING_SNAKE or ALL CAPS strings to Title Case.
 * e.g. "APPROVED BOOKINGS" -> "Approved Bookings"
 */
export function toTitleCase(input: string): string {
  if (!input) return ""
  return input
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Truncates text by Unicode code points to avoid splitting surrogate pairs.

 * Appends an ellipsis character ("…") if truncated.
 */
export function truncateByCodePoints(text: string, maxLength: number): string {
  if (!text) return ""
  const points = Array.from(text)
  if (points.length <= maxLength) return text
  return points.slice(0, Math.max(0, maxLength - 1)).join("") + "…"
}

/**
 * Converts ASCII alphanumeric characters (A-Z, a-z, 0-9) to Unicode Mathematical Sans-Serif Bold.
 * Non-ASCII characters, accented letters, punctuation, spaces, and already converted code points
 * are returned unchanged.
 * Always works with Unicode code points (Array.from / codePointAt).
 */
export function fancyText(input: string): string {
  if (!input || !FANCY_TITLE_ENABLED) return input

  return Array.from(input)
    .map((char) => {
      const code = char.codePointAt(0)
      if (code === undefined) return char

      if (code >= UPPER_A_CODE && code <= UPPER_Z_CODE) {
        return String.fromCodePoint(FANCY_UPPER_BASE + (code - UPPER_A_CODE))
      }
      if (code >= LOWER_A_CODE && code <= LOWER_Z_CODE) {
        return String.fromCodePoint(FANCY_LOWER_BASE + (code - LOWER_A_CODE))
      }
      if (code >= DIGIT_0_CODE && code <= DIGIT_9_CODE) {
        return String.fromCodePoint(FANCY_DIGIT_BASE + (code - DIGIT_0_CODE))
      }

      return char
    })
    .join("")
}

/**
 * Formats a stylized browser tab title:
 * - With page: "{fancy(PEGAXUS)} · {fancy(Page)}" e.g. "𝗣𝗘𝗚𝗔𝗫𝗨𝗦 · 𝗖𝗿𝗲𝗮𝘁𝗲 𝗕𝗼𝗼𝗸𝗶𝗻𝗴"
 * - Without page: "{fancy(PEGAXUS)}"
 * - With count > 0: prefix "(N) " in plain text, N capped at 9+. e.g. "(2) 𝗣𝗘𝗚𝗔𝗫𝗨𝗦 · 𝗥𝗲𝘃𝗶𝘀𝗶𝗼𝗻 𝗿𝗲𝗾𝘂𝗲𝘀𝘁𝗲𝗱"
 * Truncates dynamic values before styling and keeps visible title under ~40 code points.
 */
export function formatPageTitle(page?: string, count = 0): string {
  const styledBrand = fancyText(BRAND_NAME)
  const trimmedPage = page?.trim()

  let countPrefix = ""
  if (typeof count === "number" && count > 0) {
    const capped = count > 9 ? "9+" : String(Math.floor(count))
    countPrefix = `(${capped}) `
  }

  if (!trimmedPage) {
    const raw = `${countPrefix}${styledBrand}`
    return truncateByCodePoints(raw, MAX_TITLE_LENGTH)
  }

  // Pre-truncate page name if it would make the title exceed MAX_TITLE_LENGTH
  // Prefix is at most countPrefix (5) + styledBrand (7) + " · " (3) = 15 characters
  const maxPageChars = Math.max(10, MAX_TITLE_LENGTH - (countPrefix.length + 10))
  const safePage = truncateByCodePoints(trimmedPage, maxPageChars)
  const styledPage = fancyText(safePage)

  const fullTitle = `${countPrefix}${styledBrand} · ${styledPage}`
  return truncateByCodePoints(fullTitle, MAX_TITLE_LENGTH)
}

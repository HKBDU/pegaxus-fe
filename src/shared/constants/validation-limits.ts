/**
 * Single source of truth for input limits across the application.
 * Mirrors Pegaxus.Service/Common/Limits.cs and validation helpers from pegaxus-be.
 */

export const VALIDATION_LIMITS = {
  // Horse measurements
  horseWeightKg: { min: 20, max: 1500, scale: 1 },
  horseHeightCm: { min: 50, max: 220, scale: 1 },
  horseMaxAgeYears: 40,

  // Transport and Route Planning
  planDistanceKm: { min: 0.1, max: 30000, scale: 2 },
  planDurationMinutesMax: 60 * 24 * 60, // 86,400 minutes (60 days)

  // Tracking and GPS
  trackingSpeedKmh: { min: 0, max: 1000, scale: 1 },
  trackingAccuracyMeters: { min: 0, max: 10000, scale: 1 },
  headingDegrees: { min: 0, max: 359.9, scale: 1 },
  latitude: { min: -90, max: 90, scale: 4 },
  longitude: { min: -180, max: 180, scale: 4 },
  coordinateScale: 4,

  // Invoice
  invoiceQuantityMin: 1,
  invoiceQuantityMax: 5000,
  invoicePriceMax: 9_999_999_999_999_999,

  // Compliance
  validityPeriodDaysMin: 1,
  validityPeriodDaysMax: 3650, // 10 years

  // Text & Notes
  noteMaxLength: 2000,
  shortTextMaxLength: 100,
  nameMaxLength: 150,
  mediumTextMaxLength: 200,
  longTextMaxLength: 500,

  // Accounts & Age
  accountMinAgeYears: 16,
  accountMaxAgeYears: 120,

  // Date Windows
  dateWindowYears: 10,
  clockSkewMinutes: 5,

  // Phone limits
  phoneMinDigits: 8,
  phoneMaxDigits: 15,
} as const;

export const PHONE_MESSAGE =
  "Phone must be a valid number (8-15 digits, e.g. +33123456789)";

export const PHONE_ALLOWED_REGEX = /^\+?[0-9\s().-]+$/;
export const PHONE_STRIPPED_REGEX = /^\+?[1-9]\d{7,14}$/;

/**
 * Validates a phone string according to the BE Phones.cs specification:
 * - Digits with optional "+", spaces, dots, dashes, and brackets.
 * - Stripped number must be 8-15 digits and start with 1-9 (after optional "+").
 * - Returns true for empty/whitespace string (callers enforce "required" separately).
 */
export function isPhoneValid(value?: string | null): boolean {
  if (!value || !value.trim()) return true;
  const trimmed = value.trim();
  if (!PHONE_ALLOWED_REGEX.test(trimmed)) return false;
  const stripped = trimmed.replace(/[\s().-]/g, "");
  return PHONE_STRIPPED_REGEX.test(stripped);
}

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024

/**
 * Validates an ISO 3166-1 alpha-2 2-letter country code.
 * Blank/empty is treated as valid (optional fields).
 */
export function isIso2CountryCodeValid(value?: string | null): boolean {
  if (!value || !value.trim()) return true;
  const trimmed = value.trim();
  return trimmed.length === 2 && /^[A-Za-z]{2}$/.test(trimmed);
}

/**
 * Checks decimal scale (number of decimal places, ignoring trailing zeros).
 */
export function countDecimalPlaces(num: number): number {
  if (!Number.isFinite(num) || Number.isInteger(num)) return 0;
  const str = num.toString();
  // Handle scientific notation if any
  if (str.includes("e-")) {
    const parts = str.split("e-");
    return Number(parts[1]);
  }
  const decimalPart = str.split(".")[1];
  return decimalPart ? decimalPart.replace(/0+$/, "").length : 0;
}

/**
 * Checks if a coordinate pair is within valid ranges, has <= 4 decimal places,
 * and is not the (0, 0) placeholder coordinate.
 */
export function areCoordinatesValid(
  latitude?: number | null,
  longitude?: number | null,
): boolean {
  if (latitude == null || longitude == null) return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  if (
    latitude < VALIDATION_LIMITS.latitude.min ||
    latitude > VALIDATION_LIMITS.latitude.max
  )
    return false;
  if (
    longitude < VALIDATION_LIMITS.longitude.min ||
    longitude > VALIDATION_LIMITS.longitude.max
  )
    return false;
  if (countDecimalPlaces(latitude) > VALIDATION_LIMITS.coordinateScale)
    return false;
  if (countDecimalPlaces(longitude) > VALIDATION_LIMITS.coordinateScale)
    return false;
  return true;
}

/**
 * Normalizes single-line names: strips control and zero-width characters,
 * collapses consecutive whitespace runs into a single space.
 */
export function normalizeName(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/[\u200B-\u200D\uFEFF\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes multi-line notes: preserves \n, \r, \t, removes other control & zero-width characters.
 */
export function normalizeNote(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

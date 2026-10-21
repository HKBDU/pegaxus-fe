import { EU_COUNTRIES } from "@/features/booking/constants/eu-countries"

export interface ComplianceCountryOption {
  /** Stored as `ComplianceRequirement.country` (the contract examples use codes: GB, FR, EU). */
  code: string
  name: string
}

/** "EU" = union-wide; an empty country means shared across all routes (contract: country = null). */
export const COMPLIANCE_COUNTRIES: readonly ComplianceCountryOption[] = [
  { code: "EU", name: "European Union" },
  { code: "GB", name: "United Kingdom" },
  ...EU_COUNTRIES.filter(({ isoCode }) => isoCode !== "GB").map(({ isoCode, name }) => ({ code: isoCode, name })),
]

export function getComplianceCountryName(code: string | null | undefined) {
  return COMPLIANCE_COUNTRIES.find((country) => country.code === code)?.name ?? code ?? ""
}

/** Booking stores country names ("United Kingdom"); the catalog stores codes ("GB"). */
export function getComplianceCountryCode(name: string | null | undefined) {
  const normalized = name?.trim().toLowerCase()
  if (!normalized) return undefined
  let alias = normalized
  if (alias === "czech republic") alias = "czechia"
  else if (alias === "uk" || alias === "great britain") alias = "united kingdom"
  return COMPLIANCE_COUNTRIES.find((country) => country.name.toLowerCase() === alias || country.code.toLowerCase() === alias)?.code
}

import { getCountryDataList } from "countries-list"

import { isPhoneValid, PHONE_ALLOWED_REGEX, PHONE_MESSAGE } from "@/shared/constants/validation-limits"

const callingCountries = getCountryDataList()
const nationalNumberPolicies: Record<string, { callingCode: string; removeTrunkZero: boolean }> = {
  VN: { callingCode: "84", removeTrunkZero: true },
  GB: { callingCode: "44", removeTrunkZero: true },
  FR: { callingCode: "33", removeTrunkZero: true },
  IT: { callingCode: "39", removeTrunkZero: false },
}

export type ProfilePhoneResult = { value: string; canonical: string; error?: string }

export function resolveProfilePhone(value: string, callingCountry: string): ProfilePhoneResult {
  const trimmed = value.trim()
  if (!trimmed) return { value: "", canonical: "" }
  if (!PHONE_ALLOWED_REGEX.test(trimmed)) return { value: trimmed, canonical: "", error: PHONE_MESSAGE }

  const stripped = trimmed.replace(/[\s().-]/g, "")
  if (stripped.startsWith("+")) {
    return isPhoneValid(trimmed)
      ? { value: trimmed, canonical: stripped }
      : { value: trimmed, canonical: "", error: PHONE_MESSAGE }
  }

  const country = callingCountries.find((option) => option.name === callingCountry)
  const policy = country && nationalNumberPolicies[country.iso2]
  // Country metadata alone cannot establish national trunk-prefix rules. In
  // particular, Vatican's listed +379 must not replace an existing +39 number.
  if (!policy || stripped.startsWith("00")) {
    return {
      value: trimmed,
      canonical: "",
      error: country
        ? "Enter the full international number starting with + for this country."
        : "Choose a calling country for a national number, or enter the full number starting with +.",
    }
  }

  const nationalNumber = policy.removeTrunkZero ? stripped.replace(/^0/, "") : stripped
  const canonical = `+${policy.callingCode}${nationalNumber}`
  return isPhoneValid(canonical)
    ? { value: canonical, canonical }
    : { value: trimmed, canonical: "", error: PHONE_MESSAGE }
}

import { describe, expect, it } from "vitest"

import { countryKey, isCrossBorder, isMandatoryBcpCrossing } from "@/features/route-plan/bcp-detector"

describe("BCP country comparison", () => {
  it("treats a saved location code and a map place name as the same country", () => {
    expect(countryKey("GB")).toBe("GB")
    expect(countryKey(" united kingdom ")).toBe("GB")
    expect(countryKey("UK")).toBe("GB")
    expect(countryKey("England")).toBe("GB")
    expect(countryKey("France")).toBe(countryKey("fr"))
    expect(isCrossBorder("GB", "United Kingdom")).toBe(false)
    expect(isMandatoryBcpCrossing("GB", "United Kingdom")).toBe(false)
  })

  it("still requires a BCP when a route really leaves or enters the UK or Ireland", () => {
    expect(isMandatoryBcpCrossing("GB", "France")).toBe(true)
    expect(isMandatoryBcpCrossing("United Kingdom", "FR")).toBe(true)
    expect(isMandatoryBcpCrossing("IE", "United Kingdom")).toBe(true)
    expect(isMandatoryBcpCrossing("Ireland", "Germany")).toBe(true)
  })

  it("does not require a BCP between two EU countries or when a country is missing", () => {
    expect(isCrossBorder("FR", "Germany")).toBe(true)
    expect(isMandatoryBcpCrossing("FR", "Germany")).toBe(false)
    expect(isCrossBorder("GB", undefined)).toBe(false)
  })
})

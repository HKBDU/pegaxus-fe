import { describe, expect, it } from "vitest";
import { COMPETENT_AUTHORITIES } from "@/shared/constants/competent-authorities";
import { EU_COUNTRIES } from "@/features/booking/constants/eu-countries";

describe("competent authorities", () => {
  it("covers every country a booking can start or end in", () => {
    const covered = new Set<string>(COMPETENT_AUTHORITIES.map((item) => item.countryCode));
    expect(EU_COUNTRIES.map((country) => country.isoCode).filter((code) => !covered.has(code))).toEqual([]);
  });

  it("keeps the names unique, as the BE matches resubmissions by name", () => {
    const names = COMPETENT_AUTHORITIES.map((item) => item.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

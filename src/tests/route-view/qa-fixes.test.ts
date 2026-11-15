import { describe, expect, it } from "vitest";
import { getPostLoginPath, requestedPath } from "@/app/route-config";
import {
  formatCountryDisplayName,
  normalizeCountryToIso2,
} from "@/shared/components/ui/country-select";

describe("QA-06: signing in returns to the page that was asked for", () => {
  it("keeps the protected page with its query and hash", () => {
    const state = {
      from: { pathname: "/my-horses", search: "?tab=1", hash: "#top" },
    };
    expect(requestedPath(state)).toBe("/my-horses?tab=1#top");
    expect(getPostLoginPath("CUSTOMER", requestedPath(state))).toBe(
      "/my-horses?tab=1#top",
    );
  });

  it("falls back to the role home without a requested page or for an unsafe one", () => {
    expect(requestedPath(null)).toBeUndefined();
    expect(getPostLoginPath("CUSTOMER", requestedPath(null))).toBe("/");
    expect(getPostLoginPath("CUSTOMER", "//evil.example")).toBe("/");
  });
});

describe("QA-05: a profile country is stored as an ISO code and shown as a name", () => {
  it("saves the code of a picked name and shows the name of a stored code", () => {
    expect(normalizeCountryToIso2("United Kingdom")).toBe("GB");
    expect(normalizeCountryToIso2("France")).toBe("FR");
    expect(formatCountryDisplayName("GB")).toBe("United Kingdom");
  });

  it("leaves empty values and unknown names alone", () => {
    expect(normalizeCountryToIso2("")).toBeUndefined();
    expect(normalizeCountryToIso2("Atlantis")).toBeUndefined();
    expect(formatCountryDisplayName("")).toBe("");
  });
});

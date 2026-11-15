import { describe, expect, it } from "vitest";
import { getPostLoginPath, requestedPath } from "@/app/route-config";
import {
  countryCodeFromName,
  countryNameFromCode,
} from "@/features/profile/country";

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

describe("QA-05: an employee's country is stored as an ISO code", () => {
  it("shows the name of a stored code and saves the code of a picked name", () => {
    expect(countryNameFromCode("GB")).toBe("United Kingdom");
    expect(countryCodeFromName("United Kingdom")).toBe("GB");
    expect(countryCodeFromName("France")).toBe("FR");
  });

  it("leaves empty values and unknown names alone", () => {
    expect(countryNameFromCode("")).toBe("");
    expect(countryCodeFromName("")).toBeUndefined();
    expect(countryCodeFromName("Atlantis")).toBeUndefined();
  });
});

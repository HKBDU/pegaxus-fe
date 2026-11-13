import { describe, expect, it } from "vitest";
import { crewTurnErrorMessage, NOT_CURRENT_SEGMENT_CREW_MESSAGE } from "@/shared/constants/crew-turn";

describe("crewTurnErrorMessage", () => {
  it("explains a crew-turn refusal however the error carries the BE code", () => {
    expect(crewTurnErrorMessage({ errorCode: "NOT_CURRENT_SEGMENT_CREW" })).toBe(NOT_CURRENT_SEGMENT_CREW_MESSAGE);
    expect(crewTurnErrorMessage({ response: { data: { errorCode: "NOT_CURRENT_SEGMENT_CREW" } } })).toBe(NOT_CURRENT_SEGMENT_CREW_MESSAGE);
    expect(crewTurnErrorMessage(new Error("NOT_CURRENT_SEGMENT_CREW"))).toBe(NOT_CURRENT_SEGMENT_CREW_MESSAGE);
  });

  it("leaves every other error to the page", () => {
    expect(crewTurnErrorMessage({ errorCode: "FORBIDDEN" })).toBeNull();
    expect(crewTurnErrorMessage(new Error("Request failed with status code 403"))).toBeNull();
    expect(crewTurnErrorMessage(null)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { crewSelectionErrors, effectiveCrew } from "@/features/route-view/crew-selection";
import type { CrewPlan } from "@/features/route-view/types";

const location = (name: string) => ({
  locationId: name, locationName: name, locationType: null, city: null, country: "FR", latitude: null, longitude: null,
});
const person = (id: string, role: string) => ({ employeeId: id, employeeCode: id, fullName: id, role });
const segment = (id: string, executionType: "INTERNAL" | "OUTSOURCED", crew: boolean) => ({
  segment: {
    routePlanRouteId: id, sequenceNo: 2, route: { transportMode: "ROAD" as const },
    fromLocation: location("Border"), toLocation: location("Town"),
    plannedDepartureAt: "2030-01-02T10:00:00Z", plannedArrivalAt: "2030-01-02T12:00:00Z", executionType,
    vehicles: crew ? [{ vehicleId: "V1", vehicleCode: "V1", licensePlate: null, capacityHorses: 5 }] : [],
    outsourcing: null, driver: crew ? person("D2", "DRIVER") : null, escort: crew ? person("E2", "ESCORT") : null,
  },
  suggestedFromRoutePlanRouteId: crew ? "P2" : null,
  needsCrew: executionType === "INTERNAL" && !crew,
});
const plan = (segments: CrewPlan["segments"]): CrewPlan => ({
  routePlanId: "B", lastUpdatedAt: "2030-01-02T09:00:00Z", suggestedStartAt: "2030-01-02T10:00:00Z", segments,
});

describe("backup crew selection", () => {
  it("keeps the suggestion and overrides it field by field", () => {
    const item = segment("B1", "INTERNAL", true);
    expect(effectiveCrew(item)).toEqual({ driverId: "D2", escortId: "E2", vehicleIds: ["V1"] });
    expect(effectiveCrew(item, { routePlanRouteId: "B1", driverEmployeeId: "D5" }))
      .toEqual({ driverId: "D5", escortId: "E2", vehicleIds: ["V1"] });
  });

  it("asks for crew only on internal segments that miss someone or a vehicle", () => {
    const value = plan([segment("B1", "INTERNAL", true), segment("B2", "INTERNAL", false), segment("B3", "OUTSOURCED", false)]);
    expect(Object.keys(crewSelectionErrors(value, {}))).toEqual(["B2"]);
    expect(crewSelectionErrors(value, {
      B2: { routePlanRouteId: "B2", driverEmployeeId: "D5", escortEmployeeId: "E5", vehicleIds: ["V2"] },
    })).toEqual({});
  });
});

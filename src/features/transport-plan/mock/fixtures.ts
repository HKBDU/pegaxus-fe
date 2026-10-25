import type { ApprovedBookingDetail } from "../types";
import type { TransportPlanDetail, TransportPlanStatus } from "../types";
import { routePlanDetailSchema } from "@/features/route-view/schemas";

export const mockId = (group: number, index: number) =>
  `${group.toString(16).padStart(8, "0")}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
const timestamp = "2026-10-09T08:00:00Z";
const employee = (index: number, role: string) => ({
  employeeId: mockId(20, index),
  employeeCode: `EMP-DEMO-${index}`,
  fullName: `Demo ${role.replaceAll("_", " ")}`,
  role,
});
const locations = [
  {
    locationId: mockId(10, 1),
    locationName: "Demo Paris Stable",
    locationType: "STABLE",
    city: "Paris",
    country: "FR",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    locationId: mockId(10, 2),
    locationName: "Demo CDG Cargo",
    locationType: "AIRPORT",
    city: "Paris",
    country: "FR",
    latitude: 49.0097,
    longitude: 2.5479,
  },
  {
    locationId: mockId(10, 3),
    locationName: "Demo Heathrow",
    locationType: "AIRPORT",
    city: "London",
    country: "GB",
    latitude: 51.47,
    longitude: -0.4543,
  },
  {
    locationId: mockId(10, 4),
    locationName: "Demo Newmarket Stable",
    locationType: "STABLE",
    city: "Newmarket",
    country: "GB",
    latitude: 52.245,
    longitude: 0.407,
  },
];
const backupLocations = [
  locations[0],
  {
    locationId: mockId(10, 6),
    locationName: "Demo Dunkirk Port",
    locationType: "SEAPORT",
    city: "Dunkirk",
    country: "FR",
    latitude: 51.0344,
    longitude: 2.3768,
  },
  {
    locationId: mockId(10, 7),
    locationName: "Demo Dover Port",
    locationType: "SEAPORT",
    city: "Dover",
    country: "GB",
    latitude: 51.1279,
    longitude: 1.3134,
  },
  locations[3],
];
export const flow3MockLocations = [
  ...new Map(
    [...locations, ...backupLocations].map((location) => [
      location.locationId,
      location,
    ]),
  ).values(),
];
function routeFixture(
  index: number,
  plan: TransportPlanDetail,
  backup = false,
  missingCoordinates = false,
  empty = false,
) {
  const type = backup ? "BACKUP" : "PRIMARY";
  const departureDate = plan.plannedStartAt!.slice(0, 10);
  const stops = backup ? backupLocations : locations;
  const segments = empty
    ? []
    : [0, 1, 2].map((offset) => ({
        routePlanRouteId: mockId(9, index * 10 + offset),
        sequenceNo: offset + 1,
        routeType: type,
        route: {
          routeId: mockId(11, index * 10 + offset + 1),
          routeCode: `RT-DEMO-${index}-${offset + 1}`,
          routeName: `${stops[offset].locationName} to ${stops[offset + 1].locationName}`,
          transportMode: offset === 1 ? (backup ? "SEA" : "AIR") : "ROAD",
          distanceKm: (backup ? [240, 60, 350] : [48.2, 350, 214.2])[offset],
          estimatedDurationMinutes: [110, 90, 150][offset],
        },
        fromLocation: stops[offset],
        toLocation:
          missingCoordinates && offset === 2
            ? {
                ...stops[offset + 1],
                locationId: mockId(10, 5),
                latitude: null,
                longitude: null,
              }
            : stops[offset + 1],
        plannedDepartureAt: `${departureDate}T${["06", "14", "17"][offset]}:00:00Z`,
        plannedArrivalAt: `${departureDate}T${["08", "16", "20"][offset]}:00:00Z`,
        actualDepartureAt: null,
        actualArrivalAt: null,
        status: "PENDING",
        dwellAfterMinutes: offset === 2 ? null : [360, 60][offset],
        isOutsourced: offset === 1,
        vehicles:
          offset === 1
            ? []
            : [
                {
                  vehicleId: mockId(12, offset + 1),
                  vehicleCode: `VEH-DEMO-${offset + 1}`,
                  vehicleName: "Demo Horse Truck",
                  licensePlate: `DEMO-${offset + 1}`,
                  transportMode: "ROAD",
                  capacityHorses: 6,
                },
              ],
        outsourcing:
          offset === 1
            ? {
                provider: {
                  transportProviderId: mockId(13, backup ? 2 : 1),
                  providerCode: backup ? "PRV-DEMO-02" : "PRV-DEMO-01",
                  providerName: backup
                    ? "Demo Ferry Partner"
                    : "Demo Air Partner",
                  status: "ACTIVE",
                  supportedModes: [backup ? "SEA" : "AIR"],
                },
              }
            : null,
        driver: backup || offset === 1 ? null : employee(3, "DRIVER"),
        escort: backup || offset === 1 ? null : employee(4, "ESCORT"),
        note:
          offset === 1
            ? "Fictional outsourced segment for development only."
            : null,
      }));
  return routePlanDetailSchema.parse({
    routePlanId: mockId(4, index),
    routePlanCode: `RP-DEMO-${String(index).padStart(4, "0")}`,
    transportPlanId: plan.transportPlanId,
    bookingId: plan.booking.bookingId,
    bookingCode: plan.booking.bookingCode,
    routeType: type,
    status: index === 6 ? "CONFIRMED" : "DRAFT",
    isCrossBorder: true,
    // Explicit fixture metrics simulate server projections; the UI never derives totals.
    totalDistanceKm: empty ? 0 : backup ? 650 : 612.4,
    estimatedDurationMinutes: empty ? 0 : backup ? 840 : 750,
    plannedDepartureAt: `${departureDate}T06:00:00Z`,
    plannedArrivalAt: `${departureDate}T20:00:00Z`,
    segments,
    isPersonnelComplete: !backup && !empty,
    replacesSequenceNo: backup ? { from: 1, to: 3 } : null,
    legalReview:
      index === 6 || missingCoordinates
        ? {
            isFeasible: !missingCoordinates,
            note: missingCoordinates
              ? "Demo permit restriction; coordinator revision required."
              : "Demo legal feasibility confirmed.",
            blockedSegments: missingCoordinates ? [3] : [],
            reviewedBy: employee(1, "TRANSPORT_SPECIALIST"),
            reviewedAt: timestamp,
          }
        : null,
    routeNote: backup
      ? "Fictional backup option; not an operational itinerary."
      : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

// Additional emergency scenarios; none of the UC32/34/35/38 fixture IDs change.
export const emergencyMockIds = {
  backupPrimary: mockId(4, 20),
  backup: mockId(4, 21),
  backupPlan: mockId(3, 20),
  returnPrimary: mockId(4, 22),
  returnDraft: mockId(4, 23),
  returnBooking: mockId(1, 21),
  returnPlan: mockId(3, 21),
  confirmedReturnPrimary: mockId(4, 24),
  returnConfirmed: mockId(4, 25),
  confirmedReturnPlan: mockId(3, 22),
  belowThresholdBackup: mockId(4, 27),
  resourceConflictReturn: mockId(4, 29),
  returnActive: mockId(4, 31),
};

export function createFlow3Fixtures() {
  const statuses: (TransportPlanStatus | null)[] = [
    null,
    "DRAFT",
    "PENDING",
    "APPROVED",
    "APPROVED",
    "APPROVED",
    "APPROVED",
    "IN_PROGRESS",
  ];
  const bookings: ApprovedBookingDetail[] = statuses.map((status, offset) => {
    const index = offset + 1;
    return {
      bookingId: mockId(1, index),
      bookingCode: `REQ-DEMO-${String(index).padStart(4, "0")}`,
      status: "APPROVED",
      customer: {
        customerId: mockId(5, index),
        customerCode: `CUS-DEMO-${index}`,
        fullName: `Demo Racing Club ${index}`,
        phone: null,
      },
      originAddress: "Demo Paris Stable",
      originCountry: "FR",
      destinationAddress:
        index === 2 ? "Demo Lyon Stable" : "Demo Newmarket Stable",
      destinationCountry: index === 2 ? "FR" : "GB",
      isInternational: index !== 2,
      totalHorses: 2,
      requestedDepartureDate: `2026-10-${26 + index}`,
      requestedArrivalDate: "2026-11-05",
      specialRequirements: null,
      customerNote: null,
      horses: [1, 2].map((horse) => ({
        horseId: mockId(6, index * 10 + horse),
        horseName: `Demo Horse ${index}-${horse}`,
        sex: null,
        breed: null,
        microchipNumber: null,
        passportNumber: null,
        specialHandlingNotes: null,
      })),
      transport: {
        transportId: mockId(2, index),
        transportCode: `TR-DEMO-${index}`,
        status: status === "IN_PROGRESS" ? "IN_TRANSIT" : "PLANNING",
      },
      transportPlan: null,
      routePlans: [],
      complianceDossiers: [],
      complianceDossier:
        index % 2
          ? null
          : { complianceDossierId: mockId(7, index), status: "IN_PREPARATION" },
    };
  });
  // Dates span a month boundary without invalid date strings.
  bookings.forEach((booking, offset) => {
    if (booking.complianceDossier) {
      booking.complianceDossier = {
        ...booking.complianceDossier,
        dossierType: "MAIN",
        dossierCode: `CD-DEMO-${offset + 1}`,
      };
      booking.complianceDossiers = [booking.complianceDossier];
    }
    booking.requestedDepartureDate = new Date(Date.UTC(2026, 9, 27 + offset))
      .toISOString()
      .slice(0, 10);
  });
  const plans: TransportPlanDetail[] = bookings.flatMap((booking, offset) =>
    statuses[offset] && booking.transport
      ? [
          {
            transportPlanId: mockId(3, offset + 1),
            planCode: `TP-DEMO-${String(offset + 1).padStart(4, "0")}`,
            status: statuses[offset]!,
            booking: { ...booking, customerName: booking.customer.fullName },
            transport: booking.transport,
            complianceDossier: booking.complianceDossier,
            complianceDossiers: booking.complianceDossiers,
            plannedStartAt: `${booking.requestedDepartureDate}T06:00:00Z`,
            plannedEndAt: "2026-11-05T20:00:00Z",
            estimatedDistanceKm: offset === 1 ? null : 612.4,
            estimatedDurationMinutes: offset === 1 ? null : 750,
            planningNote:
              "Fictional development data; no payment or personnel operations.",
            assignedEmployees:
              statuses[offset] === "APPROVED"
                ? [
                    employee(1, "TRANSPORT_SPECIALIST"),
                    employee(2, "FLEET_ROUTE_COORDINATOR"),
                  ].map((item) => ({
                    ...item,
                    responsibility: item.role,
                    isPrimary: true,
                    assignedAt: timestamp,
                  }))
                : [],
            approvedBy: null,
            approvedAt: statuses[offset] === "APPROVED" ? timestamp : null,
            createdAt: `2026-10-0${offset + 1}T08:00:00Z`,
            updatedAt: timestamp,
          },
        ]
      : [],
  );
  const routes = [5, 6, 7, 8].map((index) =>
    routeFixture(
      index,
      plans.find((plan) => plan.transportPlanId === mockId(3, index))!,
      false,
      index === 7,
      index === 8,
    ),
  );
  routes.push(
    routeFixture(
      9,
      plans.find((plan) => plan.transportPlanId === mockId(3, 6))!,
      true,
    ),
  );
  // Additive scenarios; existing fixture IDs and preview scenarios stay intact.
  const partialBackup = routeFixture(
    10,
    plans.find((plan) => plan.transportPlanId === mockId(3, 6))!,
    true,
  );
  partialBackup.segments = partialBackup.segments
    .slice(0, 1)
    .map((segment) => ({
      ...segment,
      route: {
        ...segment.route,
        routeName: "Alternative Paris to CDG",
        distanceKm: 62,
        estimatedDurationMinutes: 100,
      },
      fromLocation: locations[0],
      toLocation: locations[1],
      dwellAfterMinutes: null,
    }));
  routes.push({
    ...partialBackup,
    replacesSequenceNo: { from: 1, to: 1 },
    totalDistanceKm: 62,
    estimatedDurationMinutes: 100,
  });
  const returnRoute = routeFixture(
    11,
    plans.find((plan) => plan.transportPlanId === mockId(3, 8))!,
  );
  routes.push({
    ...returnRoute,
    routeType: "RETURN",
    status: "DRAFT",
    routeNote:
      "Development-only emergency return; approval actions are not implemented.",
    isPersonnelComplete: true,
    segments: returnRoute.segments.slice(0, 1).map((segment) => ({
      ...segment,
      routeType: "RETURN",
      fromLocation: locations[1],
      toLocation: locations[0],
      route: {
        ...segment.route,
        routeName: "Return from CDG to Paris",
        distanceKm: 48.2,
        estimatedDurationMinutes: 110,
      },
      dwellAfterMinutes: null,
    })),
    totalDistanceKm: 48.2,
    estimatedDurationMinutes: 110,
  });
  for (const index of [20, 21, 22, 23, 24, 25]) {
    const booking: ApprovedBookingDetail = structuredClone(bookings[5]);
    Object.assign(booking, {
      bookingId: mockId(1, index),
      bookingCode: `REQ-DEMO-${index}`,
      transportPlan: null,
      routePlans: [],
      transport: {
        transportId: mockId(2, index),
        transportCode: `TR-DEMO-${index}`,
        status: "IN_TRANSIT",
      },
      complianceDossier: {
        complianceDossierId: mockId(7, index),
        dossierType: "MAIN",
        dossierCode: `CD-DEMO-${index}`,
        status: "APPROVED",
      },
    });
    booking.complianceDossiers = [booking.complianceDossier!];
    const plan: TransportPlanDetail = {
      ...structuredClone(
        plans.find((item) => item.transportPlanId === mockId(3, 6))!,
      ),
      transportPlanId: mockId(3, index),
      planCode: `TP-EMERGENCY-${index}`,
      status: "APPROVED",
      booking: { ...booking, customerName: booking.customer.fullName },
      transport: booking.transport!,
      complianceDossier: booking.complianceDossier,
      complianceDossiers: booking.complianceDossiers,
      planningNote: "Development-only UC48 in-transit scenario.",
    };
    bookings.push(booking);
    plans.push(plan);
    const primaryIndex = 20 + (index - 20) * 2;
    const primary = routeFixture(primaryIndex, plan);
    primary.status = "ACTIVE";
    primary.segments[0].status = "COMPLETED";
    primary.segments[0].actualDepartureAt =
      primary.segments[0].plannedDepartureAt;
    primary.segments[0].actualArrivalAt = primary.segments[0].plannedArrivalAt;
    routes.push(primary);
    const proposed = routeFixture(
      primaryIndex + 1,
      plan,
      index === 20 || index === 23,
    );
    proposed.status =
      index === 21 ? "DRAFT" : index === 25 ? "ACTIVE" : "CONFIRMED";
    proposed.legalReview =
      proposed.status !== "DRAFT"
        ? {
            isFeasible: true,
            note: "Mock TS feasibility confirmation.",
            blockedSegments: [],
            reviewedBy: employee(1, "TRANSPORT_SPECIALIST"),
            reviewedAt: timestamp,
          }
        : null;
    if (proposed.routeType === "BACKUP") {
      // Replacement starts after the completed first primary segment.
      proposed.segments = proposed.segments.slice(1).map((segment, offset) => ({
        ...segment,
        sequenceNo: offset + 1,
        ...(offset === 0
          ? { fromLocation: primary.segments[1].fromLocation }
          : {}),
      }));
      proposed.replacesSequenceNo = { from: 2, to: 3 };
      proposed.totalDistanceKm = 410;
      proposed.estimatedDurationMinutes = 600;
      proposed.routeNote =
        "Prepared contingency via Dover; replacement metrics only.";
    } else {
      const leg = proposed.segments[0];
      proposed.routeType = "RETURN";
      proposed.replacesSequenceNo = null;
      proposed.routeNote =
        "Emergency return due to unsafe conditions at the destination.";
      proposed.segments = [
        {
          ...leg,
          routeType: "RETURN",
          fromLocation: locations[1],
          toLocation: locations[0],
          dwellAfterMinutes: null,
          route: {
            ...leg.route,
            routeName: "Emergency return to Paris",
            distanceKm: 48.2,
            estimatedDurationMinutes: 110,
          },
        },
      ];
      proposed.totalDistanceKm = 48.2;
      proposed.estimatedDurationMinutes = 110;
    }
    routes.push(proposed);
  }
  return { bookings, plans, routes };
}

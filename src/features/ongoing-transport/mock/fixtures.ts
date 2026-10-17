import type { OngoingTransport } from "../types";

const destinations = [
  ["Chantilly Stables", "Lille Rest Stop"],
  ["Lille Rest Stop", "Calais BCP"],
  ["Dover Port", "Newmarket Stables"],
  ["Paris Airport", "London Airport"],
] as const;
const customers = [
  "Equine Racing Club",
  "Greenwood Racing Ltd",
  "Carter Equestrian Ltd",
  "Royal Stud Farm",
];

export const ongoingTransportFixtures: OngoingTransport[] = Array.from(
  { length: 48 },
  (_, index) => {
    const number = index + 1;
    const suffix = String(number).padStart(12, "0");
    const status = (["READY", "IN_TRANSIT", "COMPLETED"] as const)[index % 3];
    const [fromLocationName, toLocationName] =
      destinations[index % destinations.length];
    return {
      transportId: `00000061-0000-4000-8000-${suffix}`,
      transportCode: `TR-20261017-${String(number).padStart(4, "0")}`,
      bookingId: `00000062-0000-4000-8000-${suffix}`,
      bookingCode: `REQ-20261017-${String(number).padStart(4, "0")}`,
      customerName: customers[index % customers.length],
      status,
      routeType: (["PRIMARY", "BACKUP", "RETURN"] as const)[
        Math.floor(index / 3) % 3
      ],
      currentSegment:
        number === 3
          ? null
          : {
              routePlanRouteId: `00000063-0000-4000-8000-${suffix}`,
              displayOrder: (index % 4) + 1,
              fromLocationName,
              toLocationName,
              status: status === "READY" ? "PLANNED" : status,
            },
      horseCount: (index % 6) + 1,
      activeIncidentCount:
        status !== "COMPLETED" && index % 4 === 1 ? (index % 2) + 1 : 0,
      departureAt: new Date(
        Date.UTC(2026, 9, 17, 5 + Math.floor(index / 6), (index % 6) * 10),
      ).toISOString(),
    };
  },
);

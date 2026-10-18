import { AxiosError } from "axios";
import type {
  OngoingTransport,
  OverviewScenario,
  TransportAudience,
  TransportOverview,
} from "../types";
import { ongoingTransportFixtures } from "./fixtures";
import { waitForMockRequest } from "./service";

function buildOverview(
  item: OngoingTransport,
  audience: TransportAudience,
  typedDossiers: boolean,
): TransportOverview {
  const number = ongoingTransportFixtures.indexOf(item) + 1;
  const suffix = String(number).padStart(12, "0");
  const id = (prefix: string) => `${prefix}-0000-4000-8000-${suffix}`;
  const offsetTime = (minutes: number) =>
    item.departureAt === null
      ? null
      : new Date(Date.parse(item.departureAt) + minutes * 60_000).toISOString();
  const outsourced = number % 4 === 0;
  const totalSegments = item.currentSegment
    ? item.status === "COMPLETED"
      ? item.currentSegment.displayOrder
      : Math.max(5, item.currentSegment.displayOrder)
    : 0;
  const segment = item.currentSegment;
  const customer = audience === "customer";
  const plannedDeparture = offsetTime((segment?.displayOrder ?? 1) * 60);
  const plannedArrival = offsetTime((segment?.displayOrder ?? 1) * 60 + 90);
  const abnormal = number % 5 === 0;
  const noData = !abnormal && number % 3 === 1 && !outsourced;
  const health = {
    total: item.horseCount,
    normal: noData
      ? 0
      : abnormal
        ? Math.max(0, item.horseCount - 3)
        : item.horseCount,
    observationRequired: abnormal && item.horseCount >= 1 ? 1 : 0,
    atRisk: abnormal && item.horseCount >= 2 ? 1 : 0,
    critical: abnormal && item.horseCount >= 3 ? 1 : 0,
    noData: noData ? item.horseCount : 0,
  };
  const serverTime = new Date().toISOString();
  return {
    serverTime,
    transport: {
      transportId: item.transportId,
      transportCode: item.transportCode,
      status: item.status,
      actualDepartureAt: item.status === "READY" ? null : item.departureAt,
      actualArrivalAt: item.status === "COMPLETED" ? offsetTime(360) : null,
      completedAt: item.status === "COMPLETED" ? offsetTime(375) : null,
    },
    booking: {
      bookingId: item.bookingId,
      bookingCode: item.bookingCode,
      customerName: item.customerName,
      originAddress: "Chantilly Stables, Chantilly",
      originCountry: "France",
      destinationAddress: "Newmarket Stables, Newmarket",
      destinationCountry: "United Kingdom",
    },
    routeType: item.routeType,
    routePlan: segment
      ? {
          routePlanId: id("00000064"),
          routePlanCode: `RP-20261017-${String(number).padStart(4, "0")}`,
          status:
            item.status === "READY"
              ? "CONFIRMED"
              : item.status === "COMPLETED"
                ? "COMPLETED"
                : "ACTIVE",
        }
      : null,
    currentSegment: segment
      ? {
          routePlanRouteId: segment.routePlanRouteId,
          routePlanId: id("00000064"),
          routePlanCode: `RP-20261017-${String(number).padStart(4, "0")}`,
          sequenceNo: segment.displayOrder,
          displayOrder: segment.displayOrder,
          routeType: item.routeType!,
          transportMode: outsourced ? "AIR" : "ROAD",
          fromLocation: {
            locationId: id("00000065"),
            locationName: segment.fromLocationName,
            locationType: null,
            city: null,
            country: "France",
            latitude: null,
            longitude: null,
          },
          toLocation: {
            locationId: id("00000066"),
            locationName: segment.toLocationName,
            locationType: null,
            city: null,
            country: "United Kingdom",
            latitude: null,
            longitude: null,
          },
          distanceKm: outsourced ? null : 110.5,
          status: segment.status,
          isCurrent: true,
          plannedDepartureAt: plannedDeparture,
          plannedArrivalAt: plannedArrival,
          actualDepartureAt: item.status === "READY" ? null : plannedDeparture,
          actualArrivalAt: item.status === "COMPLETED" ? plannedArrival : null,
          driver: outsourced
            ? null
            : {
                employeeId: id("00000067"),
                employeeCode: "EMP-DR-0042",
                fullName: "Alex Laurent",
                role: "DRIVER",
                phone: customer ? null : "+33 6 24 89 10 44",
              },
          escort: outsourced
            ? null
            : {
                employeeId: id("00000068"),
                employeeCode: "EMP-ES-0087",
                fullName: "Emma Fischer",
                role: "ESCORT",
                phone: customer ? null : "+33 6 74 11 90 82",
              },
          isOutsourced: outsourced,
          provider: outsourced
            ? {
                transportProviderId: id("00000069"),
                providerName: "Pegasus Air Transport",
                serviceType: "Air freight",
                providerReference: `FL-${1000 + number}`,
              }
            : null,
          vehicles:
            outsourced || customer
              ? []
              : [
                  {
                    vehicleId: id("00000070"),
                    vehicleCode: "VH-0003",
                    licensePlate: number % 2 === 0 ? "AB-123-CD" : null,
                  },
                ],
          note: customer
            ? null
            : "Keep the original travel documents with the crew.",
          updatedAt: item.departureAt ?? serverTime,
        }
      : null,
    totalSegments,
    completedSegments:
      item.status === "COMPLETED"
        ? totalSegments
        : item.status === "READY"
          ? 0
          : Math.max(0, (segment?.displayOrder ?? 1) - 1),
    departureAt: item.departureAt,
    etaAt: offsetTime(360),
    horseCount: item.horseCount,
    horseHealthSummary: health,
    complianceDossiers:
      number % 4 === 1 && !typedDossiers
        ? []
        : [
            {
              complianceDossierId: id("00000071"),
              dossierCode: `CDOS-20261017-${String(number).padStart(4, "0")}`,
              dossierType: typedDossiers ? "MAIN" : null,
              status: "APPROVED",
            },
            ...(typedDossiers
              ? [
                  {
                    complianceDossierId: id("00000072"),
                    dossierCode: `CDOS-EXTRA-${String(number).padStart(4, "0")}`,
                    dossierType: "EXTRA" as const,
                    status: "PENDING" as const,
                  },
                ]
              : []),
          ],
    activeIncidents: Array.from(
      { length: item.activeIncidentCount },
      (_, incidentIndex) => ({
        incidentReportId: `${id("00000073")}-${incidentIndex}`,
        incidentCode: `INC-${number}-${incidentIndex + 1}`,
        category: (
          ["ROUTE_CHANGE", "VEHICLE", "HORSE_HEALTH", "BOTH"] as const
        )[(number + incidentIndex) % 4],
        status: incidentIndex % 2 === 0 ? "REPORTED" : "PENDING",
        title:
          incidentIndex % 2 === 0
            ? "Route conditions require attention"
            : "Vehicle inspection at the rest stop",
        occurredAt: offsetTime(120 + incidentIndex * 15) ?? serverTime,
        ...(!customer
          ? {
              severity:
                incidentIndex % 2 === 0
                  ? ("HIGH" as const)
                  : ("MEDIUM" as const),
              description:
                "The operations team is reviewing the report with the assigned crew.",
            }
          : {}),
      }),
    ),
    canViewGpsTab: audience !== "crew",
  };
}

export async function getMockTransportOverview(
  transportId: string,
  audience: TransportAudience,
  scenario: OverviewScenario,
  signal?: AbortSignal,
) {
  await waitForMockRequest(signal);
  signal?.throwIfAborted();
  if (scenario === "network-error")
    throw new AxiosError(
      "Development preview: network unavailable",
      "ERR_NETWORK",
    );
  const item = ongoingTransportFixtures.find(
    (transport) => transport.transportId === transportId,
  );
  const failure = (code: number, errorCode: string, message: string) => ({
    isSuccess: false,
    code,
    errorCode,
    message,
    value: null,
  });
  if (!item || scenario === "not-found")
    return failure(404, "TRANSPORT_NOT_FOUND", "Transport not found");
  if (scenario === "forbidden")
    return failure(403, "FORBIDDEN", "You are not assigned to this transport");
  if (scenario === "invalid-status")
    return failure(
      409,
      "INVALID_TRANSPORT_STATUS",
      "The transport has not started yet or has been cancelled",
    );
  if (scenario === "api-error")
    return failure(500, "SYSTEM_ERROR", "Development preview: API failure");
  return {
    isSuccess: true,
    code: 200,
    message: "Transport overview retrieved successfully",
    value: buildOverview(item, audience, scenario === "typed-dossiers"),
  };
}

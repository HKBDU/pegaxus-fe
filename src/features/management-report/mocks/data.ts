import type {
  IncidentClaimReport,
  LookupKind,
  OnTimeReport,
  ReportFilters,
} from "../schemas";

export const demoId = (n: number) =>
  `d6000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const day = 86_400_000;
const now = new Date();
const anchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
export const generatedAt = new Date(
  anchor + 24 * day + 12 * 3_600_000,
).toISOString();
const iso = (time: number) => new Date(time).toISOString();
export const round = (n: number) =>
  (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 10)) / 10;
export const average = (values: number[]) =>
  values.length
    ? round(values.reduce((a, b) => a + b, 0) / values.length)
    : null;
export const percent = (part: number, whole: number) =>
  whole ? round((part * 100) / whole) : null;
export const metric = (value: number | null, previous: number | null) => ({
  value,
  previous,
  change: value === null || previous === null ? null : round(value - previous),
});
export const countMetric = (
  value: number,
  previous: number,
  hasBefore: boolean,
) => ({ value, previous, change: hasBefore ? value - previous : null });

export const demoRoutes = [
  {
    routeId: demoId(10),
    routeCode: "RT-DEMO-01",
    routeName: "Demo France → Germany",
  },
  {
    routeId: demoId(11),
    routeCode: "RT-DEMO-02",
    routeName: "Demo Germany → Netherlands",
  },
  {
    routeId: demoId(12),
    routeCode: "RT-DEMO-03",
    routeName: "Demo Netherlands → France",
  },
];
export const demoProviders = [
  {
    transportProviderId: demoId(20),
    providerCode: "TP-DEMO-01",
    providerName: "Atlas Demo Logistics",
    status: "ACTIVE",
  },
  {
    transportProviderId: demoId(21),
    providerCode: "TP-DEMO-02",
    providerName: "Northstar Demo Transport",
    status: "INACTIVE",
  },
];
export const demoDrivers = [0, 1].map((i) => ({
  employeeId: demoId(30 + i),
  employeeCode: `DR-DEMO-0${i + 1}`,
  fullName: `Demo Driver ${i + 1}`,
  role: "DRIVER",
  accountStatus: "ACTIVE",
  workingStatus: i ? "INACTIVE" : "ACTIVE",
}));
export const demoVehicles = [0, 1, 2].map((i) => ({
  vehicleId: demoId(40 + i),
  vehicleCode: `VH-DEMO-0${i + 1}`,
  vehicleName: `Demo horse carrier ${i + 1}`,
  licensePlate: i === 1 ? null : `DEMO-0${i + 1}`,
  status: i === 2 ? "MAINTENANCE" : "AVAILABLE",
}));
export const demoHorseIds = [demoId(50), demoId(51), demoId(52)];

export type DemoTransport = {
  transportId: string;
  transportCode: string;
  bookingCode: string;
  originCountry: string;
  destinationCountry: string;
  routeId: string;
  providerId: string | null;
  driverId: string;
  completedAt: string;
  departure: string | null;
  arrival: string | null;
  plannedEnd: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  deltaMinutes: number;
  delayMinutes: number;
  bucket: OnTimeReport["items"][number]["bucket"];
};

export const demoTransports: DemoTransport[] = [-1, 0].flatMap(
  (offset, cycle) => {
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1);
    return Array.from({ length: 32 }, (_, index) => {
      const arrival = start + (index % 24) * day + 16 * 3_600_000;
      const estimatedMinutes = cycle ? 4320 : 5760;
      const deltaMinutes = [-2880, -720, 0, 720, 2160, 3600][index % 6];
      const actualMinutes = estimatedMinutes + deltaMinutes;
      const delayMinutes = [0, 45, 90, 240, -30, 180][(index + cycle) % 6];
      const pair = [
        ["France", "Germany"],
        ["Germany", "Netherlands"],
        ["Netherlands", "France"],
      ][index % 3];
      return {
        transportId: demoId(1000 + cycle * 100 + index),
        transportCode: `TR-DEMO-${cycle ? "CUR" : "PREV"}-${String(index + 1).padStart(3, "0")}`,
        bookingCode: `BK-DEMO-${cycle}-${String(index + 1).padStart(3, "0")}`,
        originCountry: pair[0],
        destinationCountry: pair[1],
        routeId: demoRoutes[index % 3].routeId,
        providerId:
          index % 3 === 0 ? null : demoProviders[index % 2].transportProviderId,
        driverId: demoDrivers[index % 2].employeeId,
        completedAt: iso(arrival + 3_600_000),
        departure: index === 30 ? null : iso(arrival - actualMinutes * 60_000),
        arrival: index === 29 ? null : iso(arrival),
        plannedEnd: index === 28 ? null : iso(arrival - delayMinutes * 60_000),
        estimatedMinutes: index === 31 ? null : estimatedMinutes,
        actualMinutes,
        deltaMinutes,
        delayMinutes,
        bucket:
          delayMinutes <= 60
            ? "ON_TIME"
            : delayMinutes < 180
              ? "MINOR_DELAY"
              : "MAJOR_DELAY",
      };
    });
  },
);

type IncidentRow = IncidentClaimReport["items"][number];
type CostCategory =
  IncidentClaimReport["emergencyCostByCategory"][number]["category"];
export type DemoIncident = {
  id: string;
  code: string;
  occurredAt: string;
  transport: DemoTransport | null;
  category: IncidentRow["category"];
  severity: IncidentRow["severity"];
  status: IncidentRow["status"];
  types: NonNullable<IncidentRow["incidentType"]>[];
  vehicleId: string | null;
  horseId: string | null;
  repairRequired: boolean;
  costs: { category: CostCategory; amount: number; approved: boolean }[];
};
const categories: IncidentRow["category"][] = [
  "VEHICLE",
  "HORSE_HEALTH",
  "BOTH",
  "ROUTE_CHANGE",
];
const severities: IncidentRow["severity"][] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];
const vehicleTypes = [
  "BREAKDOWN",
  "ACCIDENT",
  "TIRE_DAMAGE",
  "ENGINE_FAILURE",
  "TEMPERATURE_CONTROL_FAILURE",
  "EQUIPMENT_FAILURE",
] as const;
const horseTypes = [
  "INJURY",
  "DEHYDRATION",
  "RESPIRATORY_ISSUE",
  "FEVER",
  "STRESS",
  "COLIC",
  "FATIGUE",
  "OTHER",
] as const;
const costCategories: CostCategory[] = [
  "VETERINARY",
  "MEDICATION",
  "VEHICLE_REPAIR",
  "TOWING",
  "REPLACEMENT_VEHICLE",
  "EMERGENCY_STABLE",
  "ROUTE_CHANGE",
  "ACCOMMODATION",
  "OTHER",
];
export const demoIncidents: DemoIncident[] = [0, 1].flatMap((cycle) =>
  Array.from({ length: 48 }, (_, index) => {
    const transport =
      index % 11 === 0 ? null : demoTransports[cycle * 32 + (index % 32)];
    const category = categories[index % 4];
    const hasVehicle = category === "VEHICLE" || category === "BOTH";
    const hasHorse = category === "HORSE_HEALTH" || category === "BOTH";
    const occurredAt = transport
      ? Date.parse(transport.completedAt) - 18 * 3_600_000
      : Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + cycle - 1,
          5 + (index % 20),
          8,
        );
    return {
      id: demoId(2000 + cycle * 100 + index),
      code: `IR-DEMO-${cycle}-${String(index + 1).padStart(3, "0")}`,
      occurredAt: iso(occurredAt),
      transport,
      category,
      severity: severities[Math.floor(index / 4) % 4],
      status:
        index % 13 === 0
          ? "CANCELLED"
          : index % 3 === 0
            ? "RESOLVED"
            : index % 3 === 1
              ? "REPORTED"
              : "PENDING",
      types: [
        ...(hasVehicle ? [vehicleTypes[index % 6]] : []),
        ...(hasHorse ? [horseTypes[index % 8]] : []),
      ],
      vehicleId: hasVehicle ? demoVehicles[index % 3].vehicleId : null,
      horseId: hasHorse ? demoHorseIds[index % 3] : null,
      repairRequired: hasVehicle && index % 3 === 0,
      costs:
        index % 2 === 0
          ? [
              {
                category: costCategories[Math.floor(index / 2) % 9],
                amount: 250_000 * (1 + (index % 6)),
                approved: index % 7 !== 0,
              },
            ]
          : [],
    };
  }),
);
export const demoClaims = [0, 1].flatMap((cycle) =>
  Array.from({ length: 20 }, (_, index) => ({
    code: `CL-DEMO-${cycle}-${String(index + 1).padStart(3, "0")}`,
    transport: demoTransports[cycle * 32 + ((index * 3) % 32)],
    submittedAt: iso(
      Date.parse(demoTransports[cycle * 32 + ((index * 3) % 32)].completedAt) +
        (index % 3) * day,
    ),
    type: (
      [
        "HORSE_INJURY",
        "HORSE_HEALTH",
        "LOSS",
        "DAMAGE",
        "DELAY",
        "DOCUMENT_ISSUE",
        "SERVICE_ISSUE",
        "OTHER",
      ] as const
    )[index % 8],
    status: (
      ["PENDING", "APPROVED", "REJECTED", "RESOLVED", "CANCELLED"] as const
    )[index % 5],
  })),
);

export type Cohort = Pick<
  ReportFilters,
  "originCountry" | "destinationCountry" | "routeId" | "transportProviderId"
> & { driverEmployeeId?: string };
export function matchesTransport(row: DemoTransport, filters: Cohort) {
  return (
    (!filters.originCountry ||
      row.originCountry.toLowerCase() ===
        filters.originCountry.toLowerCase()) &&
    (!filters.destinationCountry ||
      row.destinationCountry.toLowerCase() ===
        filters.destinationCountry.toLowerCase()) &&
    (!filters.routeId ||
      row.routeId.toLowerCase() === filters.routeId.toLowerCase()) &&
    (!filters.transportProviderId ||
      row.providerId?.toLowerCase() ===
        filters.transportProviderId.toLowerCase()) &&
    (!filters.driverEmployeeId ||
      row.driverId.toLowerCase() === filters.driverEmployeeId.toLowerCase())
  );
}
export function reportPeriod(filters: { dateFrom: string; dateTo: string }) {
  const from = Date.parse(filters.dateFrom + "T00:00:00Z");
  const to = Date.parse(filters.dateTo + "T00:00:00Z");
  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    previousDateFrom: iso(from - (to - from + day)).slice(0, 10),
    previousDateTo: iso(from - day).slice(0, 10),
  };
}
export const inPeriod = (stamp: string, from: string, to: string) =>
  Date.parse(stamp) >= Date.parse(from + "T00:00:00Z") &&
  Date.parse(stamp) < Date.parse(to + "T00:00:00Z") + day;
export function pageRows<T>(
  rows: T[],
  filter: { pageIndex: number; pageSize: number },
) {
  return {
    items: rows.slice(
      (filter.pageIndex - 1) * filter.pageSize,
      filter.pageIndex * filter.pageSize,
    ),
    pageIndex: filter.pageIndex,
    pageSize: filter.pageSize,
    totalItems: rows.length,
    totalPages: Math.ceil(rows.length / filter.pageSize),
  };
}
export function groupCount<T, K extends string>(rows: T[], key: (row: T) => K) {
  const counts = new Map<K, number>();
  for (const row of rows) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts, ([key, count]) => ({ key, count }));
}
export function getDemoLookup(
  kind: LookupKind,
  search: string,
  pageIndex: number,
) {
  const catalog =
    kind === "route"
      ? demoRoutes
      : kind === "provider"
        ? demoProviders
        : kind === "driver"
          ? demoDrivers
          : demoVehicles;
  return pageRows(
    catalog.filter((row) =>
      Object.values(row).some(
        (value) =>
          typeof value === "string" &&
          value.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    ),
    { pageIndex, pageSize: 20 },
  );
}

import { canAccess, normalizeRole } from "@/features/auth/access-control";
import type { AuthPrincipal } from "@/features/auth/types";
import { useAuthStore } from "@/features/auth/store";
import {
  emergencyCostCreateSchema,
  type EmergencyCostCreateInput,
  type EmergencyCostDetail,
  type EmergencyCostIncident,
  type EmergencyCostParams,
  type EmergencyCostRequestDto,
} from "../schemas";

export interface MockCostEvidence {
  publicId: string;
  file: File;
}

export interface CostEvidencePreview {
  id: string;
  url: string;
  caption: string;
}

type Actor = { principal: AuthPrincipal; sessionVersion: number };
type MockIncident = EmergencyCostIncident & { assignedRoles: string[] };
type MockRecord = {
  request: EmergencyCostRequestDto;
  evidence: CostEvidencePreview[];
};
type Repository = {
  incidents: MockIncident[];
  records: MockRecord[];
  sequence: number;
};

const uuid = (value: number) =>
  `ec000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
export const emergencyCostMockIds = {
  reportedIncident: uuid(1),
  pendingIncident: uuid(2),
  resolvedIncident: uuid(3),
  cancelledIncident: uuid(4),
  unassignedIncident: uuid(5),
  completedTransportIncident: uuid(6),
  pendingRequest: uuid(101),
  approvedRequest: uuid(102),
};
const seededTime = "2026-10-21T08:00:00Z";
const creatorRoles = ["DRIVER", "ESCORT", "FLEET_ROUTE_COORDINATOR"];
const readerRoles = [
  "LOGISTICS_MANAGER",
  "TRANSPORT_SPECIALIST",
  ...creatorRoles,
];

export class MockEmergencyCostError extends Error {
  readonly status: number;
  readonly errorCode: string;
  constructor(status: number, code: string) {
    super("Mock emergency cost operation failed.");
    this.status = status;
    this.errorCode = code;
  }
}

function requireReader(actor: Actor) {
  if (
    canAccess(actor.principal, { anyRole: ["CUSTOMER"] }) ||
    !canAccess(actor.principal, { anyRole: readerRoles })
  )
    throw new MockEmergencyCostError(403, "FORBIDDEN");
}

function visible(incident: MockIncident, actor: Actor) {
  return (
    canAccess(actor.principal, {
      anyRole: ["LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST"],
    }) ||
    actor.principal.roles
      .map(normalizeRole)
      .some((role) => incident.assignedRoles.includes(role))
  );
}

function seed(): Repository {
  const incidents: MockIncident[] = [
    "REPORTED",
    "PENDING",
    "RESOLVED",
    "CANCELLED",
    "REPORTED",
    "REPORTED",
  ].map((status, index) => ({
    incidentReportId: uuid(index + 1),
    incidentCode: `INC-20261021-${String(index + 1).padStart(4, "0")}`,
    title:
      index === 1
        ? "Synthetic horse-health assessment"
        : "Synthetic vehicle assistance",
    category: index === 1 ? "HORSE_HEALTH" : "VEHICLE",
    severity: index === 1 ? "CRITICAL" : "HIGH",
    status: status as EmergencyCostIncident["status"],
    transport: {
      transportId: uuid(20 + index),
      transportCode: `TR-20261021-${String(index + 1).padStart(4, "0")}`,
      status: index === 5 ? "COMPLETED" : "IN_TRANSIT",
    },
    availableActions: [],
    assignedRoles: index === 4 ? [] : [...creatorRoles],
  }));
  const statuses = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "PENDING",
    "PENDING",
    "PENDING",
    "APPROVED",
    "PENDING",
    "REJECTED",
    "PENDING",
    "CANCELLED",
  ] as const;
  const categories = [
    "TOWING",
    "VETERINARY",
    "MEDICATION",
    "VEHICLE_REPAIR",
    "REPLACEMENT_VEHICLE",
    "EMERGENCY_STABLE",
    "ROUTE_CHANGE",
    "ACCOMMODATION",
    "OTHER",
  ] as const;
  const records: MockRecord[] = statuses.map((status, index) => {
    const incident =
      status === "CANCELLED"
        ? incidents[3]
        : status === "REJECTED"
          ? incidents[2]
          : status === "APPROVED"
            ? incidents[1]
            : incidents[index % 2];
    const requestedAt = new Date(
      Date.UTC(2026, 9, 21, 7, index * 2),
    ).toISOString();
    const amount = (index + 1) * 1_500_000;
    return {
      request: {
        emergencyCostRequestId: uuid(101 + index),
        requestCode: `ECR-20261021-${String(index + 1).padStart(4, "0")}`,
        incident: { ...incident, transportId: incident.transport.transportId },
        category: categories[index % categories.length],
        requestedAmount: amount,
        approvedAmount:
          status === "APPROVED" ? amount : status === "REJECTED" ? 0 : null,
        currency: "VND",
        status,
        requestedAt,
        createdAt: requestedAt,
        updatedAt: seededTime,
        description:
          "Synthetic service quotation for emergency transport assistance.",
        justification:
          "Immediate assistance is necessary to protect the horses and crew.",
        invoiceRequired: false,
        requestedBy:
          index === 0
            ? null
            : {
                employeeId: uuid(60 + (index % 3)),
                employeeCode: `EMP-MOCK-${(index % 3) + 1}`,
                fullName: `Synthetic ${creatorRoles[index % 3].toLowerCase()}`,
                role: creatorRoles[index % 3],
              },
        decision:
          status === "APPROVED" || status === "REJECTED"
            ? {
                decision: status,
                approvedAmount: status === "REJECTED" ? 0 : amount,
                decisionReason:
                  status === "REJECTED"
                    ? "Synthetic insurance cover makes this request unnecessary."
                    : "Synthetic quotation reviewed and accepted.",
                decidedBy: {
                  employeeId: uuid(70),
                  employeeCode: "EMP-MOCK-LM",
                  fullName: "Synthetic logistics manager",
                  role: "LOGISTICS_MANAGER",
                },
                decidedAt: seededTime,
              }
            : null,
        cancelledAt: status === "CANCELLED" ? seededTime : null,
        cancellationReason:
          status === "CANCELLED"
            ? "Synthetic alternative arranged without this expense."
            : null,
      },
      evidence:
        index === 1
          ? [
              {
                id: "mock-evidence:seed-quotation",
                caption: "MOCK quotation illustration — not a stored receipt",
                url: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#faf7f0"/><rect x="64" y="30" width="352" height="260" rx="4" fill="white" stroke="#ddd"/><text x="92" y="78" font-family="sans-serif" font-size="22" fill="#181818">MOCK QUOTATION</text><path d="M92 108h296M92 150h180M92 185h240M92 220h200" stroke="#ddd" stroke-width="8"/><text x="92" y="262" font-family="sans-serif" font-size="14" fill="#9a5700">Synthetic demo — no financial evidence</text></svg>')}`,
              },
            ]
          : [],
    };
  });
  return { incidents, records, sequence: 200 };
}

let activeKey = "";
let activeRepository: Repository | undefined;
function clearRepository() {
  activeRepository?.records.forEach((record) =>
    record.evidence.forEach((photo) => {
      if (photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
    }),
  );
  activeKey = "";
  activeRepository = undefined;
}

const unsubscribe = useAuthStore.subscribe((state) => {
  const nextKey =
    state.principal && state.accessToken
      ? JSON.stringify([
          state.principal.id,
          state.sessionVersion,
          state.principal.roles.map(normalizeRole).sort(),
        ])
      : "";
  if (activeKey && activeKey !== nextKey) clearRepository();
});

import.meta.hot?.dispose(() => {
  unsubscribe();
  clearRepository();
});

function repository(actor: Actor) {
  requireReader(actor);
  const key = JSON.stringify([
    actor.principal.id,
    actor.sessionVersion,
    actor.principal.roles.map(normalizeRole).sort(),
  ]);
  if (key !== activeKey || !activeRepository) {
    clearRepository();
    activeKey = key;
    activeRepository = seed();
  }
  return activeRepository;
}

function getIncident(id: string, actor: Actor) {
  const incident = repository(actor).incidents.find(
    (entry) => entry.incidentReportId.toLowerCase() === id.toLowerCase(),
  );
  if (!incident) throw new MockEmergencyCostError(404, "INCIDENT_NOT_FOUND");
  if (!visible(incident, actor))
    throw new MockEmergencyCostError(403, "FORBIDDEN");
  return incident;
}

function incidentContext(id: string, actor: Actor): EmergencyCostIncident {
  const incident = getIncident(id, actor);
  const { assignedRoles: _assignedRoles, ...context } = incident;
  return {
    ...context,
    availableActions:
      canAccess(actor.principal, { anyRole: creatorRoles }) &&
      ["REPORTED", "PENDING"].includes(incident.status) &&
      incident.transport.status === "IN_TRANSIT"
        ? ["REQUEST_COST"]
        : [],
  };
}

function list(params: EmergencyCostParams, actor: Actor) {
  const store = repository(actor);
  const scoped = store.records.filter(({ request }) => {
    const incident = store.incidents.find(
      (entry) => entry.incidentReportId === request.incident.incidentReportId,
    )!;
    return (
      visible(incident, actor) &&
      (!params.incidentReportId ||
        request.incident.incidentReportId.toLowerCase() ===
          params.incidentReportId.toLowerCase()) &&
      (!params.transportId ||
        incident.transport.transportId.toLowerCase() ===
          params.transportId.toLowerCase())
    );
  });
  const items = scoped
    .filter(
      ({ request }) =>
        (!params.status || params.status.split(",").includes(request.status)) &&
        (!params.category || request.category === params.category) &&
        (!params.fromDate ||
          request.requestedAt.slice(0, 10) >= params.fromDate) &&
        (!params.toDate || request.requestedAt.slice(0, 10) <= params.toDate) &&
        (!params.keyword ||
          `${request.requestCode} ${request.incident.incidentCode}`
            .toLowerCase()
            .includes(params.keyword.toLowerCase())),
    )
    .sort(
      (a, b) =>
        (a.request.requestedAt.localeCompare(b.request.requestedAt) ||
          a.request.requestCode.localeCompare(b.request.requestCode)) *
        (params.sortBy === "requestedAt:asc" ? 1 : -1),
    );
  return {
    serverTime: new Date().toISOString(),
    counts: Object.fromEntries(
      ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((status) => [
        status.toLowerCase(),
        scoped.filter(({ request }) => request.status === status).length,
      ]),
    ),
    items: items
      .slice(
        (params.pageIndex - 1) * params.pageSize,
        params.pageIndex * params.pageSize,
      )
      .map(({ request }) => ({
        ...request,
        incident: {
          ...request.incident,
          status: store.incidents.find(
            (entry) =>
              entry.incidentReportId === request.incident.incidentReportId,
          )!.status,
        },
        transportCode: store.incidents.find(
          (entry) =>
            entry.incidentReportId === request.incident.incidentReportId,
        )!.transport.transportCode,
      })),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / params.pageSize),
  };
}

function create(
  id: string,
  input: EmergencyCostCreateInput,
  photos: readonly MockCostEvidence[],
  actor: Actor,
) {
  const store = repository(actor);
  const incident = getIncident(id, actor);
  if (!canAccess(actor.principal, { anyRole: creatorRoles }))
    throw new MockEmergencyCostError(403, "FORBIDDEN");
  if (!["REPORTED", "PENDING"].includes(incident.status))
    throw new MockEmergencyCostError(422, "INVALID_INCIDENT_STATUS");
  if (incident.transport.status !== "IN_TRANSIT")
    throw new MockEmergencyCostError(409, "INVALID_TRANSPORT_STATUS");
  const data = emergencyCostCreateSchema.parse(input);
  if (
    (data.photoFiles?.length ?? 0) !== photos.length ||
    photos.length > 5 ||
    photos.some(
      (photo) =>
        !photo.publicId.startsWith("mock-evidence:") ||
        !["image/jpeg", "image/png"].includes(photo.file.type) ||
        photo.file.size > 5 * 1024 * 1024 ||
        photo.file.size === 0 ||
        !data.photoFiles?.some((ref) => ref.publicId === photo.publicId),
    )
  )
    throw new MockEmergencyCostError(400, "INVALID_IMAGE");
  const role = actor.principal.roles
    .map(normalizeRole)
    .find((entry) => creatorRoles.includes(entry))!;
  if (role === "FLEET_ROUTE_COORDINATOR" && incident.status === "REPORTED")
    incident.status = "PENDING";
  const now = new Date().toISOString();
  store.sequence += 1;
  const request: EmergencyCostRequestDto = {
    ...data,
    emergencyCostRequestId: uuid(store.sequence),
    requestCode: `ECR-20261021-${String(store.sequence).padStart(4, "0")}`,
    incident: { ...incident, transportId: incident.transport.transportId },
    requestedAmount: data.requestedAmount,
    approvedAmount: null,
    currency: "VND",
    status: "PENDING",
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
    requestedBy: {
      employeeId: uuid(60 + creatorRoles.indexOf(role)),
      employeeCode: "EMP-MOCK-CREATOR",
      fullName: `Synthetic ${role.toLowerCase()}`,
      role,
    },
    decision: null,
    invoiceRequired: data.invoiceRequired ?? false,
    cancelledAt: null,
    cancellationReason: null,
  };
  store.records.push({
    request,
    evidence: photos.map((photo) => ({
      id: photo.publicId,
      url: URL.createObjectURL(photo.file),
      caption: `${photo.file.name} — MOCK, local only`,
    })),
  });
  return request;
}

function getDetail(
  id: string,
  actor: Actor,
): { request: EmergencyCostDetail; evidence: CostEvidencePreview[] } {
  const store = repository(actor);
  const record = store.records.find(
    ({ request }) =>
      request.emergencyCostRequestId.toLowerCase() === id.toLowerCase(),
  );
  if (!record)
    throw new MockEmergencyCostError(404, "EMERGENCY_COST_NOT_FOUND");
  const incident = getIncident(record.request.incident.incidentReportId, actor);
  const {
    assignedRoles: _assignedRoles,
    transport: _transport,
    availableActions: _availableActions,
    ...summary
  } = incident;
  return {
    request: {
      ...record.request,
      incident: { ...record.request.incident, status: incident.status },
      availableActions:
        record.request.status !== "PENDING"
          ? []
          : canAccess(actor.principal, { anyRole: ["LOGISTICS_MANAGER"] })
            ? ["DECIDE"]
            : canAccess(actor.principal, { anyRole: creatorRoles })
              ? ["CANCEL"]
              : [],
      incidentSummary: {
        ...summary,
        occurredAt: "2026-10-21T06:40:00Z",
        location: {
          locationId: uuid(40),
          locationName: "Synthetic rest stop",
          country: "FR",
          city: "Demo City",
        },
        vehicle: {
          vehicleId: uuid(41),
          vehicleCode: "VH-MOCK-001",
          licensePlate: "MOCK-001",
          status: "OUT_OF_SERVICE",
        },
      },
      otherRequests: store.records
        .filter(
          (entry) =>
            entry !== record &&
            entry.request.incident.incidentReportId ===
              incident.incidentReportId,
        )
        .map(({ request }) => request),
      horseHealthSummary: {
        total: 5,
        normal: 4,
        observationRequired: 0,
        atRisk: 1,
        critical: 0,
        noData: 0,
      },
      currentRoute: {
        routePlanId: uuid(30),
        routePlanCode: "RP-20261021-0001",
        routeType: "PRIMARY",
        status: "ACTIVE",
      },
      serverTime: new Date().toISOString(),
    },
    evidence: record.evidence.map((photo) => ({ ...photo })),
  };
}

export const emergencyCostMockRepository = {
  list,
  create,
  getDetail,
  incidentContext,
};

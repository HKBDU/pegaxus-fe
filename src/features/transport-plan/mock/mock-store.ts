import {
  approvedBookingDetailSchema,
  approvedBookingsPageSchema,
  approvedBookingsQuerySchema,
} from "../schemas";
import {
  createTransportPlanSchema,
  transportPlanDetailSchema,
  transportPlansQuerySchema,
  updateTransportPlanSchema,
} from "../schemas";
import type {
  ApprovedBookingDetail,
  ApprovedBookingsQueryParams,
} from "../types";
import type {
  CreateTransportPlanInput,
  TransportPlanDetail,
  TransportPlansQueryParams,
  UpdateTransportPlanInput,
} from "../types";
import {
  createFlow3Fixtures,
  emergencyMockIds,
  flow3MockLocations,
} from "./fixtures";
import type { AuthPrincipal } from "@/features/auth/types";
import { canUseEmergencyAction } from "@/features/route-view/emergency-policy";
import {
  backupChangeRequestSchema,
  routeChangeDecisionSchema,
  returnActivationSchema,
  driverNoticeSchema,
} from "@/features/route-view/schemas";
import type { EmergencyAction } from "@/features/route-view/types";

const success = <T>(value: T, code = 200) => ({
  isSuccess: true as const,
  code,
  message: "Development mock response",
  value: structuredClone(value),
});
const failure = (code: number, errorCode: string, message: string) => ({
  isSuccess: false as const,
  code,
  errorCode,
  message,
  value: null,
});
const contains = (values: string[], search?: string) =>
  !search ||
  values.some((value) => value.toLowerCase().includes(search.toLowerCase()));
const paginate = <T>(items: T[], pageIndex: number, pageSize: number) => ({
  items: items.slice((pageIndex - 1) * pageSize, pageIndex * pageSize),
  pageIndex,
  pageSize,
  totalItems: items.length,
  totalPages: Math.ceil(items.length / pageSize),
});
function sortRows<T>(
  items: T[],
  sortBy: string,
  value: (row: T, field: string) => string | null | undefined,
) {
  const [field, direction] = sortBy.split(":");
  return items.sort((a, b) => {
    const left = value(a, field),
      right = value(b, field);
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    return left.localeCompare(right) * (direction === "desc" ? -1 : 1);
  });
}

export function createFlow3MockStore() {
  const { bookings, plans, routes } = createFlow3Fixtures();
  const locations = structuredClone(flow3MockLocations);
  const findLocation = (id?: string | null) =>
    locations.find((location) => location.locationId === id) ?? null;
  let lastTimestamp = Date.now();
  const now = () =>
    new Date(
      (lastTimestamp = Math.max(Date.now(), lastTimestamp + 1)),
    ).toISOString();
  const planFor = (booking: ApprovedBookingDetail) =>
    plans.find(
      (plan) =>
        plan.booking.bookingId === booking.bookingId &&
        plan.status !== "CANCELLED",
    ) ?? null;
  const routesFor = (planId?: string) =>
    routes.filter((route) => route.transportPlanId === planId);
  const planSummary = (plan: TransportPlanDetail | null) =>
    plan
      ? {
          transportPlanId: plan.transportPlanId,
          planCode: plan.planCode,
          status: plan.status,
          plannedStartAt: plan.plannedStartAt,
          plannedEndAt: plan.plannedEndAt,
          estimatedDistanceKm: plan.estimatedDistanceKm,
          estimatedDurationMinutes: plan.estimatedDurationMinutes,
          planningNote: plan.planningNote,
          originLocation: plan.originLocation,
          destinationLocation: plan.destinationLocation,
        }
      : null;
  const routeSummary = (route: (typeof routes)[number]) => ({
    routePlanId: route.routePlanId,
    routePlanCode: route.routePlanCode,
    status: route.status,
    routeType: route.routeType,
  });
  const bookingListRow = (booking: ApprovedBookingDetail) => {
    const plan = planFor(booking),
      primary = routesFor(plan?.transportPlanId).find(
        (route) =>
          route.routeType === "PRIMARY" && route.status !== "CANCELLED",
      );
    return {
      ...booking,
      customerName: booking.customer.fullName,
      customerCode: booking.customer.customerCode,
      transportId: booking.transport?.transportId ?? null,
      transportCode: booking.transport?.transportCode,
      transportPlan: planSummary(plan),
      routePlan: primary ? routeSummary(primary) : null,
      approvedAt: "2026-10-01T08:00:00Z",
      createdAt: `${booking.requestedDepartureDate}T00:00:00Z`,
    };
  };
  return {
    getLocations(search: string, pageIndex: number) {
      return success(
        paginate(
          locations.filter((location) =>
            contains(
              [location.locationName, location.city ?? "", location.country],
              search,
            ),
          ),
          pageIndex,
          20,
        ),
      );
    },
    getApprovedBookings(params: ApprovedBookingsQueryParams) {
      const query = approvedBookingsQuerySchema.parse(params);
      const items = bookings
        .map(bookingListRow)
        .filter(
          (row) =>
            contains([row.bookingCode, row.customerName], query.search) &&
            (query.isInternational == null ||
              row.isInternational === query.isInternational) &&
            (!query.transportPlanStatus ||
              row.transportPlan?.status === query.transportPlanStatus) &&
            (!query.routePlanStatus ||
              row.routePlan?.status === query.routePlanStatus) &&
            (query.hasTransportPlan == null ||
              Boolean(row.transportPlan) === query.hasTransportPlan) &&
            (query.hasRoutePlan == null ||
              Boolean(row.routePlan) === query.hasRoutePlan) &&
            (query.hasComplianceDossier == null ||
              Boolean(row.complianceDossier) === query.hasComplianceDossier) &&
            (!query.complianceDossierStatus ||
              row.complianceDossier?.status ===
                query.complianceDossierStatus) &&
            (!query.departureFrom ||
              row.requestedDepartureDate >= query.departureFrom) &&
            (!query.departureTo ||
              row.requestedDepartureDate <= query.departureTo),
        );
      return success(
        approvedBookingsPageSchema.parse(
          paginate(
            sortRows(items, query.sortBy, (row, field) =>
              field === "approvedAt"
                ? row.approvedAt
                : field === "createdAt"
                  ? row.createdAt
                  : row.requestedDepartureDate,
            ),
            query.pageIndex,
            query.pageSize,
          ),
        ),
      );
    },
    getApprovedBooking(id: string) {
      const booking = bookings.find((item) => item.bookingId === id);
      if (!booking)
        return failure(404, "BOOKING_NOT_FOUND", "Approved booking not found.");
      const plan = planFor(booking);
      return success(
        approvedBookingDetailSchema.parse({
          ...booking,
          transportPlan: planSummary(plan),
          routePlans: routesFor(plan?.transportPlanId).map(routeSummary),
        }),
      );
    },
    getPlans(params: TransportPlansQueryParams) {
      const query = transportPlansQuerySchema.parse(params);
      const items = plans.filter(
        (plan) =>
          contains(
            [
              plan.planCode,
              plan.booking.bookingCode,
              plan.booking.customerName,
            ],
            query.search,
          ) &&
          (!query.status || plan.status === query.status) &&
          (!query.routePlanStatus ||
            routesFor(plan.transportPlanId).some(
              (route) => route.status === query.routePlanStatus,
            )),
      );
      return success(
        paginate(
          sortRows(items, query.sortBy, (plan, field) =>
            field === "plannedStartAt" ? plan.plannedStartAt : plan.createdAt,
          ).map((plan) => ({
            transportPlanId: plan.transportPlanId,
            planCode: plan.planCode,
            status: plan.status,
            bookingId: plan.booking.bookingId,
            bookingCode: plan.booking.bookingCode,
            customerName: plan.booking.customerName,
            plannedStartAt: plan.plannedStartAt,
            plannedEndAt: plan.plannedEndAt,
            updatedAt: plan.updatedAt,
          })),
          query.pageIndex,
          query.pageSize,
        ),
      );
    },
    getPlan(id: string) {
      const plan = plans.find((item) => item.transportPlanId === id);
      return plan
        ? success(transportPlanDetailSchema.parse(plan))
        : failure(404, "TRANSPORT_PLAN_NOT_FOUND", "Transport plan not found.");
    },
    createPlan(bookingId: string, input: CreateTransportPlanInput) {
      const booking = bookings.find((item) => item.bookingId === bookingId);
      if (!booking)
        return failure(404, "BOOKING_NOT_FOUND", "Booking not found.");
      if (!booking.transport)
        return failure(
          409,
          "TRANSPORT_NOT_FOUND",
          "The approved booking has no transport.",
        );
      if (planFor(booking))
        return failure(
          409,
          "TRANSPORT_PLAN_ALREADY_EXISTS",
          "Transport Plan already exists for this booking. Please edit the existing plan.",
        );
      const parsed = createTransportPlanSchema.safeParse(input);
      if (!parsed.success)
        return failure(
          400,
          "VALIDATION_ERROR",
          "Check the transport plan metadata.",
        );
      if (
        [parsed.data.originLocationId, parsed.data.destinationLocationId].some(
          (id) => id && !findLocation(id),
        )
      )
        return failure(
          404,
          "LOCATION_NOT_FOUND",
          "A selected location does not exist.",
        );
      const timestamp = now();
      const plan: TransportPlanDetail = {
        transportPlanId: crypto.randomUUID(),
        planCode: `TP-DEMO-${String(plans.length + 1).padStart(4, "0")}`,
        status: "DRAFT",
        booking: { ...booking, customerName: booking.customer.fullName },
        transport: booking.transport,
        ...parsed.data,
        complianceDossier: booking.complianceDossier,
        complianceDossiers: booking.complianceDossiers,
        originLocation: findLocation(parsed.data.originLocationId),
        destinationLocation: findLocation(parsed.data.destinationLocationId),
        planningNote: parsed.data.planningNote ?? null,
        estimatedDistanceKm: parsed.data.estimatedDistanceKm ?? null,
        estimatedDurationMinutes: parsed.data.estimatedDurationMinutes ?? null,
        assignedEmployees: [],
        approvedAt: null,
        approvedBy: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      plans.push(plan);
      return success(transportPlanDetailSchema.parse(plan), 201);
    },
    updatePlan(id: string, input: UpdateTransportPlanInput) {
      const plan = plans.find((item) => item.transportPlanId === id);
      if (!plan)
        return failure(
          404,
          "TRANSPORT_PLAN_NOT_FOUND",
          "Transport plan not found.",
        );
      if (
        ["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(plan.status) ||
        ["IN_TRANSIT", "COMPLETED", "CANCELLED"].includes(plan.transport.status)
      )
        return failure(
          409,
          "PLAN_LOCKED",
          "Cannot edit Transport Plan once the transport is in transit or completed.",
        );
      if (input.lastUpdatedAt !== plan.updatedAt)
        return failure(
          409,
          "TRANSPORT_PLAN_MODIFIED",
          "The transport plan was just modified. Please reload the page.",
        );
      const parsed = updateTransportPlanSchema.safeParse(input);
      if (!parsed.success)
        return failure(
          400,
          "VALIDATION_ERROR",
          "Check the transport plan metadata.",
        );
      if (
        [parsed.data.originLocationId, parsed.data.destinationLocationId].some(
          (id) => id && !findLocation(id),
        )
      )
        return failure(
          404,
          "LOCATION_NOT_FOUND",
          "A selected location does not exist.",
        );
      const start = parsed.data.plannedStartAt ?? plan.plannedStartAt,
        end = parsed.data.plannedEndAt ?? plan.plannedEndAt;
      if (start && end && Date.parse(end) <= Date.parse(start))
        return failure(
          400,
          "VALIDATION_ERROR",
          "Planned end must be after planned start.",
        );
      for (const key of [
        "originLocationId",
        "destinationLocationId",
        "plannedStartAt",
        "plannedEndAt",
        "planningNote",
        "estimatedDistanceKm",
        "estimatedDurationMinutes",
      ] as const) {
        const value = parsed.data[key];
        if (value !== undefined) Object.assign(plan, { [key]: value });
      }
      if (parsed.data.originLocationId)
        plan.originLocation = findLocation(parsed.data.originLocationId);
      if (parsed.data.destinationLocationId)
        plan.destinationLocation = findLocation(
          parsed.data.destinationLocationId,
        );
      plan.updatedAt = now();
      return success(transportPlanDetailSchema.parse(plan));
    },
    getRoutes(
      planId: string,
      params: {
        routeType?: string;
        status?: string;
        includeCancelled?: boolean;
      } = {},
    ) {
      if (!plans.some((plan) => plan.transportPlanId === planId))
        return failure(
          404,
          "TRANSPORT_PLAN_NOT_FOUND",
          "Transport plan not found.",
        );
      return success({
        items: routesFor(planId)
          .filter(
            (route) =>
              (!params.routeType || route.routeType === params.routeType) &&
              (!params.status || route.status === params.status) &&
              (params.includeCancelled || route.status !== "CANCELLED"),
          )
          .map((route) => ({
            ...routeSummary(route),
            totalDistanceKm: route.totalDistanceKm,
            estimatedDurationMinutes: route.estimatedDurationMinutes,
            segmentCount: route.segments.length,
            isPersonnelComplete: route.isPersonnelComplete,
            replacesSequenceNo: route.replacesSequenceNo,
            routeNote: route.routeNote,
            updatedAt: route.updatedAt,
          })),
      });
    },
    getRoute(id: string) {
      const route = routes.find((item) => item.routePlanId === id);
      return route
        ? success(route)
        : failure(404, "ROUTE_PLAN_NOT_FOUND", "Route plan not found.");
    },
    executeEmergency(
      action: EmergencyAction,
      id: string,
      input: unknown,
      principal: AuthPrincipal | null,
    ) {
      if (!canUseEmergencyAction(action, principal))
        return failure(
          403,
          "FORBIDDEN",
          "This role cannot perform the emergency action.",
        );
      const route = routes.find((item) => item.routePlanId === id);
      if (!route)
        return failure(404, "ROUTE_PLAN_NOT_FOUND", "Route plan not found.");
      const plan = plans.find(
        (item) => item.transportPlanId === route.transportPlanId,
      )!;
      const booking = bookings.find(
        (item) => item.bookingId === route.bookingId,
      )!;
      if (plan.transport.status !== "IN_TRANSIT")
        return failure(
          409,
          "TRANSPORT_NOT_IN_TRANSIT",
          "The transport is not in transit.",
        );
      const invalidStatus = () =>
        failure(
          409,
          "INVALID_ROUTE_PLAN_STATUS",
          "The route status does not allow this action.",
        );
      const modified = () =>
        failure(
          409,
          "ROUTE_PLAN_MODIFIED",
          "The route plan was just modified. Review the latest data.",
        );
      const invalid = () =>
        failure(400, "VALIDATION_ERROR", "Check the emergency form fields.");
      if (action === "request") {
        const parsed = backupChangeRequestSchema.safeParse(input);
        if (!parsed.success) return invalid();
        if (route.routeType !== "BACKUP" || route.status !== "CONFIRMED")
          return invalidStatus();
        if (
          !routesFor(plan.transportPlanId).some(
            (item) => item.routeType === "PRIMARY" && item.status === "ACTIVE",
          )
        )
          return invalidStatus();
        if (id === emergencyMockIds.belowThresholdBackup)
          return failure(
            422,
            "APPROVAL_NOT_REQUIRED",
            "The change is below BR-036 approval threshold.",
          );
        // EC1 only simulates notification; it does not persist a ChangeRequest or change route status.
        return success({
          routePlanId: id,
          routeType: "BACKUP",
          status: "CONFIRMED",
          requestedAt: now(),
        });
      }
      if (action === "decision") {
        const parsed = routeChangeDecisionSchema.safeParse(input);
        if (!parsed.success) return invalid();
        const body = parsed.data;
        if (body.lastUpdatedAt !== route.updatedAt) return modified();
        if (!(
          (route.routeType === "BACKUP" && route.status === "CONFIRMED") ||
          (route.routeType === "RETURN" && route.status === "DRAFT")
        ))
          return invalidStatus();
        if (route.routeType === "RETURN") {
          if (body.decision === "APPROVE") {
            if (booking.complianceDossier?.status !== "APPROVED")
              return failure(
                409,
                "DOSSIER_NOT_APPROVED",
                "Return approval requires an approved dossier.",
              );
            booking.complianceDossier.status = "DRAFT";
          } else {
            route.status = "CANCELLED";
            route.routeNote = body.note;
          }
        } else if (body.decision === "APPROVE") route.status = "ACTIVE";
        route.updatedAt = now();
        return success({
          routePlanId: id,
          routeType: route.routeType,
          decision: body.decision,
          status: route.status,
          complianceDossier:
            route.routeType === "RETURN" ? booking.complianceDossier : null,
          updatedAt: route.updatedAt,
        });
      }
      if (action === "activation") {
        const parsed = returnActivationSchema.safeParse(input);
        if (!parsed.success) return invalid();
        const body = parsed.data;
        if (body.lastUpdatedAt !== route.updatedAt) return modified();
        if (route.routeType !== "RETURN" || route.status !== "CONFIRMED")
          return invalidStatus();
        if (booking.complianceDossier?.status !== "APPROVED")
          return failure(
            409,
            "DOSSIER_NOT_APPROVED",
            "Complete the legal and dossier workflow first.",
          );
        if (id === emergencyMockIds.resourceConflictReturn)
          return {
            ...failure(409, "SCHEDULE_CONFLICT", "Mock scheduling conflict."),
            errors: [
              {
                field: "segments[0].vehicleIds",
                message: "The vehicle is already reserved.",
              },
            ],
          };
        const nextSegments = structuredClone(route.segments);
        for (const override of body.segments ?? []) {
          const segment = nextSegments.find(
            (item) => item.routePlanRouteId === override.routePlanRouteId,
          );
          if (!segment) return invalid();
          if (override.vehicleIds !== undefined) {
            if (segment.isOutsourced)
              return failure(
                422,
                "OUTSOURCED_SEGMENT",
                "An outsourced segment cannot receive vehicles.",
              );
            const vehicles = routes.flatMap((item) =>
              item.segments.flatMap((leg) => leg.vehicles),
            );
            const selected = override.vehicleIds.map((vehicleId) =>
              vehicles.find((vehicle) => vehicle.vehicleId === vehicleId),
            );
            if (selected.some((vehicle) => !vehicle))
              return failure(
                422,
                "VEHICLE_UNAVAILABLE",
                "Vehicle not available.",
              );
            if (
              selected.some(
                (vehicle) =>
                  vehicle!.transportMode !== segment.route.transportMode,
              )
            )
              return failure(
                422,
                "VEHICLE_MODE_MISMATCH",
                "Vehicle mode does not match.",
              );
            segment.vehicles = selected.filter(
              (vehicle) => vehicle !== undefined,
            );
          }
          if (override.outsourcing) {
            const provider = routes
              .flatMap((item) =>
                item.segments.map((leg) => leg.outsourcing?.provider),
              )
              .find(
                (item) =>
                  item?.transportProviderId ===
                  override.outsourcing!.transportProviderId,
              );
            if (!provider || provider.status !== "ACTIVE")
              return failure(409, "PROVIDER_INACTIVE", "Provider unavailable.");
            if (!provider.supportedModes.includes(segment.route.transportMode))
              return failure(
                422,
                "PROVIDER_MODE_MISMATCH",
                "Provider mode does not match.",
              );
            segment.isOutsourced = true;
            segment.vehicles = [];
            segment.outsourcing = { provider };
          }
        }
        route.segments = nextSegments;
        route.status = "ACTIVE";
        route.updatedAt = now();
        return success({
          routePlanId: id,
          routeType: "RETURN",
          status: "ACTIVE",
          segments: route.segments,
          updatedAt: route.updatedAt,
        });
      }
      const parsed = driverNoticeSchema.safeParse(input);
      if (!parsed.success) return invalid();
      if (
        route.routeType !== "RETURN" ||
        !["CONFIRMED", "ACTIVE"].includes(route.status)
      )
        return invalidStatus();
      const drivers = routesFor(plan.transportPlanId)
        .filter((item) => item.routeType === "PRIMARY")
        .flatMap((item) => item.segments.map((segment) => segment.driver))
        .filter((driver) => driver !== null);
      return success({
        routePlanId: id,
        notifiedDrivers: [
          ...new Map(
            drivers.map((driver) => [driver.employeeId, driver]),
          ).values(),
        ],
        sentAt: now(),
      });
    },
    // Test-only simulation of the external TS/RP7 transaction. Never called by UC48 UI.
    simulateReturnLegalReview(id: string) {
      const route = routes.find((item) => item.routePlanId === id);
      const booking = bookings.find(
        (item) => item.bookingId === route?.bookingId,
      );
      if (
        !route ||
        route.routeType !== "RETURN" ||
        route.status !== "DRAFT" ||
        booking?.complianceDossier?.status !== "DRAFT"
      )
        return failure(
          409,
          "RETURN_NOT_APPROVED",
          "LM approval must precede RP7.",
        );
      booking.complianceDossier.status = "APPROVED";
      route.status = "CONFIRMED";
      route.updatedAt = now();
      route.legalReview = {
        isFeasible: true,
        note: "Simulated external RP7 return confirmation.",
        blockedSegments: [],
        reviewedAt: route.updatedAt,
      };
      return success(route);
    },
  };
}

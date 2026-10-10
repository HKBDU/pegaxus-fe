import { approvedBookingDetailSchema, approvedBookingsPageSchema, approvedBookingsQuerySchema } from "../schemas"
import { createTransportPlanSchema, transportPlanDetailSchema, transportPlansQuerySchema, updateTransportPlanSchema } from "../transport-plan.schemas"
import type { ApprovedBookingDetail, ApprovedBookingsQueryParams } from "../types"
import type { CreateTransportPlanInput, TransportPlanDetail, TransportPlansQueryParams, UpdateTransportPlanInput } from "../transport-plan.types"
import { createFlow3Fixtures } from "./fixtures"

const success = <T>(value: T, code = 200) => ({ isSuccess: true as const, code, message: "Development mock response", value: structuredClone(value) })
const failure = (code: number, errorCode: string, message: string) => ({ isSuccess: false as const, code, errorCode, message, value: null })
const contains = (values: string[], search?: string) => !search || values.some((value) => value.toLowerCase().includes(search.toLowerCase()))
const paginate = <T>(items: T[], pageIndex: number, pageSize: number) => ({ items: items.slice((pageIndex - 1) * pageSize, pageIndex * pageSize), pageIndex, pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / pageSize) })
function sortRows<T>(items: T[], sortBy: string, value: (row: T, field: string) => string | null | undefined) {
  const [field, direction] = sortBy.split(":")
  return items.sort((a, b) => {
    const left = value(a, field), right = value(b, field)
    if (left == null) return right == null ? 0 : 1
    if (right == null) return -1
    return left.localeCompare(right) * (direction === "desc" ? -1 : 1)
  })
}

export function createFlow3MockStore() {
  const { bookings, plans, routes } = createFlow3Fixtures()
  let lastTimestamp = Date.now()
  const now = () => new Date(lastTimestamp = Math.max(Date.now(), lastTimestamp + 1)).toISOString()
  const planFor = (booking: ApprovedBookingDetail) => plans.find((plan) => plan.booking.bookingId === booking.bookingId && plan.status !== "CANCELLED") ?? null
  const routesFor = (planId?: string) => routes.filter((route) => route.transportPlanId === planId)
  const planSummary = (plan: TransportPlanDetail | null) => plan ? { transportPlanId: plan.transportPlanId, planCode: plan.planCode, status: plan.status,
    plannedStartAt: plan.plannedStartAt, plannedEndAt: plan.plannedEndAt, estimatedDistanceKm: plan.estimatedDistanceKm, estimatedDurationMinutes: plan.estimatedDurationMinutes, planningNote: plan.planningNote } : null
  const routeSummary = (route: typeof routes[number]) => ({ routePlanId: route.routePlanId, routePlanCode: route.routePlanCode, status: route.status, routeType: route.routeType })
  const bookingListRow = (booking: ApprovedBookingDetail) => {
    const plan = planFor(booking), primary = routesFor(plan?.transportPlanId).find((route) => route.routeType === "PRIMARY" && route.status !== "CANCELLED")
    return { ...booking, customerName: booking.customer.fullName, customerCode: booking.customer.customerCode, transportId: booking.transport?.transportId ?? null,
      transportPlan: planSummary(plan), routePlan: primary ? routeSummary(primary) : null, approvedAt: "2026-10-01T08:00:00Z", createdAt: `${booking.requestedDepartureDate}T00:00:00Z` }
  }
  return {
    getApprovedBookings(params: ApprovedBookingsQueryParams) {
      const query = approvedBookingsQuerySchema.parse(params)
      const items = bookings.map(bookingListRow).filter((row) =>
        contains([row.bookingCode, row.customerName], query.search) &&
        (query.isInternational == null || row.isInternational === query.isInternational) &&
        (!query.transportPlanStatus || row.transportPlan?.status === query.transportPlanStatus) &&
        (!query.routePlanStatus || row.routePlan?.status === query.routePlanStatus) &&
        (query.hasTransportPlan == null || Boolean(row.transportPlan) === query.hasTransportPlan) &&
        (query.hasRoutePlan == null || Boolean(row.routePlan) === query.hasRoutePlan) &&
        (query.hasComplianceDossier == null || Boolean(row.complianceDossier) === query.hasComplianceDossier) &&
        (!query.complianceDossierStatus || row.complianceDossier?.status === query.complianceDossierStatus) &&
        (!query.departureFrom || row.requestedDepartureDate >= query.departureFrom) && (!query.departureTo || row.requestedDepartureDate <= query.departureTo))
      return success(approvedBookingsPageSchema.parse(paginate(sortRows(items, query.sortBy, (row, field) => field === "approvedAt" ? row.approvedAt : field === "createdAt" ? row.createdAt : row.requestedDepartureDate), query.pageIndex, query.pageSize)))
    },
    getApprovedBooking(id: string) {
      const booking = bookings.find((item) => item.bookingId === id)
      if (!booking) return failure(404, "BOOKING_NOT_FOUND", "Approved booking not found.")
      const plan = planFor(booking)
      return success(approvedBookingDetailSchema.parse({ ...booking, transportPlan: planSummary(plan), routePlans: routesFor(plan?.transportPlanId).map(routeSummary) }))
    },
    getPlans(params: TransportPlansQueryParams) {
      const query = transportPlansQuerySchema.parse(params)
      const items = plans.filter((plan) => contains([plan.planCode, plan.booking.bookingCode, plan.booking.customerName], query.search) &&
        (!query.status || plan.status === query.status) && (!query.routePlanStatus || routesFor(plan.transportPlanId).some((route) => route.status === query.routePlanStatus)))
      return success(paginate(sortRows(items, query.sortBy, (plan, field) => field === "plannedStartAt" ? plan.plannedStartAt : plan.createdAt).map((plan) => ({
        transportPlanId: plan.transportPlanId, planCode: plan.planCode, status: plan.status, bookingId: plan.booking.bookingId,
        bookingCode: plan.booking.bookingCode, customerName: plan.booking.customerName, plannedStartAt: plan.plannedStartAt, plannedEndAt: plan.plannedEndAt, updatedAt: plan.updatedAt,
      })), query.pageIndex, query.pageSize))
    },
    getPlan(id: string) {
      const plan = plans.find((item) => item.transportPlanId === id)
      return plan ? success(transportPlanDetailSchema.parse(plan)) : failure(404, "TRANSPORT_PLAN_NOT_FOUND", "Transport plan not found.")
    },
    createPlan(bookingId: string, input: CreateTransportPlanInput) {
      const booking = bookings.find((item) => item.bookingId === bookingId)
      if (!booking) return failure(404, "BOOKING_NOT_FOUND", "Booking not found.")
      if (!booking.transport) return failure(409, "TRANSPORT_NOT_FOUND", "The approved booking has no transport.")
      if (planFor(booking)) return failure(409, "TRANSPORT_PLAN_ALREADY_EXISTS", "Transport Plan already exists for this booking. Please edit the existing plan.")
      const parsed = createTransportPlanSchema.safeParse(input)
      if (!parsed.success) return failure(400, "VALIDATION_ERROR", "Check the transport plan metadata.")
      const timestamp = now()
      const plan: TransportPlanDetail = { transportPlanId: crypto.randomUUID(), planCode: `TP-DEMO-${String(plans.length + 1).padStart(4, "0")}`, status: "DRAFT",
        booking: { ...booking, customerName: booking.customer.fullName }, transport: booking.transport,
        ...parsed.data, planningNote: parsed.data.planningNote ?? null, estimatedDistanceKm: parsed.data.estimatedDistanceKm ?? null, estimatedDurationMinutes: parsed.data.estimatedDurationMinutes ?? null,
        assignedEmployees: [], approvedAt: null, approvedBy: null, createdAt: timestamp, updatedAt: timestamp }
      plans.push(plan)
      return success(transportPlanDetailSchema.parse(plan), 201)
    },
    updatePlan(id: string, input: UpdateTransportPlanInput) {
      const plan = plans.find((item) => item.transportPlanId === id)
      if (!plan) return failure(404, "TRANSPORT_PLAN_NOT_FOUND", "Transport plan not found.")
      if (["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(plan.status) || ["IN_TRANSIT", "COMPLETED", "CANCELLED"].includes(plan.transport.status)) return failure(409, "PLAN_LOCKED", "Cannot edit Transport Plan once the transport is in transit or completed.")
      if (input.lastUpdatedAt !== plan.updatedAt) return failure(409, "TRANSPORT_PLAN_MODIFIED", "The transport plan was just modified. Please reload the page.")
      const parsed = updateTransportPlanSchema.safeParse(input)
      if (!parsed.success) return failure(400, "VALIDATION_ERROR", "Check the transport plan metadata.")
      const start = parsed.data.plannedStartAt ?? plan.plannedStartAt, end = parsed.data.plannedEndAt ?? plan.plannedEndAt
      if (start && end && Date.parse(end) <= Date.parse(start)) return failure(400, "VALIDATION_ERROR", "Planned end must be after planned start.")
      for (const key of ["plannedStartAt", "plannedEndAt", "planningNote", "estimatedDistanceKm", "estimatedDurationMinutes"] as const) {
        const value = parsed.data[key]
        if (value !== undefined) Object.assign(plan, { [key]: value })
      }
      plan.updatedAt = now()
      return success(transportPlanDetailSchema.parse(plan))
    },
    getRoutes(planId: string, params: { routeType?: string; status?: string; includeCancelled?: boolean } = {}) {
      if (!plans.some((plan) => plan.transportPlanId === planId)) return failure(404, "TRANSPORT_PLAN_NOT_FOUND", "Transport plan not found.")
      return success({ items: routesFor(planId).filter((route) => (!params.routeType || route.routeType === params.routeType) && (!params.status || route.status === params.status) &&
        (params.includeCancelled || route.status !== "CANCELLED")).map((route) => ({ ...routeSummary(route), totalDistanceKm: route.totalDistanceKm, estimatedDurationMinutes: route.estimatedDurationMinutes,
          segmentCount: route.segments.length, isPersonnelComplete: route.isPersonnelComplete, updatedAt: route.updatedAt })) })
    },
    getRoute(id: string) {
      const route = routes.find((item) => item.routePlanId === id)
      return route ? success(route) : failure(404, "ROUTE_PLAN_NOT_FOUND", "Route plan not found.")
    },
  }
}

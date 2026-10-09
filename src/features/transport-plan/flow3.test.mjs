import assert from "node:assert/strict"
import { after, test } from "node:test"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { readFile } from "node:fs/promises"

const server = await createServer({ configFile: false, envDir: false,
  resolve: { alias: { "@": fileURLToPath(new URL("../../", import.meta.url)) } },
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("http://test.invalid/api/v1") },
  server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } })
after(() => server.close())
const load = (name) => server.ssrLoadModule(`/src/features/transport-plan/${name}`)
const schemas = await load("schemas.ts")
const tpSchemas = await load("transport-plan.schemas.ts")
const services = await load("services.ts")
const { transportPlanService } = await load("transport-plan.services.ts")
const actions = await load("approved-booking-actions.ts")
const { default: api } = await server.ssrLoadModule("/src/lib/axios.ts")
const { useAuthStore } = await server.ssrLoadModule("/src/features/auth/store.ts")
const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"]
const booking = { bookingId: ids[0], bookingCode: "REQ-20261001-0005", status: "APPROVED", customerName: "Racing Club",
  originAddress: "Paris", originCountry: "FR", destinationAddress: "London", destinationCountry: "GB", isInternational: true,
  totalHorses: 4, requestedDepartureDate: "2026-10-27", requestedArrivalDate: "2026-11-01", specialRequirements: null,
  approvedAt: "2026-10-01T03:00:00Z", transportId: ids[1], transportPlan: null, routePlan: null, complianceDossier: null }
const plan = { transportPlanId: ids[2], planCode: "TP-20261001-0001", status: "DRAFT", booking,
  transport: { transportId: ids[1], transportCode: "TR-20261001-0005", status: "PLANNING" },
  plannedStartAt: "2026-10-27T06:00:00Z", plannedEndAt: "2026-11-01T18:00:00Z", planningNote: null,
  estimatedDistanceKm: null, estimatedDurationMinutes: null, assignedEmployees: [], approvedBy: null, approvedAt: null,
  createdAt: "2026-10-06T08:00:00Z", updatedAt: "2026-10-06T08:00:00Z" }
const principal = (role) => ({ id: ids[3], roles: [role], permissions: [] })
const page = (items) => ({ items, pageIndex: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 })
const defaults = { pageIndex: 1, pageSize: 20, sortBy: "requestedDepartureDate:asc" }
const render = (element, path = "/") => renderToStaticMarkup(h(QueryClientProvider, { client: new QueryClient() }, h(MemoryRouter, { initialEntries: [path] }, element)))
function intercept(value, inspect) {
  const original = api.defaults.adapter
  api.defaults.adapter = async (config) => { inspect(config); return { data: { isSuccess: true, code: 200, message: "Success", value }, status: 200, headers: {}, config } }
  return () => { api.defaults.adapter = original }
}

test("AB1 accepts nullable latest summaries, UUIDs and only supported query parameters", () => {
  assert.equal(schemas.approvedBookingListItemSchema.safeParse(booking).success, true)
  assert.equal(schemas.entityIdSchema.safeParse(123).success, false)
  const query = services.buildApprovedBookingQuery({ ...defaults, isInternational: false, transportPlanStatus: "APPROVED", routePlanStatus: "DRAFT",
    hasRoutePlan: false, hasTransportPlan: true, hasComplianceDossier: false, complianceDossierStatus: "DRAFT", departureFrom: "2026-10-01", departureTo: "2026-11-01",
    search: " REQ ", depositStatus: "PAID", routePlanningStatus: "COMPLETED", transportScope: "DOMESTIC", status: "APPROVED" })
  assert.equal(query.isInternational, false)
  assert.equal(query.search, "REQ")
  for (const key of ["hasRoutePlan", "hasTransportPlan", "hasComplianceDossier", "transportPlanStatus", "routePlanStatus", "complianceDossierStatus"]) assert.ok(key in query)
  for (const key of ["status", "transportScope", "depositStatus", "routePlanningStatus"]) assert.equal(key in query, false)
  assert.throws(() => services.buildApprovedBookingQuery({ ...defaults, departureFrom: "2026-11-02", departureTo: "2026-11-01" }))
})
test("AB1 uses /bookings/approved and preserves empty pagination", async () => {
  const restore = intercept(page([]), (config) => assert.equal(config.url, "/bookings/approved"))
  try { const result = await services.approvedBookingService.getApprovedBookings(defaults); assert.deepEqual(result.data, []); assert.equal(result.meta.totalItems, 0) } finally { restore() }
})
test("AB2 uses its own detail shape and nested transport ID", async () => {
  const detail = { ...booking, customer: { customerId: ids[3], fullName: "Racing Club", customerCode: null, phone: null },
    transport: plan.transport, horses: [], routePlans: [], customerNote: null }
  const restore = intercept(detail, (config) => assert.equal(config.url, `/bookings/approved/${ids[0]}`))
  try { const result = await services.approvedBookingService.getApprovedBooking(ids[0]); assert.equal(result.isInternational, true); assert.equal(result.transport.transportId, ids[1]); assert.equal(result.complianceDossier, null) } finally { restore() }
})
test("LM list/detail rules create or view and manage only APPROVED plans", () => {
  assert.equal(typeof actions.getApprovedBookingActions, "function")
  const get = (tp) => actions.getApprovedBookingActions(principal("LOGISTICS_MANAGER"), { ...booking, transportPlan: tp }).map((action) => action.kind)
  assert.deepEqual(get(null), ["createTransportPlan"])
  for (const status of ["DRAFT", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) assert.deepEqual(get({ ...plan, status }), ["viewTransportPlan"])
  assert.deepEqual(get({ ...plan, status: "APPROVED" }), ["viewTransportPlan", "managePersonnel"])
})
test("RC/TS actions never expose LM mutations and retain proper identifiers", () => {
  assert.equal(typeof actions.getApprovedBookingActions, "function")
  const assigned = { ...booking, transportPlan: { ...plan, status: "APPROVED" } }
  const rc = actions.getApprovedBookingActions(principal("FLEET_ROUTE_COORDINATOR"), assigned)
  assert.deepEqual(rc.map((action) => action.kind), ["viewTransportPlan", "createRoutePlan"])
  assert.equal(rc[1].targetId, ids[2])
  const ts = actions.getApprovedBookingActions(principal("TRANSPORT_SPECIALIST"), assigned)
  assert.deepEqual(ts.map((action) => action.kind), ["viewTransportPlan", "applyDossierTemplate"])
  assert.equal(ts[1].bookingId, ids[0]); assert.equal(ts[1].transportId, ids[1])
  const withLinks = { ...assigned, routePlan: { routePlanId: ids[3], routePlanCode: "RP-1", status: "DRAFT" }, complianceDossier: { complianceDossierId: ids[3], status: "DRAFT" } }
  assert.deepEqual(actions.getApprovedBookingActions(principal("TRANSPORT_SPECIALIST"), withLinks).map((action) => action.kind), ["viewTransportPlan", "viewComplianceDossier", "viewRoutePlan"])
  assert.deepEqual(actions.getApprovedBookingActions(principal("CUSTOMER"), withLinks), [])
})
test("TP2/TP3 do not require legacy quotation, provider, mode or deposit fields", () => {
  assert.equal(tpSchemas.transportPlanDetailSchema.safeParse(plan).success, true)
  assert.equal(tpSchemas.transportPlanListItemSchema.safeParse({ transportPlanId: ids[2], planCode: plan.planCode, status: "DRAFT", bookingId: ids[0], bookingCode: booking.bookingCode,
    customerName: booking.customerName, plannedStartAt: null, plannedEndAt: null, updatedAt: plan.updatedAt }).success, true)
  assert.equal(tpSchemas.transportPlanIdSchema.safeParse("123").success, false)
})
test("TP1 metadata validation requires dates, ordering and allows empty optional numbers", async () => {
  const form = await load("transport-plan.form.ts")
  assert.equal(form.transportPlanFormSchema.safeParse(form.emptyPlanForm).success, false)
  assert.equal(form.transportPlanFormSchema.safeParse({ ...form.emptyPlanForm, plannedStartAt: "2026-10-27T06:00", plannedEndAt: "2026-10-27T06:00" }).success, false)
  const values = { ...form.emptyPlanForm, plannedStartAt: "2026-10-27T06:00", plannedEndAt: "2026-10-28T06:00" }
  assert.equal(form.transportPlanFormSchema.safeParse(values).success, true)
  assert.equal(form.transportPlanFormSchema.safeParse({ ...values, estimatedDistanceKm: "abc" }).success, false)
  assert.equal(form.transportPlanFormSchema.safeParse({ ...values, estimatedDistanceKm: "-1" }).success, false)
  const body = form.buildCreatePlanInput(values)
  assert.equal(body.plannedStartAt, new Date(values.plannedStartAt).toISOString())
  assert.deepEqual(Object.keys(body).sort(), ["plannedEndAt", "plannedStartAt"])
})
test("TP1/TP4 use metadata-only requests and real lastUpdatedAt", async () => {
  assert.equal(typeof transportPlanService.createPlan, "function")
  assert.equal(typeof transportPlanService.updatePlan, "function")
  const metadata = { plannedStartAt: plan.plannedStartAt, plannedEndAt: plan.plannedEndAt, estimatedDistanceKm: 920.5, estimatedDurationMinutes: 1260, planningNote: "Monitoring" }
  const restore = intercept(plan, (config) => {
    assert.ok([`/bookings/${ids[0]}/transport-plans`, `/transport-plans/${ids[2]}`].includes(config.url))
    const body = JSON.parse(config.data)
    for (const key of ["action", "status", "quotation", "providers", "transportModeOptions", "transportSpecialistId", "depositStatus"]) assert.equal(key in body, false)
    if (config.method === "put") assert.equal(body.lastUpdatedAt, plan.updatedAt)
  })
  try { assert.equal((await transportPlanService.createPlan(ids[0], { ...metadata, status: "APPROVED", quotation: {} })).transportPlanId, ids[2]); await transportPlanService.updatePlan(ids[2], { ...metadata, lastUpdatedAt: plan.updatedAt, updateReason: "Rescheduled" }) } finally { restore() }
})
test("TP4 dirty patch preserves nulls by omission, explicit zeros and current concurrency token", async () => {
  const form = await load("transport-plan.form.ts")
  const values = form.planToForm(plan)
  assert.deepEqual(form.buildUpdatePlanInput(values, plan), { lastUpdatedAt: plan.updatedAt })
  assert.deepEqual(form.buildUpdatePlanInput({ ...values, estimatedDistanceKm: "0", planningNote: "" }, plan), { lastUpdatedAt: plan.updatedAt, estimatedDistanceKm: 0 })
  assert.equal(values.plannedStartAt, form.toLocalDateTime(plan.plannedStartAt))
})
test("edit eligibility is manager-only and obeys plan and transport locks", async () => {
  const { canEditTransportPlan } = await load("transport-plan.form.ts")
  for (const status of ["DRAFT", "PENDING", "APPROVED"]) assert.equal(canEditTransportPlan(principal("LOGISTICS_MANAGER"), { ...plan, status }), true)
  for (const status of ["IN_PROGRESS", "COMPLETED", "CANCELLED"]) assert.equal(canEditTransportPlan(principal("LOGISTICS_MANAGER"), { ...plan, status }), false)
  for (const role of ["FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST", "CUSTOMER"]) assert.equal(canEditTransportPlan(principal(role), plan), false)
  assert.equal(canEditTransportPlan(principal("LOGISTICS_MANAGER"), { ...plan, transport: { ...plan.transport, status: "IN_TRANSIT" } }), false)
})
test("business error codes and field errors survive the envelope", () => {
  let error
  try { services.readEnvelope({ isSuccess: false, code: 400, errorCode: "TRANSPORT_PLAN_MODIFIED", message: "Reload latest", value: null,
    errors: [{ field: "plannedEndAt", message: "End must be later" }] }) } catch (caught) { error = caught }
  const info = services.getApiErrorInfo(error)
  assert.equal(info.code, "TRANSPORT_PLAN_MODIFIED")
  assert.equal(info.message, "Reload latest")
  assert.equal(info.errors[0].field, "plannedEndAt")
})
test("mutations invalidate AB lists/detail and TP lists/detail without quotation/personnel", async () => {
  const hooks = await load("hooks/useTransportPlans.ts")
  assert.equal(typeof hooks.refreshTransportPlanQueries, "function")
  const client = new QueryClient()
  const unrelated = ["transport-plans", "quotation", ids[2]]
  client.setQueryData(unrelated, { retained: true })
  client.setQueryData(["approved-bookings", "list", defaults], page([booking]))
  client.setQueryData(["approved-bookings", "detail", ids[0]], booking)
  client.setQueryData(["transport-plans", "list", {}], page([]))
  await hooks.refreshTransportPlanQueries(client, plan)
  assert.equal(client.getQueryState(unrelated).isInvalidated, false)
  assert.equal(client.getQueryState(["approved-bookings", "detail", ids[0]]).isInvalidated, true)
  assert.equal(client.getQueryData(["transport-plans", "detail", ids[2]]).updatedAt, plan.updatedAt)
})
test("detail has exactly three tabs with stable URL selection and real General metadata", async () => {
  const { TransportPlanDetails } = await load("pages/TransportPlanDetailsPage.tsx")
  useAuthStore.setState({ principal: principal("LOGISTICS_MANAGER") })
  const html = render(h(TransportPlanDetails, { plan }), `/admin/transport-plans/${ids[2]}`)
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3)
  assert.match(html, />General<.*>Quotation<.*>Personnel</)
  assert.match(html, /Racing Club/); assert.match(html, /Paris/)
  assert.doesNotMatch(html, /Deposit:|Linked transport providers|General \/ Modes/)
})
test("Quotation tab keeps presentation without obsolete fetches or fabricated amounts", async () => {
  const { TransportPlanQuotation } = await load("components/TransportPlanQuotation.tsx")
  const html = render(h(TransportPlanQuotation, { transportPlanId: ids[2] }))
  assert.match(html, /not available yet/i)
  assert.doesNotMatch(html, /Loading quotation|Pay|Issue quotation|\b920\.5\b/)
  assert.equal("getQuotation" in transportPlanService, false)
})
test("list/detail actions are consistent and cancelled primary routes do not enable assignment", () => {
  const common = { ...booking, transportPlan: { ...plan, status: "APPROVED" }, routePlan: { routePlanId: ids[3], routePlanCode: "RP-1", status: "CONFIRMED" } }
  const detail = { ...common, transport: plan.transport, routePlans: [{ ...common.routePlan, routeType: "PRIMARY" }] }
  for (const role of ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"]) {
    assert.deepEqual(actions.getApprovedBookingActions(principal(role), common), actions.getApprovedBookingActions(principal(role), detail))
  }
  for (const status of ["DRAFT", "PENDING"]) {
    const result = actions.getApprovedBookingActions(principal("FLEET_ROUTE_COORDINATOR"), { ...detail, transportPlan: { ...plan, status }, routePlans: [] })
    assert.deepEqual(result.map((action) => action.kind), ["viewTransportPlan"])
  }
  const cancelled = { ...common, routePlan: { ...common.routePlan, status: "CANCELLED" } }
  assert.deepEqual(actions.getApprovedBookingActions(principal("FLEET_ROUTE_COORDINATOR"), cancelled).map((item) => item.kind), ["viewTransportPlan", "createRoutePlan"])
})
test("toolbar controls serialize the actual AB1 contract, clear individually and reset pagination", async () => {
  const { ApprovedBookingFilters } = await load("components/ApprovedBookingFilters.tsx")
  const { changeApprovedBookingFilters, hasApprovedBookingFilters } = await load("constants.ts")
  const tree = ApprovedBookingFilters({ params: defaults, onChange(patch) { patches.push(patch) } })
  const patches = []
  const walk = (element) => !element || typeof element !== "object" ? [] : [element, ...[element.props?.children].flat(Infinity).flatMap(walk)]
  const controls = walk(tree).filter((element) => element.props?.onValueChange || element.props?.onChange)
  assert.equal(controls.length, 11)
  const options = ["false", "APPROVED", "CONFIRMED", "true", "false", "false", "IN_PREPARATION"]
  for (let index = 1; index <= 7; index++) controls[index].props.onValueChange(options[index - 1])
  const query = services.buildApprovedBookingQuery(patches.reduce((params, patch) => changeApprovedBookingFilters(params, patch), { ...defaults, pageIndex: 4 }))
  assert.equal(query.pageIndex, 1); assert.equal(query.isInternational, false); assert.equal(query.hasRoutePlan, false)
  assert.equal(query.transportPlanStatus, "APPROVED"); assert.equal(query.complianceDossierStatus, "IN_PREPARATION")
  assert.equal(hasApprovedBookingFilters(query), true)
  for (let index = 1; index <= 7; index++) controls[index].props.onValueChange("ALL")
  controls[0].props.onChange({ target: { value: "" } }); controls[8].props.onChange(""); controls[9].props.onChange("")
  const reset = patches.reduce((params, patch) => changeApprovedBookingFilters(params, patch), defaults)
  assert.equal(hasApprovedBookingFilters(reset), false)
  const html = render(h(ApprovedBookingFilters, { params: defaults, onChange() {} }))
  assert.match(html, /flex-nowrap/); assert.match(html, /overflow-x-auto/); assert.doesNotMatch(html, />Reset<|>Departure<|>Deposit</)
})
test("TP2 queries use routePlanStatus, and plan table no longer invents quotation/deposit data", async () => {
  const { buildTransportPlanQuery } = await load("transport-plan.services.ts")
  const { TransportPlansTable } = await load("components/TransportPlansTable.tsx")
  assert.equal(buildTransportPlanQuery({ pageIndex: 1, pageSize: 20, sortBy: "createdAt:desc", routePlanStatus: "ACTIVE" }).routePlanStatus, "ACTIVE")
  const html = render(h(TransportPlansTable, { plans: [], params: { pageIndex: 1, pageSize: 20, sortBy: "createdAt:desc" },
    meta: { currentPage: 1, itemsPerPage: 20, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false }, isLoading: false, onChange() {}, onPageChange() {} }))
  assert.match(html, /No transport plans are available/); assert.doesNotMatch(html, /Estimated quotation|Deposit|Route planning/)
})
test("AB1 populated and empty tables are null-safe", async () => {
  const { ApprovedBookingsTable } = await load("components/ApprovedBookingsTable.tsx")
  const props = { params: defaults, meta: { currentPage: 1, itemsPerPage: 20, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }, isLoading: false, onChange() {}, onPageChange() {} }
  const html = render(h(ApprovedBookingsTable, { ...props, bookings: [booking] }))
  assert.match(html, /Racing Club/); assert.match(html, /Not created/)
  const empty = render(h(ApprovedBookingsTable, { ...props, bookings: [], params: { ...defaults, hasTransportPlan: false } }))
  assert.match(empty, /No approved bookings match/)
})
test("all tab URL selections render the appropriate panel and retain three tabs", async () => {
  const { TransportPlanDetails } = await load("pages/TransportPlanDetailsPage.tsx")
  for (const [tab, label] of [["quotation", "Quotation details are not available yet"], ["personnel", "Personnel assignment is not available yet"], ["unknown", "Booking Summary"]]) {
    const html = render(h(TransportPlanDetails, { plan }), `/admin/transport-plans/${ids[2]}?tab=${tab}`)
    assert.equal((html.match(/role="tab"/g) ?? []).length, 3)
    assert.ok(html.includes(label))
  }
})
test("Personnel accepts only the teammate public panel boundary without PS mutations", async () => {
  const { TransportPlanPersonnel } = await load("components/TransportPlanPersonnel.tsx")
  let passed
  function Panel(props) { passed = props.transportPlanId; return h("p", null, "Existing team integration") }
  render(h(TransportPlanPersonnel, { transportPlanId: ids[2], panel: Panel }))
  assert.equal(passed, ids[2])
  assert.equal("getAssignments" in transportPlanService, false)
})
test("non-manager mutations are blocked before sending HTTP", async () => {
  const hooks = await load("hooks/useTransportPlans.ts")
  const initialSnapshot = useAuthStore.getInitialState()
  const initialPrincipal = initialSnapshot.principal
  const originalPrincipal = useAuthStore.getState().principal
  let sent = 0
  const restore = intercept(plan, () => { sent++ })
  try {
    for (const role of ["FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST", "CUSTOMER"]) {
      useAuthStore.setState({ principal: principal(role) })
      initialSnapshot.principal = principal(role)
      let create, update
      function Probe() { create = hooks.useCreateTransportPlan(ids[0]); update = hooks.useUpdateTransportPlan(ids[2]); return null }
      render(h(Probe))
      await assert.rejects(create.mutateAsync({ plannedStartAt: plan.plannedStartAt, plannedEndAt: plan.plannedEndAt }), /Only Logistics Managers/)
      await assert.rejects(update.mutateAsync({ lastUpdatedAt: plan.updatedAt }), /Only Logistics Managers/)
    }
    assert.equal(sent, 0)
  } finally { restore(); initialSnapshot.principal = initialPrincipal; useAuthStore.setState({ principal: originalPrincipal }) }
})
test("business error handling uses errorCode rather than guessing from HTTP status", async () => {
  const { getTransportPlanError } = await load("transport-plan.services.ts")
  for (const code of ["PLAN_LOCKED", "TRANSPORT_PLAN_MODIFIED", "TRANSPORT_PLAN_ALREADY_EXISTS", "VALIDATION_ERROR", "BOOKING_NOT_FOUND", "INVALID_BOOKING_STATUS"]) {
    let error
    try { services.readEnvelope({ isSuccess: false, code: 400, errorCode: code, message: `Server ${code}`, value: null }) } catch (caught) { error = caught }
    const info = getTransportPlanError(error)
    assert.equal(info.retryable, false); assert.equal(info.message, `Server ${code}`)
  }
})
test("Edit handles partially changed date ranges against the original TP3 schedule", async () => {
  const form = await load("transport-plan.form.ts")
  const values = form.planToForm(plan)
  assert.throws(() => form.buildUpdatePlanInput({ ...values, plannedStartAt: form.toLocalDateTime("2026-11-05T06:00:00Z"), plannedEndAt: "" }, plan))
  assert.equal(form.buildUpdatePlanInput({ ...values, estimatedDistanceKm: "" }, { ...plan, estimatedDistanceKm: 400 }).estimatedDistanceKm, undefined)
  assert.equal(form.transportPlanFormSchema.safeParse({ ...values, plannedStartAt: "2026-02-30T12:00" }).success, false)
})
test("300ms search debounce and page-size/filter pagination reset remain intact", async () => {
  const source = await readFile(new URL("./pages/ApprovedBookingsPage.tsx", import.meta.url), "utf8")
  assert.match(source, /useDebounce\(params\.search, 300\)/)
  assert.match(source, /useApprovedBookings\(\{ \.\.\.params, search \}, !isSearchPending\)/)
  const { changeApprovedBookingFilters } = await load("constants.ts")
  assert.equal(changeApprovedBookingFilters({ ...defaults, pageIndex: 7 }, { pageSize: 5 }).pageIndex, 1)
})
test("shared request guard used by metadata forms prevents double submission", async () => {
  const { createRequestAttemptGuard } = await server.ssrLoadModule("/src/shared/hooks/request-attempt-guard.ts")
  const guard = createRequestAttemptGuard()
  let release, count = 0
  const request = () => { count++; return new Promise((resolve) => { release = resolve }) }
  const first = guard.run(request)
  assert.deepEqual(await guard.run(request), { started: false })
  assert.equal(count, 1)
  release(plan)
  assert.equal((await first).value.transportPlanId, ids[2])
  const source = await readFile(new URL("./components/TransportPlanMetadataForm.tsx", import.meta.url), "utf8")
  assert.match(source, /useFormRequestAttemptGuard\(form\)/)
})
test("Create/Edit metadata form reuses shared controls without quotation/provider/assignment inputs", async () => {
  const { TransportPlanMetadataForm } = await load("components/TransportPlanMetadataForm.tsx")
  const html = render(h(TransportPlanMetadataForm, { bookingId: ids[0], cancelHref: "/admin/approved-bookings" }))
  assert.match(html, /Planned Start/); assert.match(html, /Estimated Duration/)
  assert.match(html, /Save Transport Plan/)
  assert.doesNotMatch(html, /name="(?:status|quotation|providers|transportModeOptions|transportSpecialistId|routeCoordinatorId)"/)
  const edit = render(h(TransportPlanMetadataForm, { bookingId: ids[0], plan, cancelHref: "/admin/transport-plans" }))
  assert.match(edit, /Update Reason/); assert.match(edit, /Save Changes/)
  assert.match(edit, /value="2026-/)
})
test("existing detail routes open the shared Create/Edit pages using URL parameters", async () => {
  const { default: BookingPage } = await load("pages/ApprovedBookingDetailsPage.tsx")
  const { default: PlanPage } = await load("pages/TransportPlanDetailsPage.tsx")
  // Zustand's bound hook closes over the API's initial snapshot during SSR.
  const initialSnapshot = useAuthStore.getInitialState()
  const initialPrincipal = initialSnapshot.principal
  const originalPrincipal = useAuthStore.getState().principal
  useAuthStore.setState({ principal: principal("LOGISTICS_MANAGER") })
  initialSnapshot.principal = principal("LOGISTICS_MANAGER")
  const client = new QueryClient()
  client.setQueryData(["approved-bookings", "detail", ids[0]], { ...booking, customer: { fullName: "Racing Club" }, transport: plan.transport, horses: [], routePlans: [] })
  client.setQueryData(["transport-plans", "detail", ids[2]], plan)
  const routeRender = (Component, path, pattern) => renderToStaticMarkup(h(QueryClientProvider, { client }, h(MemoryRouter, { initialEntries: [path] },
    h(Routes, null, h(Route, { path: pattern, element: h(Component) })))))
  try {
    const create = routeRender(BookingPage, actions.createTransportPlanPath(ids[0]), "/admin/approved-bookings/:bookingId")
    assert.match(create, /Create Transport Plan/); assert.match(create, /Save Transport Plan/)
    const edit = routeRender(PlanPage, actions.editTransportPlanPath(ids[2]), "/admin/transport-plans/:transportPlanId")
    assert.match(edit, /Edit Transport Plan/); assert.match(edit, /Save Changes/); assert.match(edit, /TP-20261001-0001/)
    useAuthStore.setState({ principal: principal("FLEET_ROUTE_COORDINATOR") })
    initialSnapshot.principal = principal("FLEET_ROUTE_COORDINATOR")
    assert.match(routeRender(PlanPage, actions.editTransportPlanPath(ids[2]), "/admin/transport-plans/:transportPlanId"), /Only Logistics Managers/)
    assert.match(routeRender(BookingPage, actions.createTransportPlanPath(ids[0]), "/admin/approved-bookings/:bookingId"), /Only Logistics Managers/)
  } finally { initialSnapshot.principal = initialPrincipal; useAuthStore.setState({ principal: originalPrincipal }) }
})

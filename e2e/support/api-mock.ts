import type { Page, Request, Route } from "@playwright/test"

import { PLACES, type TestPlace } from "./test-data"

/**
 * The network layer of the suite.
 *
 * The tests target the FRONT END, so the backend is replaced by this class: it intercepts every request the browser
 * makes to `/api/v1/**` and answers it with a canned response in the real envelope
 * (`{ isSuccess, code, message, value }`). Three properties make the suite trustworthy:
 *
 *  1. Hermetic: requests to any host other than localhost, plus the SignalR hub, are blocked. A test can never reach
 *     the deployed backend, Geoapify or any other third party.
 *  2. Observable: every request is recorded, so a spec can assert exactly what the front end SENT (method, path, query,
 *     JSON body), not only what it displayed.
 *  3. Strict: an API call nobody declared is answered with 501 and listed in `unhandled`; the shared fixture fails the
 *     test at teardown. A new, undeclared dependency on the backend therefore cannot slip in silently.
 */

export interface RecordedRequest {
  method: string
  /** Path below `/api/v1`, without the query string, for example `/horses`. */
  path: string
  query: Record<string, string>
  body: unknown
}

export interface MockReply {
  status?: number
  body?: unknown
  /** Milliseconds to wait before answering; makes loading states observable. */
  delayMs?: number
  /** Drops the connection instead of answering: the browser sees a network failure (no HTTP response at all). */
  abort?: boolean
}

type Reply = MockReply | ((request: RecordedRequest) => MockReply | Promise<MockReply>)
type PathMatcher = string | RegExp

interface Handler {
  method: string
  path: PathMatcher
  reply: Reply
}

export interface ApiErrorBody {
  errorCode?: string
  message?: string
  errors?: { field: string; message: string }[] | null
}

const API_PREFIX = "/api/v1"
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

function envelope<T>(value: T, status = 200) {
  return { isSuccess: true, code: status, message: "Success", value }
}

export class ApiMock {
  private readonly handlers: Handler[] = []
  /** Every request made to `/api/v1/**`, in order. */
  readonly requests: RecordedRequest[] = []
  /** Requests that matched no handler (answered with 501). The fixture fails the test when this is not empty. */
  readonly unhandled: string[] = []
  /** Third-party requests that were blocked (informational). */
  readonly blockedExternal: string[] = []
  /** Files the page sent to the (fake) image host, as "<content-type> <size> bytes", for specs that upload a file. */
  readonly uploadedFiles: string[] = []

  private places: TestPlace[] = Object.values(PLACES)
  private fallbackReply?: Reply

  constructor(private readonly page: Page) {}

  // ---------------------------------------------------------------------------------------------- declaring replies

  /** Answers `method path` with a custom reply. A later declaration overrides an earlier one for the same request. */
  reply(method: string, path: PathMatcher, reply: Reply) {
    this.handlers.push({ method: method.toUpperCase(), path, reply })
    return this
  }

  /** Answers with a success envelope: `{ isSuccess: true, code, message, value }`. */
  ok<T>(method: string, path: PathMatcher, value: T | ((request: RecordedRequest) => T), status = 200, delayMs = 0) {
    return this.reply(method, path, (request) => ({
      status,
      delayMs,
      body: envelope(typeof value === "function" ? (value as (r: RecordedRequest) => T)(request) : value, status),
    }))
  }

  /** Answers with the error body the backend uses: `{ isSuccess: false, code, message, errorCode, errors }`. */
  fail(method: string, path: PathMatcher, status: number, error: ApiErrorBody = {}, delayMs = 0) {
    return this.reply(method, path, {
      status,
      delayMs,
      body: {
        isSuccess: false,
        code: status,
        message: error.message ?? "Request failed",
        errorCode: error.errorCode ?? "ERROR",
        errors: error.errors ?? null,
      },
    })
  }

  /**
   * Answers every request that has no declared mock with `reply` instead of failing the test. Use it ONLY when the
   * screen reached at the end of a navigation is not what the test is about (for example the landing page of a role).
   */
  tolerateUndeclared(reply: Reply) {
    this.fallbackReply = reply
    return this
  }

  /** Simulates the backend being unreachable for `method path` (offline, DNS failure, connection refused). */
  networkError(method: string, path: PathMatcher) {
    return this.reply(method, path, { abort: true })
  }

  /** Replaces the places Geoapify "knows" (used by the map search and by reverse geocoding). */
  setPlaces(places: TestPlace[]) {
    this.places = places
  }

  // --------------------------------------------------------------------------------------------------- observing

  /** The recorded requests for `method path` (both optional filters). */
  calls(method?: string, path?: PathMatcher): RecordedRequest[] {
    return this.requests.filter(
      (request) =>
        (!method || request.method === method.toUpperCase()) && (path === undefined || matches(path, request.path)),
    )
  }

  /** The JSON body of the most recent `method path` request (throws when there was none). */
  lastBody<T = Record<string, unknown>>(method: string, path: PathMatcher): T {
    const [last] = this.calls(method, path).slice(-1)
    if (!last) throw new Error(`No ${method.toUpperCase()} ${String(path)} request was recorded`)
    return last.body as T
  }

  // ------------------------------------------------------------------------------------------------------ install

  async install() {
    // Registered first = lowest priority (Playwright tries the most recently registered route first).
    await this.page.route((url) => /^https?:$/.test(url.protocol) && !LOCAL_HOSTS.has(url.hostname), (route) => {
      this.blockedExternal.push(route.request().url())
      return route.abort("blockedbyclient")
    })
    await this.page.route(/api\.geoapify\.com|maps\.geoapify\.com/, (route) => this.handleGeoapify(route))
    // The image host the presigned upload posts to (the application only accepts https://api.cloudinary.com).
    await this.page.route("https://api.cloudinary.com/**", (route) => {
      const request = route.request()
      this.uploadedFiles.push(`${request.headers()["content-type"]?.split(";")[0] ?? "unknown"} ${request.postDataBuffer()?.length ?? 0} bytes`)
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ public_id: "e2e" }) })
    })
    await this.page.route(/\/hubs\//, (route) => route.abort("blockedbyclient"))
    await this.page.route(/\/api\/v1\//, (route) => this.handleApi(route))
  }

  private async handleApi(route: Route) {
    const request = route.request()
    const origin = (await request.headerValue("origin")) ?? undefined
    const cors = corsHeaders(origin, await request.headerValue("access-control-request-headers"))

    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })

    const recorded = await record(request)
    this.requests.push(recorded)

    const handler = [...this.handlers].reverse().find((item) => item.method === recorded.method && matches(item.path, recorded.path))
    if (!handler && !this.fallbackReply) {
      this.unhandled.push(`${recorded.method} ${recorded.path}`)
      return route.fulfill({
        status: 501,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify({ isSuccess: false, code: 501, message: `E2E: no mock for ${recorded.method} ${recorded.path}`, errorCode: "E2E_UNMOCKED" }),
      })
    }

    const chosen = handler?.reply ?? this.fallbackReply!
    const reply = typeof chosen === "function" ? await chosen(recorded) : chosen
    if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs))
    if (reply.abort) return route.abort("connectionrefused")
    return route.fulfill({
      status: reply.status ?? 200,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify(reply.body ?? envelope(null)),
    })
  }

  private async handleGeoapify(route: Route) {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) })

    // Map style: an empty style (no tiles, no glyphs) keeps MapLibre fast and offline; markers are DOM elements.
    if (url.hostname.startsWith("maps.") && url.pathname.endsWith("style.json")) {
      return json({ version: 8, name: "e2e", sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e9e6de" } }] })
    }
    if (url.pathname.endsWith("/geocode/search")) {
      const text = (url.searchParams.get("text") ?? "").toLowerCase()
      const found = this.places.filter((place) => `${place.name} ${place.formatted} ${place.city}`.toLowerCase().includes(text))
      return json(featureCollection(found))
    }
    if (url.pathname.endsWith("/geocode/reverse")) {
      const lat = Number(url.searchParams.get("lat"))
      const lon = Number(url.searchParams.get("lon"))
      const nearest = [...this.places].sort((a, b) => distance(a, lat, lon) - distance(b, lat, lon))[0]
      return json(featureCollection(nearest ? [nearest] : []))
    }
    // Anything else (routing, nearby places, tiles) is not needed by the specs: an empty answer.
    return json(featureCollection([]))
  }
}

function matches(matcher: PathMatcher, path: string) {
  return typeof matcher === "string" ? matcher === path : matcher.test(path)
}

function corsHeaders(origin: string | undefined, requestedHeaders: string | null) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": requestedHeaders ?? "authorization,content-type",
    vary: "Origin",
  }
}

async function record(request: Request): Promise<RecordedRequest> {
  const url = new URL(request.url())
  const at = url.pathname.indexOf(API_PREFIX)
  const path = (at >= 0 ? url.pathname.slice(at + API_PREFIX.length) : url.pathname).replace(/\/+$/, "") || "/"
  let body: unknown = null
  if (request.postData()) {
    try {
      body = request.postDataJSON()
    } catch {
      body = request.postData()
    }
  }
  return { method: request.method(), path, query: Object.fromEntries(url.searchParams), body }
}

function featureCollection(places: TestPlace[]) {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      properties: { ...place, address_line1: place.name },
      geometry: { type: "Point", coordinates: [place.lon, place.lat] },
    })),
  }
}

function distance(place: TestPlace, lat: number, lon: number) {
  return (place.lat - lat) ** 2 + (place.lon - lon) ** 2
}

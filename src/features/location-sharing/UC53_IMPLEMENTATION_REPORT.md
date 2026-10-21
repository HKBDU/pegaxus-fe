# UC-53 Phase 2 — Driver Location Sharing

Date: 17/10/2026.

**SOURCE AUDITED — RUNTIME NOT VERIFIED**

**NOT VISUALLY VERIFIED**

## Implementation Plan and Boundaries

Phase 2 requirements build upon Phase 1 without altering the router/shell or rebuilding the UI.
Executed directly in the current session without delegation, without automated tests,
without calling GP2/GP3 during testing, and without commit/push.

- [x] Audit FE/BE and current GP2/GP3 contract; preserve auth and OT3 adapter.
- [x] Add Axios/envelope/Zod services and GeolocationPosition transformation.
- [x] Add sender lifecycle, 15-second cadence, single flight, cleanup, and GP3 handling.
- [x] Wire Start/Stop and real statuses into the existing UI.
- [x] Run typecheck/lint/build/format/diff check; record new verification evidence below.
- [x] Review diff and complete handoff without assuming source/static passes equate to E2E.

This document was recreated per user confirmation: the previous report was deleted
in the working tree at the start of the task. No other files were restored.

## Git Context

| Repo | Branch | HEAD audit | Working tree at start |
| --- | --- | --- | --- |
| FE | `feat/109-driver-location-sharing` | `cbb944a755bc4f6aae09aefce861fcf39799edbe` | Only UC-53 report deletion; user authorized recreation |
| BE (read-only) | `feat/23-implement-logout` | `52d0b43d2a02654a666c9db9cfaac1493b2e7d98` | Clean |
| Documentation | `main` | `99c23cc1687756f5e960e5313305fd4b7a705b10` | Pre-existing changes in `screen/flow6-frontend-task-assignment.md`; preserved |

Do not stage, commit, push, switch branches, reset, stash, pull, merge, or rebase.
Phase 1 source is in current HEAD; do not restart Phase 1. FE final state
consists of 7 tracked modified files and 4 new files, all within UC-53 or one UC-49 label line
(detailed below). Do not modify BE, DB, env, dependencies, or teammate features.

## 1. Audited Sources and Conclusions

### FE and Documentation

- Read Phase 1 report from `git show HEAD:src/features/location-sharing/UC53_IMPLEMENTATION_REPORT.md`
  since the file was deleted from the working tree; recreation of this report is confirmed.
- Read entire Phase 1 source in `src/features/location-sharing/**`.
- Read `src/features/ongoing-transport/routes.tsx`, `pages/TransportOverviewPage.tsx`,
  `hooks/useTransportOverview.ts`, `hooks/useTransportQueryContext.ts`, `services.ts`,
  `source.ts`, `schemas.ts`.
- Read `src/features/auth/store.ts`, `access-control.ts`, `types.ts`, `src/lib/axios.ts`,
  `src/lib/env.ts`, `package.json`; reused shared Button, Badge, Skeleton, ErrorState, and CSS tokens.
- Cross-referenced `../pegaxus-document/api-contract/flow4.md` §7, particularly GP2/GP3,
  `use-case/use-case-details/flow4/UC-53-track-realtime-location.md`, and
  `screen/flow4-frontend-task-assignment.md`.

The legacy UC contained promises of a background worker/Always Allow and dependency on UC-50.
Do not implement these: UC-50 is NOT_USE; web foreground sender cannot guarantee execution when the screen is locked.
Do not modify original documentation or infer that the sender has GP1/viewer permissions.

### BE Current Checkout (Unmodified)

| Source under `../pegaxus-be/` | Evidence |
| --- | --- |
| `Pegaxus.API/Controllers/TransportLocationsController.cs` | `RecordAsync`, `PermissionDeniedAsync`: two POST endpoints, `DriverPolicy` |
| `Pegaxus.Service/LocationTrackingService/Request.cs` | `LocationRequest`: required per validator and optional metadata |
| `Pegaxus.Service/LocationTrackingService/Response.cs` | `Accepted(ServerTime)`, `PermissionDenied(Notified)` |
| `Pegaxus.Service/LocationTrackingService/Validator/LocationRequestValidator.cs` | Required coords/time, ranges; recordedAt not default and not exceeding server +5 min |
| `Pegaxus.Service/LocationTrackingService/Service.cs` | `ActorAsync`, `DriverTransportAsync`, `TransportAsync`: active account, DRIVER, assignment, IN_TRANSIT |
| `Pegaxus.Service/LocationTrackingService/Locations.cs` | `RecordAsync`: ACK duplicate/older; latest in RAM, geofence may record actual arrival |
| `Pegaxus.Service/LocationTrackingService/PermissionDenied.cs` | `PermissionDeniedAsync`: 10-minute cooldown, RC recipients, notified may be false |
| `Pegaxus.Service/LocationTrackingService/TrackingState.cs` | Latest GPS and cooldown per process; not DB GPS history |
| `Pegaxus.API/Extensions/JwtExtensions.cs` | DriverPolicy uses role DRIVER, not viewer policy |

BE assignment requires an internal Driver assigned to a segment of a plan that is CONFIRMED/ACTIVE/COMPLETED,
where the segment is not superseded or has already started. FE does not reproduce this assignment check.

## 2. FE–BE GP2/GP3 Contract Matrix

Service paths below are relative to Axios base `/api/v1`; without duplicating prefixes.

| API | Endpoint | BE Conditions | Request | `value` Response | FE Boundary | Conclusion |
| --- | --- | --- | --- | --- | --- | --- |
| GP2 | `POST /transports/{transportId}/locations` | Assigned DRIVER, Transport IN_TRANSIT | `LocationRequest` JSON | `{ serverTime: string }` | `locationSharingService.send`, `driverLocationRequestSchema`, `driverLocationAcceptedSchema` | MATCH in source; RUNTIME NOT VERIFIED |
| GP3 | `POST /transports/{transportId}/locations/permission-denied` | Same preconditions | No body (`undefined`) | `{ notified: boolean }` | `locationSharingService.permissionDenied`, `locationPermissionDeniedSchema` | MATCH in source; RUNTIME NOT VERIFIED |

| GP2 field | BE DTO / Validation | FE Actually Sends |
| --- | --- | --- |
| `latitude` | decimal?, validator required −90..90 | `coords.latitude`, required number within range |
| `longitude` | decimal?, validator required −180..180 | `coords.longitude`, required number within range |
| `recordedAt` | DateTimeOffset?, required; not exceeding server +5 min | ISO string from original `position.timestamp`; not altered to send time |
| `speedKmh` | decimal?, optional/null, ≥0 | Browser speed m/s × 3.6 only when finite and nonnegative |
| `headingDegrees` | decimal?, optional/null, 0..359, integer not enforced | Sent only if finite and within BE range; 359.5 omitted, no fake clamping |
| `accuracyMeters` | decimal?, optional/null, ≥0 | Sent only for finite, nonnegative browser metadata |
| `routePlanRouteId` | Guid?, optional/null, not Guid.Empty; BE verifies effective route | Omitted because adapter does not currently provide verified current segment ID |

Keep identifiers as `z.string()`, avoiding UUID regex or numeric coercion. Optional metadata
that is invalid/null/NaN/Infinity is omitted rather than replaced with 0. Invalid coordinates cause the entire sample to be dropped.
GP3 does not generate a `{}` body or fake notifications.

Responses pass through `locationEnvelopeSchema` (`isSuccess`, numeric `code`, `message`,
optional/nullable `errorCode`, `value`), requiring success and a 2xx code before parsing value.
Axios resolve is not treated as automatic success. Axios interceptor currently returns `response.data?.data ?? response.data`;
it does not unwrap `value`, so the service parses the envelope at the proper layer.

## 3. Routing, Source, and Authorization

- Retain `/crew/transports/:transportId/location`, lazy page within existing CrewShell.
- Parent DRIVER/ESCORT and child DRIVER-only ProtectedRoute remain unchanged; do not edit router/route-config.
- Driver entry from Crew Overview only when IN_TRANSIT/online/no error; remove only the `Phase 1` label.
- Back navigates to `/crew/transports/:transportId`; do not create Home `/crew`.
- OT3 adapter continues using `useTransportOverview(transportId, undefined, "crew", "data", false)`.
  Do not add polling, query GP1/OT2, or import internal UC-49 services from sender.
- Sender hook validates account/principal, normalized DRIVER, existing token, sessionVersion,
  available context, matching transportId, status IN_TRANSIT, real source, and capability.
- `source="mock"` always disables Start; never send real GPS for demo IDs. Do not build mock senders,
  mock notifications, fake coordinates, or fallback success.
- OT3 source selects mock only in development/test when `VITE_ENABLE_FLOW4_MOCKS === "true"`; PROD is always false.
  Sender service has no mock branch; it is only invoked by UI/controller after real-context guard passes.
- API base continues using `VITE_API_URL` from shared configuration. Do not modify or read secrets,
  do not hardcode hosts, and do not verify running Vite/deployment process configuration.

OT3 read authorization is not proof that GP2 will be permitted. BE retains the authority
to reject assignment/status. When context updates to invalid or encounters a read error, sender stops.
Because the adapter does not poll, status changes not yet known to the FE will be detected at GP2 or
when context refreshes; FE does not claim proactive instantaneous awareness of server-side changes.

## 4. Modified Files

| File | Changes |
| --- | --- |
| `src/features/location-sharing/services.ts` | New: GP2/GP3 via Axios, envelope/value parsing, safe error mapping |
| `src/features/location-sharing/position.ts` | New: Cadence/freshness constants, GeolocationPosition → GP2 DTO |
| `src/features/location-sharing/sender.ts` | New: Lifecycle controller, watcher/timers/abort/generation and permission observer |
| `src/features/location-sharing/hooks/useLocationSharing.ts` | New: Auth/context binding and useSyncExternalStore, no auto-Start |
| `src/features/location-sharing/schemas.ts` | Added envelope schema; preserved Phase 1 request/response schemas |
| `src/features/location-sharing/types.ts` | Added active/sending/restart lock/notification, waiting/paused states |
| `src/features/location-sharing/pages/DriverLocationSharingPage.tsx` | Connected hook; removed preview/Phase 1 text; kept context/loading/error/layout |
| `src/features/location-sharing/components/LocationSharingControl.tsx` | Real Start/Stop, prominent denied warning, authentic GP3 results |
| `src/features/location-sharing/components/LocationSharingDetails.tsx` | Differentiated permission/network/sending/ACK; last send includes seconds, foreground guidance |
| `src/features/location-sharing/UC53_IMPLEMENTATION_REPORT.md` | Recreated/updated report per user request |
| `src/features/ongoing-transport/pages/TransportOverviewPage.tsx` | Removed `Phase 1` label from UC-53 entry only; preserved query/section/permissions |

Do not modify `routes.tsx`, auth/Axios, shared UI, live-tracking/handover by Uyen,
horse-health/Crew Home by Khuyen, or BE. Do not modify Phase 1 CSS or add map dependencies.

## 5. Real GPS Lifecycle

```text
Mount → stopped / permission not_requested / no ACK yet
Driver Start + valid real context
  → watchPosition + optional Permissions API observer
  → prompt / acquiring → actual fresh position → send opportunity
  → validated GP2 ACK → last send acknowledged
Stop / unmount / change transport or account/session / auth lost
  → clearWatch + clear timers + abort + generation++ + drop sample
```

Controller is instantiated only on mount; no automated GPS/permissions queries. `start()` is
the sole path to initiate a session. Following an explicit Start, `watchPosition` uses
`enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 20000`.

The Permissions API (if supported) is observed **after Start** to differentiate between prompt/granted and
to detect revocation. Querying permission does not trigger a permission prompt. If the descriptor
is not supported, use the real watch success/error callbacks. Transitioning from granted to prompt
stops the session and requires a new Start; denied routes through GP3 logic. Never simulate Granted.

`getSnapshot()` remains stable until publish; useSyncExternalStore subscribes to the controller.
Coordinates do not reside in React UI state, raw coordinates are not rendered, and coordinates are not logged.

## 6. 15-Second Cadence and Freshness Policy

1. Samples must have a finite, positive, non-future timestamp with an age of **0..15,000 ms**.
   This is a cautious FE policy, distinct from the BE +5 minute rule, and does not alter the BE contract.
2. Each acquisition/resume records a local `acquiredAfter` timestamp; points prior to this mark
   are discarded. Within an acquisition, only strictly increasing timestamps are accepted; duplicates/older points are dropped.
3. Maintain only **one latest sample in RAM**, replaced when a newer observation arrives. No history or queue.
4. The first fresh sample can be transmitted immediately in the initial lifecycle. Subsequent transmissions use recursive
   setTimeout for a send opportunity after 15 seconds; `performance.now()` verifies elapsed time.
   Rapid Stop/Start cycles on the same controller do not reset the attempt timestamp to generate bursts.
5. Each tick verifies auth, context, foreground visibility, network connectivity, and sample freshness. If there is no valid
   sample or a GP2 request is in flight, the tick is skipped without accumulating backlog.
6. The sample is consumed before the request is issued; errors do not cause retransmission of that sample. Network errors, 400s,
   or 5xx responses discard any sample captured during the failed request and require a fresh observation.
7. Module-level GP2 flight lock prevents overlapping requests even while an older request settles after abort.
   Owner lease prevents two controllers from concurrently claiming the watcher within a single JS realm.
8. A separate deadline timer based on remaining freshness budget aborts the request when the sample expires.
   Shared Axios auth refresh is preserved, but the signal prevents retrying an expired payload following a slow token refresh.
9. Delayed timers trigger only one opportunity when fired; subsequent intervals are scheduled from that point forward;
   no catch-up behavior, and no reliance on exact background setInterval timing.

The scheduler timer and request-expiry timer serve distinct purposes, both cleaning up appropriately.
Do not use workers, localStorage, IndexedDB, sessionStorage, or analytics for GPS data.

## 7. GP2 ACK, Errors, and GP3 Denial

`lastSuccessfulTransmissionAt` is updated exclusively with the validated `value.serverTime` from GP2.
Stop does not clear the last ACK history in an active session, but changing transport/account/session
resets UI state. The display label is **Last send acknowledged**, not LIVE GPS. The BE may ACK
duplicate/older points without broadcasting or re-geofencing, so the FE does not assert a new location.

| Scenario | Source Behavior |
| --- | --- |
| 401 | Uses shared auth/refresh; stops on failure without bypass. Auth subscription unsubscribes immediately upon clearAuth or session change |
| 403 / FORBIDDEN | Stops/aborts, displays assignment/permission notice, refreshes OT3 |
| 404 / TRANSPORT_NOT_FOUND | Stops/aborts, notifies transport not found, refreshes OT3 |
| 409 / INVALID_TRANSPORT_STATUS | Stops/aborts, refreshes OT3, does not alter local Transport status |
| 400 / VALIDATION_ERROR | Does not retry invalid sample; waits for fresh observation, preserves send error feedback |
| Network / 5xx | Does not queue or replay; next fresh sample at a future opportunity will be attempted |
| Response/request fails Zod validation | Stops without recording success; prompts user to reload or contact support |
| Request exceeds freshness budget | Aborts; does not acknowledge success, waits for new observation |
| GPS POSITION_UNAVAILABLE / TIMEOUT | Drops sample; displays GPS unavailable/timeout, watch may recover, no GP3 call |
| GPS PERMISSION_DENIED or observer denied | Stops acquisition/scheduler, displays prominent red warning; triggers GP3 on denial transition |

Following a terminal error, Start remains locked until real context is re-verified with a new serverTime
or a full page reload replaces the controller; no automatic restart occurs after refresh. If the refreshed status
is not IN_TRANSIT or permissions are invalid, Start remains locked according to guard conditions.

GP3 is invoked only once per denial transition in a started workflow, provided auth, context,
network connectivity, and foreground visibility remain valid. Cleanup and generation counters ensure duplicate
watch callbacks and observer notifications do not produce duplicate denial calls. Stop, timeout, and offline states
do not invoke GP3; GP3 is never queued or retried automatically.

| GP3 Result | UI |
| --- | --- |
| Validated `notified: true` | Only in this case does the UI indicate that the coordinator has been notified |
| Validated `notified: false` | No new notification sent; may indicate active cooldown or absence of recipients |
| Error / Network loss / Abort | Does not confirm notification, does not retry automatically |

The 10-minute cooldown and recipient routing are managed by the BE. If the Driver deliberately restarts and is denied
again, it constitutes a new workflow attempt; FE does not fabricate cooldowns or simulated notification services.

## 8. Offline, Background, and Cleanup/Race Protection

| Event | Handling |
| --- | --- |
| Offline / Tab hidden | Clear watch, timers, abort request, drop sample; retain active intent with offline/paused status |
| Online + Tab visible again | Re-establish watch only in an active session with valid permissions; await fresh post-resume observation |
| pagehide / Navigation away | Stop completely; returning via bfcache requires an explicit new Start |
| Manual Stop | Release resources, display "stopped by you", never invoke GP3 |
| Unmount / transportId / account / session change | Full cleanup; new account/transport does not inherit sample/ACK or auto-Start |
| Role / token / account unavailable | Auth store subscription stops immediately without awaiting React render |
| Context known invalid | Hook configuration stops, avoiding use of stale read-error cache |
| Response/callback from older generation | Discarded without modifying UI or resuming sharing |
| Rapid Start/Stop | Guarded by active state, owner lease, clearWatch, single scheduler, and global flight lock |

An abort cannot rollback a POST already received by the BE. If a response is lost or aborted after BE processing,
the FE cannot verify whether geofence/notification events executed and will not fabricate an ACK. Cancellation
prevents subsequent FE actions without guaranteeing DB rollback. Flight locking applies within a single JS realm;
it does not coordinate across multiple browser tabs or devices. The BE remains authoritative for ACKing duplicate/older points per transport.

Browser GPS execution cannot be guaranteed when the screen is locked. Visibility events may be delayed
when the browser/OS suspends; resume always discards older samples without catch-up.

## 9. Mobile UI and States

Preserve Phase 1 layout and tokens: 16px body, targets ≥48px, primary action button ≥64px, text wrapping,
max-w-4xl, single-column on mobile, two columns on desktop, bottom safe-area; no animations or maps.
Physical measurements on 320/360/390/430px devices and formal contrast/overflow verification have not been performed.

UI distinguishes between: Not sharing, Requesting permission, Acquiring location, Waiting for successful
send, Last send acknowledged, Offline, Hidden-page pause, Permission denied, GPS unavailable,
Unsupported browser, Transport unavailable, Send error, and Stopped by you.
Permission granted does not imply active transmission; network online is merely a browser hint.
ACK timestamp displays down to seconds; sensitive coordinates are never rendered. Entry points, Back navigation, Refresh journey,
and context loading/error handling are preserved. Mock banner clearly indicates Start is disabled rather than simulating Sharing ON.

## 10. Phase 2 Validation

Final results recorded directly from commands executed in this session, not reused from Phase 1.

| Command / Check | Result |
| --- | --- |
| `corepack pnpm exec tsc -b --pretty false` | PASS, exit 0 |
| `corepack pnpm run lint` | PASS, exit 0 |
| `corepack pnpm exec oxlint src/features/location-sharing src/features/ongoing-transport/pages/TransportOverviewPage.tsx` | PASS, 0 diagnostics |
| `corepack pnpm run build` | PASS, exit 0 |
| `corepack pnpm exec prettier --check` on 10 new/modified files listed in §4 | PASS: All matched files use Prettier code style |
| `git -c core.safecrlf=false diff --check` | PASS, exit 0 |
| Privacy source audit | No logging/persistence of coordinates, no analytics, GPS history, GP1 receiver, or queues |
| Automated tests | Not created or executed per task instructions |
| Browser/mobile/GPS/GP2/GP3 E2E | Not executed; no runtime PASS claimed |

Initial typechecks identified TS1294 due to constructor parameter properties being incompatible with
`erasableSyntaxOnly`; resolved by converting to explicit fields. Scoped lint warned on no-this-alias
in the owner lease; added inline suppression with documented justification rather than disabling rules project-wide.
Warnings in teammate modules were left untouched.

## 11. Runtime Status, Limitations, and Handoffs

- **Real HTTP mutation count in this session: ZERO (0).** No GP2/GP3 smoke tests, no simulated GPS
  transmitted to the server, no notification/geofence mutations, no logins or other mutation APIs invoked.
- Browser was not opened, Start was not clicked. No geolocation acquisition or permission prompt occurred
  during development; typecheck, lint, and build verify source code only. **NOT VISUALLY VERIFIED**.
- Authenticated GP2/GP3 endpoints, physical GPS hardware, CORS, deployment HTTPS, actual backend assignments,
  and deployed commit hashes have not been verified. Current local BE checkout does not guarantee deployment alignment.
- No source endpoint blockers identified in audited BE; runtime data and environment configuration remain unverified.
- BE latest GPS and cooldown state reside in per-process RAM; server restarts lose state. Scale-out requires
  shared ephemeral state or backplanes on the BE. No BE changes were made in this task.
- Khuyen: Preserve Crew Home and assigned cards; entry URL `/crew/transports/{transportId}/location`
  via helper `src/features/location-sharing/navigation.ts`; do not implement Home here.
- Uyen: Viewer GP1, SignalR, and map components remain within live-tracking, independent of sender; do not call GP1 for Driver.
- BA / Documentation Owner: Update UC-50 as NOT_USE and clarify foreground requirements; do not promise native background tracking.

## 12. Manual QA — Isolated Environment Only

Do not run QA against staging, shared, or production environments, or assumed-safe fixtures.
Because GP2 may record arrival and GP3 triggers notifications, the BE owner must supply an isolated
test transport, dedicated test accounts, test recipients, and formal mutation authorization prior to testing.

1. Configure Vite/BE in isolation only with explicit permission; API URL must point to the test BE with mocks disabled,
   running on trusted localhost or HTTPS, with an authentic Driver assigned to an IN_TRANSIT transport.
2. Navigate to `/crew/transports/{transportId}/location`: verify that mounting triggers no permission prompt or POST;
   page reloads must not auto-Start. Compare code and current leg with OT3.
3. Once mutation is authorized, press Start while parked; grant permission → acquiring → actual GPS →
   GP2 POST. Verify JSON timestamp matches measurement timestamp, optional metadata is valid, no fake route IDs exist, and ACK/serverTime is received.
4. Observe across multiple intervals: verify no overlapping requests, no duplicate POSTs per callback, each request transmits
   a fresh point, and "last send acknowledged" is never labelled as LIVE GPS.
5. Click Stop, followed by rapid Start/Stop, Back navigation, page reload, and account/transport switches: confirm no watcher
   or timer leaks, delayed responses do not modify UI, and outdated transport/account points are never reused.
6. In isolation only, Deny/revoke permissions while active → verify warning appears; verify single GP3 request with no body on denial transition.
   `notified: false` must not state that a notification was sent; manual Stop or timeouts must not issue GP3 calls.
7. Disconnect network, hide tab, or lock screen → verify pause; re-enabling network and bringing tab foreground resumes with a fresh point,
   never replaying missed points. Navigating away via pagehide and returning requires a manual Start.
8. Test error responses (400, 401, 403, 404, 409, 500, malformed envelope) with isolated fixtures: verify shared auth handling,
   terminal stop with reload lock, no simulated success, and slow token refreshes do not retry expired points.
9. Verify Driver in READY/COMPLETED status or with mock context cannot click Start; Escort, Admin, and Customer roles cannot access Driver routes.
   Never alter account roles to circumvent ProtectedRoute.
10. Verify layout on 320px, 360px, 390px, and 430px viewports as well as physical devices: text wrapping, focus indicators, 48px touch targets,
    warning visibility, absence of clipping or overflow, and ensure Stop is operable while offline, paused, or in-flight.

Prior to production deployment, manual QA must validate lifecycle handling, race conditions, target browser GPS/permissions,
network and auth refresh behaviors, as well as geofence and notification side effects.

## NEXT CODEX SESSION CONTEXT

- Workspace `D:/FPT/FA26/SWP391/pegaxus-fe`, branch `feat/109-driver-location-sharing`,
  HEAD audit `cbb944a`; run Git status before proceeding, preserving the 11 modified UC-53 files.
- Recreated report per user authorization; do not restore other files.
- Phase 2 source is located in `sender.ts`, `position.ts`, `services.ts`, `hooks/useLocationSharing.ts`;
  existing UI is wired to Start/Stop. Do not revert to disabled Phase 1 state or introduce new routers.
- Route `/crew/transports/:transportId/location`, CrewShell, DRIVER child guard, and OT3 adapter
  are preserved. Only the Phase 1 label in Overview was removed; no changes to UC-49 queries or lifecycle.
- Start requires real context with IN_TRANSIT status and authentic DRIVER session. Mock context locks GPS.
- Freshness is constrained to 0..15s; no future, pre-acquisition, or duplicate samples; recursive timer,
  single flight with owner lease, and deadline abort prevent Axios refresh from retrying expired samples.
- Stop, unmount, session changes, or context loss trigger full cleanup of watchers, permission observers, timers, and abort controllers.
  Offline/hidden states pause; returning online and visible resumes fresh without replaying past points.
- GP2 response envelope and serverTime validated; ACK does not imply new broadcast. GP3 sends no body on genuine denial;
  `notified: false` is valid; no automated notification retries or offline queues.
- Read-only BE at `52d0b43`, documentation at `99c23cc`; re-audit if backend repository updates.
- **0 real HTTP mutations, no automated tests, SOURCE AUDITED — RUNTIME NOT VERIFIED, NOT VISUALLY VERIFIED.**
- Teammate features (live-tracking, handover, horse-health, Crew Home, auth/Axios, shared UI, BE/DB/env) remain untouched.
  No dependencies added, no Git commit/push/stage/switch/reset/stash/merge performed.
- Manual isolated QA authorization required prior to real Start/Deny testing; do not proceed to subsequent phases without approval.

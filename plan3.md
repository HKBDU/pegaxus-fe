# PLAN 3: INTEGRATING GPS SIMULATOR WITH ONGOING TRANSPORT MAP (100% ENGLISH ONLY)

> **Project:** Pegaxus (SWP391)  
> **Status:** Awaiting User Review & Approval  
> **Language Standard:** 100% English Only (Code, UI, telemetry, labels, comments)

---

## 1. EXECUTIVE SUMMARY & SCAN OF ONGOING TRANSPORT FLOW

### 1.1. System Overview & The Core Problem
In the **Pegaxus** equine logistics platform, evaluating real-time vehicle movement during presentations is a primary evaluation criterion for SWP391. However, during a laptop demo in a presentation room:
- The device is physically stationary (no road movement).
- The live tracking map in Ongoing Transport requires real-time GPS stream updates (`LocationUpdated` events via SignalR or mock streams).
- The existing dev-only demo panel in `src/features/live-tracking/mock/DemoPanel.tsx` is basic, hardcodes a European route (Paris-Lille), lacks speed controls (cannot fast-forward 300 km/h), lacks scrubber sliders, and is completely disconnected from the actual transport journey.

### 1.2. Architecture Scan of Ongoing Transport & Map Components

```
+----------------------------------------------------------------------------------------------------+
|                                    ONGOING TRANSPORT WORKFLOW                                      |
+----------------------------------------------------------------------------------------------------+
|  1. Entry & Navigation:                                                                            |
|     - Admin Path: /admin/ongoing-transports/:transportId                                           |
|     - Customer Path: /bookings/:bookingId/transports/:transportId                                  |
|     - Crew Path: /crew/transports/:transportId                                                     |
|                                                                                                    |
|  2. Ongoing Transport Shell (TransportDetailLayout.tsx):                                           |
|     - Tab 1: Overview (/overview) - Journey metadata, crew, active incidents, horse health summary |
|     - Tab 2: Route Tracking (/segments) - Timeline of legs, border gates, planned/actual times     |
|     - Tab 3: Horse Health (/health) - Equine welfare and vital check logs                          |
|     - Tab 4: GPS Map (/gps) - Live interactive MapLibre map (GpsTabPage.tsx)                        |
|     - Tab 5: Handovers (/handovers) - Driver segment handovers, custody signatures                 |
|                                                                                                    |
|  3. Live Tracking Engine (features/live-tracking/):                                                |
|     - useLiveTruck.ts: Core coordinator hook managing truck state, trail points, clock skew.        |
|     - TrackingMap.tsx: MapLibre GL viewer rendering TruckMarker, TrailLayer, GapLayer, Stops.      |
|     - streams.ts: Connects to SignalR Hub /hubs/transport-tracking via openTrackingStream().       |
|     - signal.ts: Classifies signal quality:                                                        |
|         * LIVE: Delay <= 30s (Green pulsing indicator)                                             |
|         * DELAYED: Delay 30s - 120s (Amber warning badge, Last seen HH:mm)                         |
|         * LOST: Delay > 120s (Red alert badge, Trail break into gray dashed GapLayer)              |
|     - useRouteEstimate.ts: Dynamically recomputes remaining distance and arrival ETA.              |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. INTEGRATION STRATEGY: UNIFIED DUAL-VIEW SIMULATION

We will create a **Unified GPS Simulation Engine** that serves both:
1. **The Ongoing Transport GPS Map View (`/admin/ongoing-transports/:id/gps`)**:
   - Presenter can demo directly on the map without switching windows.
   - An interactive, clean **GPS Simulator Drawer / Control Bar** sits over the map.
   - Allows starting/pausing the vehicle, fast-forwarding at 1x, 2x, 5x, 10x speed, scrubbing along the route, triggering signal loss, and testing destination arrival geofencing.
2. **The Driver Location Sharing View (`/crew/transports/:id/location`)**:
   - For 2-device presentations (e.g., driver phone + projector map), the driver screen can transmit the coordinates, and the Ongoing Transport Map receives and animates them via SignalR.

```
                       +---------------------------------------------+
                       |        UNIFIED GPS SIMULATION ENGINE        |
                       |          (src/shared/simulator/)            |
                       |  - Geo-Math (Haversine, Bearing, Jitter)    |
                       |  - Route interpolation & Geoapify snapping  |
                       |  - Speed controls (30 to 600 km/h)          |
                       |  - Signal loss & Geofencing triggers        |
                       +---------------------------------------------+
                                      |               |
             +------------------------+               +------------------------+
             v                                                                 v
+---------------------------------------+             +---------------------------------------+
|         DRIVER SHARING VIEW           |             |         ONGOING TRANSPORT MAP         |
|   (/crew/transports/:id/location)     |             |  (/admin/ongoing-transports/:id/gps)  |
|                                       |             |                                       |
| - Feeds mock Web Geolocation into     |             | - Embedded Simulator Control Drawer   |
|   LocationSender (sender.ts)          |             |   directly on the MapLibre Map!       |
| - Sends GP2 POST requests to BE       |             | - TruckMarker rotates along highway   |
| - Telemetry HUD (Speed, Heading, Lat) |             | - TrailLayer (blue) & GapLayer (gray) |
+---------------------------------------+             | - Real-time dynamic ETA calculation   |
                                                      +---------------------------------------+
```

---

## 3. STRICT 100% ENGLISH ONLY SPECIFICATION

Every single UI string, button, badge, tooltip, log, and mock dataset will be 100% in professional English.

### UI Label Dictionary:
| Function | UI Text (100% English) | Description |
| :--- | :--- | :--- |
| Simulator Header | **Driver GPS Simulator (Demo Mode)** | Header badge and title |
| Power Toggle | **Enable Mock GPS** / **Disable** | Switches between hardware GPS and Simulator |
| Playback | **Start Trip** / **Pause** / **Reset** | Primary simulation playback controls |
| Loop Mode | **Loop Route: Enabled / Disabled** | Continuously replays the route when finished |
| Speed Presets | **60 km/h (Normal)**, **120 km/h (2x)**, **300 km/h (5x Fast)**, **600 km/h (10x Turbo)** | Speed control presets |
| Scrubber | **Progress: {progressPercent}% ({distanceCovered} / {totalDistance})** | Interactive range slider |
| Signal Loss Test | **Simulate Signal Loss** / **Restore Signal** | Triggers GapLayer & DELAYED / LOST status |
| Signal Loss HUD | **Signal Lost: {seconds}s (Status: DELAYED / LOST)** | Live timer during simulated blackout |
| Geofence Test | **Jump Near Station (Test Geofence)** | Instantly places vehicle 350m before destination |
| Telemetry HUD | **LAT: {lat} | LON: {lon} | SPEED: {speed} km/h | HEADING: {heading}°** | Dark glassmorphism HUD bar |
| Mock Route Stables | **Hanoi Equine Quarantine Facility -> Danang Transit Terminal** | Clean international naming |

---

## 4. DETAILED IMPLEMENTATION ROADMAP

### Phase 1: Shared Simulation Engine (`src/shared/simulator/`)
1. **Math Core (`engine.ts`)**:
   - `haversineDistance(a, b)`: Exact geodesic distance in meters.
   - `calculateBearing(a, b)`: Clockwise angle from True North (0° - 359.9°).
   - `positionAtDistance(route, distanceMeters)`: Linear interpolation on line segments.
   - `addGpsJitter(lat, lon, noiseMeters)`: Realistic micro-jitter within 4 decimal places.
2. **Stream Bridge (`streamBridge.ts`)**:
   - Broadcasts simulated truck samples to `openTrackingStream` (so Ongoing Transport Map updates immediately even in offline/demo mode without backend).
   - Also feeds `mockGeolocation.ts` (so driver screen transmits real GP2 HTTP requests).

### Phase 2: Ongoing Transport Map Integration (`src/features/live-tracking/`)
1. **Upgrade `GpsTabPage.tsx` & `TrackingMap.tsx`**:
   - Mount the **GPS Simulator Control Widget** as an overlay above the map.
   - When the user starts simulation, the truck marker drives along the actual road on the map.
   - The map dynamically renders:
     - Blue dashed line (`TrailLayer`) showing the driven path.
     - Pulsing green circle when status is `LIVE`.
     - Gray dashed line (`GapLayer`) with `"No signal · X min"` when signal loss is triggered.
     - Dynamic ETA and distance updates via `useRouteEstimate`.

### Phase 3: Route Integration & Realistic Snapping
1. Support automatic loading of route geometry:
   - Uses Geoapify routing preview (`previewGeoapifyRoute`) between the transport's starting and ending stations.
   - Includes geodesic curve fallback if offline or API key is absent.
   - Supports uploading custom `.geojson` line files via modal.

### Phase 4: Standalone Demo Route Setup
1. Configure `/admin/ongoing-transports/demo/gps` and `/crew/transports/demo/location` to open with full mock context:
   - Status: `IN_TRANSIT`
   - Active driver: `Alex Turner (Lead Driver)`
   - Route: `Hanoi Equine Quarantine Facility -> Danang Transit Terminal` (760 km)
   - Zero login barriers, no 401/404 errors.

### Phase 5: Code Quality & Verification
1. Run `pnpm exec oxlint src/` (0 errors, 0 warnings).
2. Run TypeScript build verification (`tsc --noEmit`).
3. Validate interactive browser execution via `browser_subagent`.

---

## 5. DEMO SCENARIO FOR YOUR COMMITTEE PRESENTATION (3-MINUTE SCRIPT)

1. **Step 1: Open Ongoing Transport GPS Map (`0:00 - 0:45`)**
   - Open `/admin/ongoing-transports/demo/gps`.
   - Show the planned route on MapLibre GL with checkpoints (origin and destination stables).
   - Expand the **Driver GPS Simulator** overlay.
2. **Step 2: Real-time Movement & Heading Rotation (`0:45 - 1:45`)**
   - Click **Start Trip**. Select **300 km/h (5x Fast Demo)**.
   - The truck icon starts driving along the highway, turning smoothly at bends (`headingDegrees`).
   - Point out the blue trail (`TrailLayer`) drawing behind the truck and the live ETA counting down.
3. **Step 3: Signal Loss & Gap Detection (`1:45 - 2:30`)**
   - Click **Simulate Signal Loss**.
   - Show the signal pill change from `LIVE` (Green) to `DELAYED` (Amber) after 30 seconds.
   - After 2 minutes, show status turn to `LOST` (Red) and the map render the gray dashed segment (`GapLayer`) labeled `"No signal · 2 min"`.
   - Explain to the committee: *"The system never draws unrealistic straight lines across mountains; it explicitly detects and visualizes communication blackouts."*
4. **Step 4: Geofencing Arrival Warning (`2:30 - 3:00`)**
   - Click **Jump Near Station**.
   - Show the truck arrive within 350m of the destination boundary.
   - Display the geofence arrival detection trigger.

---

> ⚠️ **WAITING FOR USER APPROVAL**: No code will be written or modified until you review and confirm this plan.

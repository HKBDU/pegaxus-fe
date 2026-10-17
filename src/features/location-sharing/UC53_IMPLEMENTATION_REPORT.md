# UC-53 Phase 1 — Driver Location Sharing

Ngày: 17/10/2026. Phạm vi: **phía Driver gửi vị trí**, chỉ UI, route, read-only context và typed contracts. Không triển khai sender Phase 2.

**SOURCE AUDITED — RUNTIME NOT VERIFIED**

**NOT VISUALLY VERIFIED**

## 1. Git context và an toàn working tree

| Repository | Branch / HEAD kiểm tra | Trạng thái ban đầu |
| --- | --- | --- |
| FE `pegaxus-fe` | `feat/109-driver-location-sharing`, `3fd59617e354e739f73ba4f53ce825807685551e` | Sạch; đã chứa UC-49 Phase 1/2/3 |
| BE `../pegaxus-be` | `feat/23-implement-logout`, `52d0b43d2a02654a666c9db9cfaac1493b2e7d98` | Sạch; chỉ đọc |
| Tài liệu `../pegaxus-document` | Snapshot `99c23cc` | Có sẵn thay đổi `screen/flow6-frontend-task-assignment.md`; không đụng vào |

Không tạo/switch branch, pull, merge, rebase, reset, stash, stage, commit hoặc push. Chỉ sửa hai vùng integration UC-49 được cho phép và tạo feature `location-sharing`. Không chỉnh BE, DB, auth, `.env`, dependency hoặc source đồng đội.

`src/features/ongoing-transport/UC49_IMPLEMENTATION_REPORT.md` **không tồn tại trong checkout lúc audit**, đã kiểm cả feature và danh sách file repository. Không tự khôi phục báo cáo cũ hoặc coi nội dung hội thoại cũ là bằng chứng source hiện tại.

## 2. Nguồn đã audit

### Frontend

- `src/app/router.tsx`, `src/app/route-config.ts`: router đang spread `ongoingTransportRoutes`; chưa có route Home `/crew`.
- `src/features/ongoing-transport/routes.tsx`, `pages/TransportOverviewPage.tsx`, `components/CrewShell.tsx`, `TransportPageHeader.tsx`: parent Crew route và context.
- `src/features/ongoing-transport/hooks/useTransportOverview.ts`, `useTransportQueryContext.ts`, `schemas.ts`, `services.ts`, `source.ts`: OT3 đã validate, auth-scoped cache, abort/error và mock boundary hiện có.
- `src/features/auth/store.ts`, `access-control.ts`: `normalizeRole` trim/uppercase/bỏ prefix ROLE_; canonical role Driver là `DRIVER`, không phải `VEHICLE_DRIVER`.
- `src/shared/components/guards/ProtectedRoute.tsx`: không token → login, sai role → unauthorized; không thay behavior này.
- `src/lib/axios.ts`, `src/lib/env.ts`: Axios base URL/auth hiện có; interceptor không unwrap `value`, UC-49 service parse envelope rồi Zod.
- `src/shared/components/ui/button.tsx`, `badge.tsx`, `skeleton.tsx`, `src/shared/components/common/EmptyState.tsx`: primitives và ErrorState hiện có. Shared UI chưa có Alert riêng; dùng notice scoped trong feature.
- `src/index.css`, `package.json`: tokens `--primary`, `--background`, `--border`, `--sans`, `--heading`; React/TanStack Query/Zod/Lucide/Router đã được cài, không thêm package.

Tìm source `/crew` và `assigned-to-me`: chưa có Crew Home hoặc FE OT2 implementation trong checkout. BE có OT2 nhưng thuộc Home; task này không tự gọi hoặc triển khai OT2.

### Backend hiện tại

| File dưới `../pegaxus-be/` | Kết luận |
| --- | --- |
| `Pegaxus.API/Controllers/TransportLocationsController.cs` | GP2/GP3 tồn tại, DriverPolicy; GP1 là viewer endpoint, không dành cho Driver |
| `Pegaxus.Service/LocationTrackingService/Request.cs` | `LocationRequest`: tọa độ/thời điểm/optional metadata |
| `Pegaxus.Service/LocationTrackingService/Response.cs` | `Accepted(ServerTime)`, `PermissionDenied(Notified)` |
| `Pegaxus.Service/LocationTrackingService/Validator/LocationRequestValidator.cs` | Required/ranges, recordedAt không default hoặc vượt server time +5 phút |
| `Pegaxus.Service/LocationTrackingService/Service.cs` | `DriverTransportAsync` kiểm Driver, assignment, IN_TRANSIT; `ActorAsync`, `TransportAsync` kiểm account/transport |
| `Pegaxus.Service/LocationTrackingService/Locations.cs` | `RecordAsync`: latest point trong RAM, duplicate/older ACK, geofence có thể ghi actual arrival vào DB, không start segment |
| `Pegaxus.Service/LocationTrackingService/PermissionDenied.cs` | `PermissionDeniedAsync`: notification RC được phân công, cooldown 10 phút |
| `Pegaxus.Service/LocationTrackingService/TrackingState.cs`, `Journey.cs` | Latest point/cooldown theo process; effective route/current segment do BE xác định |
| `Pegaxus.API/Extensions/JwtExtensions.cs` | DriverPolicy khác TransportTrackingViewerPolicy; OT3 dùng TransportProgressViewerPolicy |
| `Pegaxus.Service/TransportService/Service.cs`, `Response.cs` | OT3 cho Driver được phân công, các trạng thái READY/IN_TRANSIT/COMPLETED; đây không phải kết quả authorize GP2 |

### Tài liệu

- `../pegaxus-document/api-contract/flow4.md`, §7 GP2/GP3, permission matrix và UC-50 NOT_USE.
- `../pegaxus-document/use-case/use-case-details/flow4/UC-53-track-realtime-location.md`.
- `../pegaxus-document/screen/flow4-frontend-task-assignment.md`, phần ownership Dương/Khuyên/Uyên và SCR-F4-014.

## 3. Business flow và ranh giới ownership

Luồng đích: Driver login → Crew Home assigned transport → Driver Transport Overview → Share Journey Location. Home của Khuyên chưa có trong checkout nên entry point hiện dùng trực tiếp Overview đã tồn tại.

| Owner | Phạm vi | Task này |
| --- | --- | --- |
| Dương | `location-sharing/**`, UC-49 entry/route boundary | Đã triển khai Phase 1 |
| Uyên | `live-tracking/**`, GP1, GPS viewer/map, realtime receiver | Không import hoặc sửa |
| Khuyên | Crew Home, `horse-health/**`, assigned transport cards | Không sửa, không tự dựng Home |

GP2 thực tế là mutation có thể ghi actual arrival; GP3 ghi notification. Vì vậy **không gọi thử hai API này**, kể cả để “test UI”. Không có vị trí nào được thu thập, gửi hay lưu trong feature Phase 1.

## 4. Routing và read-only context

### 4.1. Route cuối cùng

```text
/crew/transports/:transportId
  CrewShell + parent ProtectedRoute DRIVER/ESCORT
  ├── index       UC-49 Overview
  ├── segments    UC-49 Route Tracking
  └── location    UC-53 Driver Location Sharing
                   child ProtectedRoute DRIVER only
```

Route mở màn mới: **`/crew/transports/:transportId/location`**. Page được lazy-load. Không thêm router/shell thứ hai, không sửa central `router.tsx`, `route-config.ts` hoặc Home.

ESCORT bị chặn ở child guard; Admin/Customer không qua parent guard. FE dùng `canAccess`/ProtectedRoute hiện có, không mock role/identity. Assignment vẫn do BE thực thi.

### 4.2. Adapter ở route boundary

`ongoing-transport/routes.tsx` có `DriverLocationSharingRoute`:

1. Lấy transportId từ `useParams()`; không cần location.state.
2. Dùng lại `useTransportOverview(transportId, undefined, "crew", "data", false)`.
3. Map response OT3 đã qua Zod thành **UI projection** `DriverTransportContext`: transportId/code/status/serverTime và current leg number/from/to. Đây không phải DTO mới của BE.
4. Truyền props typed sang page `location-sharing`, không để feature mới import nội bộ service/hook/component UC-49.

Cùng query key với Crew Overview nên có thể tái sử dụng cache còn fresh; direct refresh hoặc cache stale có thể phát GET OT3 qua Axios. Không hứa “không có request mới”. Không có polling interval mới; reconnect và manual Refresh vẫn theo hook sẵn có. Authorization/schema/read error không bị đổi thành mock hoặc context thành công rỗng.

GET duy nhất có thể phát sinh từ màn này là **`GET /api/v1/transports/{transportId}/overview`**. Không có dedicated location-state GET, không gọi GP1, không gọi assigned transport API và không tạo service đọc trùng.

Nếu OT3 dùng mock Flow 4 hiện có, page hiện banner rõ “MOCK DATA” và assignment chưa được BE xác minh. Authentication vẫn thật. Không tạo mock switch hoặc fixture thứ hai. Mock context không phải quyền gửi GPS.

### 4.3. Entry và Back

- Trong UC-49 **Crew Overview**, Driver thấy link **Share Journey Location** khi OT3 trả IN_TRANSIT, đang online và không có read error.
- ESCORT/Admin/Customer không thấy link. READY/COMPLETED không hiện entry gợi ý gửi GPS.
- Link dùng transportId hiện tại qua `driverLocationSharingPath()`.
- Trang Location có Back → `/crew/transports/:transportId`; không trỏ `/crew` chưa đăng ký.
- Refresh URL trực tiếp tải OT3 và render cùng màn; không phụ thuộc navigation state.

Public navigation helpers nằm tại `src/features/location-sharing/navigation.ts`: `driverLocationSharingPath(transportId)` và `driverTransportOverviewPath(transportId)`; ID được encode, không UUID validation.

## 5. GP2/GP3 FE–BE contract boundary

**SOURCE AUDITED — RUNTIME NOT VERIFIED.** Schemas/types đã định nghĩa nhưng **chưa có mutation service/controller phía FE**.

| API | Method / endpoint đầy đủ | Role / điều kiện | Request | Response `value` | Phase 1 |
| --- | --- | --- | --- | --- | --- |
| GP2 | `POST /api/v1/transports/{transportId}/locations` | Driver được phân công; IN_TRANSIT | JSON `LocationRequest` bên dưới | `{ serverTime: string }` | Chỉ schema/type; không POST |
| GP3 | `POST /api/v1/transports/{transportId}/locations/permission-denied` | Cùng Driver/assignment/status preconditions | **Không body** | `{ notified: boolean }` trong envelope | Chỉ response schema/type; không POST |

| GP2 field | BE validator / nullability | FE `driverLocationRequestSchema` |
| --- | --- | --- |
| `latitude` | DTO decimal? nhưng validator bắt buộc, −90..90 | Required number −90..90 |
| `longitude` | DTO decimal? nhưng validator bắt buộc, −180..180 | Required number −180..180 |
| `recordedAt` | Bắt buộc DateTimeOffset; không default, không quá server now +5 phút | Required ISO datetime có offset; authoritative clock/default validation còn ở BE |
| `speedKmh` | decimal?, optional/null, ≥0 | Optional nullable number ≥0 |
| `headingDegrees` | decimal?, optional/null, 0..359; **không yêu cầu integer** | Optional nullable number 0..359 |
| `accuracyMeters` | decimal?, optional/null, ≥0 | Optional nullable number ≥0 |
| `routePlanRouteId` | Guid?, optional/null; Guid.Empty không hợp lệ; khi gửi phải thuộc effective route | Optional nullable `z.string()`; BE kiểm ID/pair, FE không UUID regex/coercion |

Responses có `driverLocationAcceptedSchema` và `locationPermissionDeniedSchema`. Phase 2 sẽ dùng Axios/auth/envelope hiện có rồi parse `value`; không nhân đôi prefix `/api/v1`.

### Authorization, errors và hành vi BE quan trọng

- Controller dùng `DriverPolicy`; service kiểm Account EMPLOYEE/DRIVER, employee active, assignment nội bộ trên plan CONFIRMED/ACTIVE/COMPLETED; segment chưa superseded hoặc đã bắt đầu.
- IN_TRANSIT là **Transport status**, không dựa vào nút Start Leg của UC-50.
- `401 UNAUTHORIZED`: account/session không hợp lệ; `403 FORBIDDEN`: sai role/không assigned; `404 TRANSPORT_NOT_FOUND`; `409 INVALID_TRANSPORT_STATUS`; `400 VALIDATION_ERROR`: tọa độ/thời gian/ID/segment không hợp lệ.
- OT3 có thể trả READY/COMPLETED với 200 trong khi GP2/GP3 sẽ từ chối 409. Màn Phase 1 giải thích trạng thái này và giữ nút disabled.
- GP2 ACK duplicate hoặc sample cũ bằng Accepted, không lặp geofence effects. Accepted chỉ có serverTime, không phải bằng chứng xe đã có một tọa độ mới hoặc signal đang live.
- GP3 cooldown theo `(transport, account)` 10 phút trong RAM; `notified=false` có thể do cooldown **hoặc không có RC phù hợp**, không phải lỗi cần spam retry. GP3 không tương đương Stop do người dùng chọn.
- Latest GPS/cooldown là per-process `TrackingState`; scale-out/backplane/shared ephemeral state thuộc BE. Không có GPS history trong DB, nhưng timestamp actual arrival và notification nghiệp vụ có thể được ghi.

## 6. Mâu thuẫn UC cũ và contract hiện tại

| UC-53 cũ | Hướng áp dụng cho implementation |
| --- | --- |
| “Luôn cho phép”, Web Worker/Service Worker duy trì GPS khi khóa màn hình | Không thể bảo đảm bằng browser web thông thường. UI nói rõ background/lock screen có thể gián đoạn; không dựng worker giả hoặc hứa native background tracking |
| Trigger từ xác nhận bắt đầu chặng, dependency UC-50 | Flow4 hiện ghi UC-50 NOT_USE; không tạo Start Leg action. Sender tương lai dựa Driver consent + Transport IN_TRANSIT + BE assignment |
| AC-004 “hoàn chỉnh vệt đường đã qua” | Contract/ALT-01/BR-046: không history, không nội suy, không queue/replay; dữ liệu lỡ bị bỏ. Vẽ vệt thuộc viewer của Uyên, không thuộc sender |
| Tên role VEHICLE_DRIVER trong văn bản | FE/BE source dùng canonical DRIVER; reuse normalizeRole thay vì thêm role alias riêng |
| Viewer và sender gộp trong một UC | Phase 1 này chỉ sender UI; không GP1/map/realtime receiver |

Không chỉnh tài liệu gốc; ghi nhận để BA/document owner cập nhật.

## 7. State model và UI thực tế

### 7.1. Các khái niệm tách biệt

`LocationSharingState` tách sharingStatus, permissionStatus, networkStatus và lastSuccessfulTransmissionAt. Model chuẩn bị các trạng thái `stopped`, `requesting_permission`, `acquiring_location`, `sharing`, `offline`, `permission_denied`, `location_unavailable`, `unsupported`, `transport_unavailable`, `send_error`.

**Production Phase 1 luôn render:**

```text
sharingStatus = stopped
permissionStatus = not_requested
lastSuccessfulTransmissionAt = null
networkStatus = online / offline / unknown từ browser hint
```

Không có start/stop reducer/controller hoặc toggle giả. Tên trạng thái tương lai trong types/labels không có nghĩa runtime đã xử lý permission denied/GPS/send error. Không hiển thị Granted, tọa độ hay timestamp giả.

`useLocationSharingEnvironment` chỉ đọc `navigator.onLine`, `window.isSecureContext` và **sự tồn tại** của Geolocation API. Dùng online/offline event với cleanup và primitive snapshot ổn định cho useSyncExternalStore. Không gọi `navigator.permissions.query`, GPS methods, timer hoặc API. “Online” được ghi rõ chưa xác nhận kết nối server.

### 7.2. Screen hierarchy và states

| Khu vực | Hành vi |
| --- | --- |
| Header | Back Overview, Location Sharing, nhãn Phase 1; không dùng GPS Map tab |
| Journey context | Code/status/current leg từ OT3; skeleton, read error/Retry, offline chưa có cache hoặc cached notice; null current leg có placeholder |
| Main control | Button min-height 64px, **disabled vĩnh viễn trong Phase 1**; thông báo không xin GPS/thu thập/gửi dữ liệu |
| Location & connection | Not sharing; Not requested; network hint; No location has been sent |
| Context feedback | READY/COMPLETED unavailable; offline; insecure context; browser không có API; lỗi read từ BE |
| Guidance | Chỉ thao tác khi đỗ xe, permission sẽ được hỏi ở Phase 2, HTTPS, foreground/background limitations, không offline replay |

Body Crew 16px, target tương tác ≥48px, brand orange/tokens hiện có, white/neutral surfaces và radius 2px. Single column mặc định, hai khối chính chuyển hai cột ở desktop; header/control cho phép wrap, text dùng overflow-wrap, không sticky chồng nội dung. Padding đáy có safe-area. Focus dùng primitives sẵn có; status announcements dùng aria-live/role=status, ErrorState role=alert; skeleton và toàn scope không animation/transition.

Đã rà source cho 320–430px nhưng **chưa có browser measurement/screenshot**; không khẳng định đã nghiệm thu overflow/contrast/tap size trên thiết bị thật. Không đọc phần trăm pin/CPU; không có scheduler hoặc GPS watch để tiêu hao liên tục.

## 8. Files mới/sửa và kiến trúc

| File | Loại / lý do |
| --- | --- |
| `src/features/location-sharing/pages/DriverLocationSharingPage.tsx` | Mới: page theo props route adapter, context/error/inactive states |
| `src/features/location-sharing/components/LocationSharingControl.tsx` | Mới: main control inactive, explanation và safety note |
| `src/features/location-sharing/components/LocationSharingDetails.tsx` | Mới: status presentation và permission/operation guidance |
| `src/features/location-sharing/hooks/useLocationSharingEnvironment.ts` | Mới: read-only browser readiness, network listeners |
| `src/features/location-sharing/types.ts` | Mới: future state model, request/response types, UI context projection/props |
| `src/features/location-sharing/schemas.ts` | Mới: GP2/GP3 typed boundary, không mutation |
| `src/features/location-sharing/navigation.ts` | Mới: public route helpers cho UC-49 và Home tương lai |
| `src/features/location-sharing/ui.css` | Mới: scoped mobile sizing, typography, safe area, no animation |
| `src/features/location-sharing/UC53_IMPLEMENTATION_REPORT.md` | Mới: báo cáo và Phase 2 handoff này |
| `src/features/ongoing-transport/routes.tsx` | Sửa tối thiểu: child location + DRIVER guard, lazy page, OT3 route adapter |
| `src/features/ongoing-transport/pages/TransportOverviewPage.tsx` | Sửa tối thiểu: Driver-only navigation action, không sửa sections/query lifecycle |

Không cần service Axios mới hoặc provider/store toàn cục. Feature mới không import nội bộ UC-49; sự kết nối chỉ ở route adapter và URL helper cho entry. Không sửa CrewShell, TransportPageHeader, UC-49 schema/hook/cache, shared UI, central router hoặc các feature đồng đội.

## 9. Phase 1 acceptance và verification

PASS ở cột source nghĩa đã có source/kiểm tra tĩnh, **không phải UI/API E2E PASS**.

| Acceptance | Source/static | Runtime/browser |
| --- | --- | --- |
| Feature location-sharing tồn tại, UI theo tokens | PASS | UNVERIFIED |
| Route location nằm trong Crew tree, không duplicate shell | PASS | UNVERIFIED direct refresh |
| DRIVER allowed; ESCORT/Admin/Customer blocked | PASS qua source guards | UNVERIFIED role logins |
| Driver Overview có link khi IN_TRANSIT/online/no read error | PASS | UNVERIFIED click/navigation |
| Back Overview, không phụ thuộc Home/state | PASS | UNVERIFIED browser Back/refresh |
| Context từ OT3, không fabricate/không GP1 | PASS | UNVERIFIED authenticated GET |
| UI inactive, permission not requested, no fake successful send | PASS | UNVERIFIED render |
| State types sẵn cho Phase 2, các khái niệm độc lập | PASS | Phase 2 chưa triển khai |
| Không GPS acquisition, permission query, POST, sending timer, queue | PASS qua rà source | Không thực hiện GPS/mutation để kiểm thử |
| Không sửa feature đồng đội/auth/BE | PASS qua diff/status | Không áp dụng |
| Typecheck/lint/build | Xem kết quả dưới | Không thay thế browser/E2E |
| Mobile responsive/accessibility thực tế | Source đã chuẩn bị | UNVERIFIED |

### Lệnh chạy trong lượt này

| Lệnh | Kết quả |
| --- | --- |
| `corepack pnpm exec tsc -b --pretty false` | PASS, exit 0 sau code changes |
| `corepack pnpm run lint` | PASS, 0 error; 56 warning ngoài source thay đổi |
| `corepack pnpm exec oxlint src/features/location-sharing src/features/ongoing-transport/routes.tsx src/features/ongoing-transport/pages/TransportOverviewPage.tsx` | PASS, không warning |
| `corepack pnpm run build` | PASS, exit 0; build cuối 14.46s. Còn warning large chunks, AddHorsePage static/dynamic import và plugin timings ngoài phạm vi; không sửa các module đó |
| Prettier check cho feature mới và hai file UC-49 | PASS trước final report |
| `git -c core.safecrlf=false diff --check` | PASS; kiểm tra lại cuối lượt |
| Source scan `.ts/.tsx` | Không có GPS acquisition, permission query, setInterval/setTimeout, POST/mutation, WebSocket hoặc coordinate persistence trong feature mới |

Không tạo/chạy automated tests. Browser bootstrap được thử một lần và lỗi `missing field sandboxPolicy` trước khi mở UI. **NOT VISUALLY VERIFIED** cho mọi viewport, không có screenshot hoặc giả lập role. Không có permission prompt, GPS acquisition hoặc GP2/GP3 mutation.

## 10. Runtime/config limitations và handoffs

- Public config đọc được: API base `https://pegaxus-be-dev.onrender.com/api/v1/`; Flow4 mock flag không khai báo → real context mặc định. Không sửa env, không in secret. Không khẳng định process Vite đang chạy đã reload config.
- Không gọi HTTP application API trực tiếp trong task này; OT3 chỉ được nối cho runtime của app. Không có authenticated runtime PASS cho OT3/GP2/GP3. Source BE local không chứng minh deployment đang dùng cùng commit.
- Không có BE endpoint blocker cho Phase 1 source: GP2/GP3 tồn tại nhưng cố ý chưa sử dụng. Browser/platform background limitations là ràng buộc thực tế, không xử lý bằng worker giả.
- Khuyên: Crew Home `/crew` + assigned transport card → `/crew/transports/{transportId}`; Driver có thể thêm direct link qua `driverLocationSharingPath`. Cần OT2 của chính account ở Home, không implement tại đây.
- Uyên: viewer GP1/map/SignalR nhận nằm ở `live-tracking`, độc lập sender; không đưa Driver vào GPS Map tab hoặc cho Driver gọi GP1.
- BA/document owner: sửa cam kết “always allow/background worker”, dependency UC-50 và nội suy vệt đường trong UC cũ.
- Báo cáo UC-49 cũ vắng trong checkout là giới hạn tài liệu, không phải blocker source và không được tự phục hồi như một thay đổi ngầm.

## 11. Kế hoạch Phase 2 — chưa thực thi

1. **Chuẩn bị service có chủ đích:** thêm GP2/GP3 vào `location-sharing` dùng Axios hiện có, parse envelope rồi các schema đã có; không GP1/map. Xác nhận lại current BE/deployment, auth và transport fixtures trước mutation. Giữ IDs là string.
2. **Consent và watch lifecycle:** chỉ Driver bấm Start khi context được BE cho phép và IN_TRANSIT mới gọi Geolocation. Hook local quản lý watch ID, latest sample, permission/sharing/network tách biệt. Đừng xin quyền khi mount. Không hứa quyền browser “Always”.
3. **Permission/error:** handling từ callback Geolocation thực tế; denied khác position unavailable/timeout/unsupported/Stop. Denied dừng acquisition/scheduler, hiện hướng dẫn browser, chỉ gọi GP3 theo denial transition hợp lệ; không dùng GP3 khi tự Stop hoặc offline.
4. **GP3 cooldown:** không spam retry. `notified=false` là kết quả hợp lệ; UI không báo RC đã được thông báo nếu false. BE là nơi quyết định cooldown 10 phút/recipients; mạng lỗi không được fabricate success.
5. **Sample và validation:** recordedAt lấy timestamp phép đo, không đổi thành giờ gửi để che sample cũ; dùng tọa độ thật. Browser speed m/s chuyển km/h; optional heading/speed/accuracy chỉ gửi khi hợp lệ theo contract, không tạo 0 giả. routePlanRouteId chỉ từ context BE còn phù hợp hoặc omit; không tự dựng effective route.
6. **15-second cadence:** sender một flight mỗi lần; mỗi tick chỉ chọn sample mới/fresh phù hợp, không overlapping hoặc hàng đợi. Skip tick nếu request đang chạy/không có điểm mới; không catch-up. Freshness policy chi tiết cần được xác nhận khi triển khai, không nhầm BE giới hạn tương lai +5 phút thành ngưỡng tuổi sample quá khứ.
7. **Offline/reconnect:** bỏ điểm/tick lỡ; không localStorage/IndexedDB/offline replay. Khi reconnect/foreground, yêu cầu sample mới thay vì phát lại điểm trước lúc mất mạng. Network online không đồng nghĩa GP2 thành công.
8. **Success state:** chỉ cập nhật lastSuccessfulTransmission sau GP2 ACK đã parse. Theo dõi sample timestamp riêng; duplicate/older ACK không được gọi là live position mới. Không suy GPS live từ permission granted hoặc navigation success.
9. **Cleanup:** Stop, unmount, đổi transport/account/session hoặc mất authorization phải clear watch/timer, abort request được phép hủy, loại latest sample và ngăn response cũ đổi UI. Foreground/background policy phải rõ; web có thể bị throttle/suspend khi khóa màn hình, không Service Worker geolocation giả. Khi quay lại không replay tick/điểm cũ.
10. **BE errors:** 401 dùng auth flow có sẵn; 403 dừng sender và thông báo quyền/assignment; 409 dừng và refresh context; 400 validation hiện lỗi, không retry point sai; network/5xx không queue/replay. Không tự thay trạng thái Transport hoặc bắt đầu chặng UC-50.
11. **Nghiệm thu được cho phép riêng:** manual/automated coverage chỉ khi user cho phép; kiểm permission thật, in-flight race, lifecycle, offline, timestamp/ranges, role/ownership và data privacy bằng development fixtures an toàn. Phase 1 không được đánh dấu GP2/GP3 E2E PASS.

## 12. Manual QA Phase 1 tiếp theo

Chưa thực hiện các bước này trong browser:

1. Chạy Vite bằng `corepack pnpm dev`; đăng nhập Driver thật. Mở `/crew/transports/{transportId}` bằng **ID BE thật được phân công, IN_TRANSIT**.
2. Bấm Share Journey Location → URL kết thúc `/location`; kiểm code/leg từ OT3, Inactive/Not sharing, Not requested, No location has been sent và nút Share disabled. Không có permission prompt hoặc request GP2/GP3.
3. Reload direct URL; thử Back → đúng Overview. Kiểm Network: có thể GET OT3 do cache stale/direct load, không GP1 hoặc GPS POST.
4. Thử Driver READY/COMPLETED qua direct URL: cảnh báo trạng thái, không thể bật chia sẻ. Thử sai assignment/ID: hiển thị lỗi thật, không data fallback. Không dùng ID mock để kết luận record BE tồn tại.
5. Đăng nhập Escort/Admin/Customer thật: direct `/location` phải bị ProtectedRoute chặn; Overview không có sender entry.
6. Kiểm 320/360/390/430px, keyboard/tab, focus, wrapping, targets; offline/online chỉ đổi network hint và context notice, không chuyển Sharing ON.
7. Nếu bật Flow4 mocks để xem layout, dùng Driver thật; ID ví dụ `00000061-0000-4000-8000-000000000002` là IN_TRANSIT preview. Banner phải ghi MOCK DATA, không có mock authorization hay sample GPS. Tắt flag/restart để quay về API thật.

## NEXT CODEX SESSION CONTEXT

- FE workspace `D:/FPT/FA26/SWP391/pegaxus-fe`, branch `feat/109-driver-location-sharing`, base `3fd5961`. Chạy status trước khi tiếp tục, giữ các thay đổi hiện tại. Không tự commit/push/checkout/reset/stash.
- Phase 1 đã có source ở `src/features/location-sharing/**`, hai integration changes ở UC-49 routes và Overview; không bắt đầu lại hoặc dựng shell/router mới.
- URL chính xác: `/crew/transports/:transportId/location`, nested CrewShell, DRIVER-only child guard. Entry chỉ Crew Driver + IN_TRANSIT/online/no read error. Back Overview, không `/crew` chưa có.
- OT3 route adapter dùng hook/key/cache UC-49 với poll=false; sender feature chỉ nhận props projection, không import nội bộ UC-49. Giữ auth/source/session cache isolation, không fallback mock.
- Sharing luôn stopped, permission not_requested, lastSuccessfulTransmission null. Không có watch/getPosition, permissions.query, sender timer, POST GP2/GP3, GP1, map/realtime receiver hoặc queue. **Không bật nút để demo Sharing ON giả.**
- GP2/GP3 schemas ở `schemas.ts`; all IDs z.string(). BE local readonly `feat/23-implement-logout` `52d0b43`; kiểm branch/DTO/validator hiện tại trước Phase 2. GP2 chỉ assigned Driver + IN_TRANSIT; GP3 no body, notified có thể false.
- Các boundary source/read-only checks chưa chứng minh authenticated runtime/GPS. Browser đang lỗi `missing field sandboxPolicy`; mọi UI/mobile vẫn NOT VISUALLY VERIFIED. Chưa có automated tests được chạy; không có mutation.
- Không sửa Uyên live-tracking/handover, Khuyên horse-health/Crew Home, shared auth/UI, BE/DB/contracts. Không thêm dependency. `UC49_IMPLEMENTATION_REPORT.md` không có trong checkout lúc task này bắt đầu; không tự restore.
- Nếu được giao Phase 2, thực hiện kế hoạch §11 với consent, freshness/no overlap/no replay và cleanup rõ ràng; xin phạm vi quyền kiểm thử/mutation cụ thể trước khi dùng dữ liệu ngoài fixture an toàn. Không tự chạy Phase 2 từ báo cáo này.

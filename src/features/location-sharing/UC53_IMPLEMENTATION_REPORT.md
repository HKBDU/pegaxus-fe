# UC-53 Phase 2 — Driver Location Sharing

Ngày: 17/10/2026.

**SOURCE AUDITED — RUNTIME NOT VERIFIED**

**NOT VISUALLY VERIFIED**

## Kế hoạch thực hiện và ranh giới

Yêu cầu Phase 2 tiếp tục Phase 1, không đổi router/shell hay dựng lại giao diện.
Thực hiện trực tiếp trong phiên hiện tại, không delegation, không automated tests,
không gọi GP2/GP3 khi kiểm tra, không commit/push.

- [x] Audit FE/BE và contract GP2/GP3 hiện tại; giữ nguyên auth và OT3 adapter.
- [x] Thêm service Axios/envelope/Zod và chuyển đổi GeolocationPosition.
- [x] Thêm lifecycle sender, cadence 15 giây, single flight, cleanup và GP3.
- [x] Nối Start/Stop và các trạng thái thật vào UI hiện có.
- [x] Chạy typecheck/lint/build/format/diff check; ghi bằng chứng mới bên dưới.
- [x] Rà diff và hoàn thiện handoff, không coi source/static là E2E.

Tài liệu này được tạo lại theo xác nhận của người dùng: báo cáo cũ đang bị xóa
trong working tree lúc bắt đầu. Không khôi phục file khác.

## Git context

| Repo | Branch | HEAD audit | Working tree lúc bắt đầu |
| --- | --- | --- | --- |
| FE | `feat/109-driver-location-sharing` | `cbb944a755bc4f6aae09aefce861fcf39799edbe` | Chỉ có deletion báo cáo UC-53; người dùng đã cho phép tạo lại |
| BE (read-only) | `feat/23-implement-logout` | `52d0b43d2a02654a666c9db9cfaac1493b2e7d98` | Sạch |
| Tài liệu | `main` | `99c23cc1687756f5e960e5313305fd4b7a705b10` | Có thay đổi sẵn `screen/flow6-frontend-task-assignment.md`; giữ nguyên |

Không stage, commit, push, switch branch, reset, stash, pull, merge hoặc rebase.
Source Phase 1 đã nằm trong HEAD hiện tại; không bắt đầu lại Phase 1. FE cuối lượt
gồm 7 tracked files sửa và 4 files mới, tất cả trong UC-53 hoặc một dòng nhãn UC-49
(chi tiết bên dưới). Không chỉnh BE, DB, env, dependency hay feature đồng đội.

## 1. Nguồn đã đọc và kết luận

### FE và tài liệu

- Đọc báo cáo Phase 1 từ `git show HEAD:src/features/location-sharing/UC53_IMPLEMENTATION_REPORT.md`
  vì file bị xóa khỏi working tree; đã có xác nhận tạo lại báo cáo này.
- Đọc toàn bộ source Phase 1 trong `src/features/location-sharing/**`.
- Đọc `src/features/ongoing-transport/routes.tsx`, `pages/TransportOverviewPage.tsx`,
  `hooks/useTransportOverview.ts`, `hooks/useTransportQueryContext.ts`, `services.ts`,
  `source.ts`, `schemas.ts`.
- Đọc `src/features/auth/store.ts`, `access-control.ts`, `types.ts`, `src/lib/axios.ts`,
  `src/lib/env.ts`, `package.json`; dùng lại shared Button, Badge, Skeleton, ErrorState và CSS tokens.
- Đối chiếu `../pegaxus-document/api-contract/flow4.md` §7, đặc biệt GP2/GP3,
  `use-case/use-case-details/flow4/UC-53-track-realtime-location.md` và
  `screen/flow4-frontend-task-assignment.md`.

UC cũ còn lời hứa background worker/Always Allow và dependency UC-50. Không triển khai
những điều đó: UC-50 NOT_USE; web foreground sender không bảo đảm chạy khi khóa màn hình.
Không sửa tài liệu gốc hoặc suy luận sender có quyền GP1/viewer.

### BE current checkout (không chỉnh sửa)

| Source dưới `../pegaxus-be/` | Bằng chứng |
| --- | --- |
| `Pegaxus.API/Controllers/TransportLocationsController.cs` | `RecordAsync`, `PermissionDeniedAsync`: hai POST, `DriverPolicy` |
| `Pegaxus.Service/LocationTrackingService/Request.cs` | `LocationRequest`: required theo validator và optional metadata |
| `Pegaxus.Service/LocationTrackingService/Response.cs` | `Accepted(ServerTime)`, `PermissionDenied(Notified)` |
| `Pegaxus.Service/LocationTrackingService/Validator/LocationRequestValidator.cs` | Required tọa độ/thời gian, ranges; recordedAt không default và không quá server +5 phút |
| `Pegaxus.Service/LocationTrackingService/Service.cs` | `ActorAsync`, `DriverTransportAsync`, `TransportAsync`: account active, DRIVER, assignment, IN_TRANSIT |
| `Pegaxus.Service/LocationTrackingService/Locations.cs` | `RecordAsync`: ACK duplicate/older; latest in RAM, geofence có thể ghi actual arrival |
| `Pegaxus.Service/LocationTrackingService/PermissionDenied.cs` | `PermissionDeniedAsync`: cooldown 10 phút, recipients RC, notified có thể false |
| `Pegaxus.Service/LocationTrackingService/TrackingState.cs` | Latest GPS và cooldown theo process; không phải GPS history DB |
| `Pegaxus.API/Extensions/JwtExtensions.cs` | DriverPolicy dùng role DRIVER, không phải viewer policy |

Assignment BE yêu cầu Driver nội bộ trên segment của plan CONFIRMED/ACTIVE/COMPLETED,
segment chưa superseded hoặc đã bắt đầu. FE không tái tạo phép kiểm assignment này.

## 2. FE–BE GP2/GP3 contract matrix

Các path service bên dưới tương đối với Axios base `/api/v1`; không lặp prefix.

| API | Endpoint | Điều kiện BE | Request | `value` response | FE boundary | Kết luận |
| --- | --- | --- | --- | --- | --- | --- |
| GP2 | `POST /transports/{transportId}/locations` | Assigned DRIVER, Transport IN_TRANSIT | `LocationRequest` JSON | `{ serverTime: string }` | `locationSharingService.send`, `driverLocationRequestSchema`, `driverLocationAcceptedSchema` | MATCH ở source; RUNTIME NOT VERIFIED |
| GP3 | `POST /transports/{transportId}/locations/permission-denied` | Cùng preconditions | Không body (`undefined`) | `{ notified: boolean }` | `locationSharingService.permissionDenied`, `locationPermissionDeniedSchema` | MATCH ở source; RUNTIME NOT VERIFIED |

| GP2 field | BE DTO / validation | FE gửi thực tế |
| --- | --- | --- |
| `latitude` | decimal?, validator required −90..90 | `coords.latitude`, required number có range |
| `longitude` | decimal?, validator required −180..180 | `coords.longitude`, required number có range |
| `recordedAt` | DateTimeOffset?, required; không quá server +5 phút | ISO từ `position.timestamp` gốc; không đổi thành giờ gửi |
| `speedKmh` | decimal?, optional/null, ≥0 | Browser speed m/s ×3.6 chỉ khi finite, nonnegative |
| `headingDegrees` | decimal?, optional/null, 0..359, không bắt integer | Chỉ gửi nếu finite và đúng range BE; 359.5 bị omit, không clamp giả |
| `accuracyMeters` | decimal?, optional/null, ≥0 | Chỉ gửi metadata browser finite, nonnegative |
| `routePlanRouteId` | Guid?, optional/null, không Guid.Empty; BE kiểm effective route | Omit vì adapter hiện không cung cấp verified current segment ID |

Giữ identifiers `z.string()`, không UUID regex/numeric coercion. Optional metadata
không hợp lệ/null/NaN/Infinity được omit, không thay bằng 0. Tọa độ sai bị bỏ toàn sample.
GP3 không tạo body `{}` hoặc fake notification.

Response đi qua `locationEnvelopeSchema` (`isSuccess`, numeric `code`, `message`,
optional/nullable `errorCode`, `value`), bắt buộc success và code 2xx rồi parse value.
Không coi Axios resolve là success. Axios interceptor hiện trả `response.data?.data ?? response.data`;
không unwrap `value`, do đó service mới parse envelope đúng lớp.

## 3. Routing, source và authorization

- Giữ `/crew/transports/:transportId/location`, lazy page trong CrewShell cũ.
- Parent DRIVER/ESCORT và child DRIVER-only ProtectedRoute giữ nguyên; không sửa router/route-config.
- Driver entry từ Crew Overview chỉ khi IN_TRANSIT/online/no error; bỏ đúng nhãn `Phase 1`.
- Back về `/crew/transports/:transportId`; không tạo Home `/crew`.
- OT3 adapter vẫn dùng `useTransportOverview(transportId, undefined, "crew", "data", false)`.
  Không thêm polling, không query GP1/OT2 hoặc import service nội bộ UC-49 từ sender.
- Hook sender kiểm account/principal, normalized DRIVER, token hiện có, sessionVersion,
  context available, transportId khớp, status IN_TRANSIT, source real và capability.
- `source="mock"` luôn khóa Start; không gửi GPS thật cho ID demo. Không tạo mock sender,
  mock notification, fake tọa độ hoặc fallback success.
- Source OT3 chọn mock chỉ development/test, `VITE_ENABLE_FLOW4_MOCKS === "true"`, PROD luôn false.
  Sender service không có mock branch; chỉ được UI/controller gọi sau real-context guard.
- API base vẫn lấy `VITE_API_URL` từ cấu hình chung. Không chỉnh/đọc giá trị secrets,
  không hardcode host, không xác nhận cấu hình process Vite/deployment đang chạy.

OT3 read authorization không phải bằng chứng GP2 chắc chắn được phép. BE vẫn có quyền
từ chối assignment/status. Khi context cập nhật thành invalid hoặc read error, sender dừng.
Vì adapter không poll, thay đổi status chưa được FE biết sẽ được phát hiện tại GP2 hoặc
khi context được refresh; không tuyên bố FE chủ động biết mọi thay đổi server tức thời.

## 4. Files thay đổi

| File | Thay đổi |
| --- | --- |
| `src/features/location-sharing/services.ts` | Mới: GP2/GP3 qua Axios, envelope/value parse và error mapping an toàn |
| `src/features/location-sharing/position.ts` | Mới: constants cadence/freshness, GeolocationPosition → GP2 DTO |
| `src/features/location-sharing/sender.ts` | Mới: một lifecycle controller, watcher/timers/abort/generation và permission observer |
| `src/features/location-sharing/hooks/useLocationSharing.ts` | Mới: auth/context binding và useSyncExternalStore, không tự Start |
| `src/features/location-sharing/schemas.ts` | Thêm envelope schema; giữ request/response schemas Phase 1 |
| `src/features/location-sharing/types.ts` | Bổ sung active/sending/restart lock/notification, waiting/paused states |
| `src/features/location-sharing/pages/DriverLocationSharingPage.tsx` | Nối hook; bỏ preview/Phase 1 text; giữ context/loading/error/layout |
| `src/features/location-sharing/components/LocationSharingControl.tsx` | Start/Stop thật, prominent denied warning, GP3 result trung thực |
| `src/features/location-sharing/components/LocationSharingDetails.tsx` | Phân biệt permission/network/sending/ACK; last send có giây, guidance foreground |
| `src/features/location-sharing/UC53_IMPLEMENTATION_REPORT.md` | Tạo lại/cập nhật báo cáo theo xác nhận người dùng |
| `src/features/ongoing-transport/pages/TransportOverviewPage.tsx` | Chỉ bỏ nhãn `Phase 1` ở entry UC-53; không đổi query/section/permission |

Không sửa `routes.tsx`, auth/Axios, shared UI, live-tracking/handover của Uyên,
horse-health/Crew Home của Khuyên hoặc BE. Không đổi CSS Phase 1 hay thêm map dependency.

## 5. Lifecycle GPS thật

```text
Mount → stopped / permission not_requested / chưa có ACK
Driver Start + real context hợp lệ
  → watchPosition + optional Permissions API observer
  → prompt / acquiring → actual fresh position → send opportunity
  → validated GP2 ACK → last send acknowledged
Stop / unmount / đổi transport hoặc account/session / auth mất
  → clearWatch + clear timers + abort + generation++ + drop sample
```

Controller chỉ được tạo khi mount; không GPS/permissions query tự động. `start()` là
đường duy nhất mở started session. Sau explicit Start, `watchPosition` dùng
`enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 20000`.

Permissions API (nếu hỗ trợ) được quan sát **sau Start** để phân biệt prompt/granted và
phát hiện revocation. Query permission không phải permission prompt. Nếu descriptor
không hỗ trợ thì dùng success/error callback thật của watch. Permission từ granted
chuyển prompt dừng session, yêu cầu Start mới; denied đi qua GP3 logic. Không giả lập Granted.

`getSnapshot()` ổn định đến khi publish; useSyncExternalStore subscribe vào controller.
Tọa độ không nằm trong React UI state, không render raw coordinate và không log.

## 6. Cadence 15 giây và freshness policy

1. Sample phải có timestamp finite, dương, không ở tương lai và tuổi **0..15.000 ms**.
   Đây là policy FE thận trọng, không phải rule BE +5 phút và không sửa contract BE.
2. Mỗi acquisition/resume ghi mốc local `acquiredAfter`; bỏ điểm có timestamp trước mốc
   đó. Trong acquisition chỉ nhận timestamp tăng dần, bỏ duplicate/older.
3. Chỉ giữ **một latest sample trong RAM**, thay khi có observation mới. Không có history/queue.
4. First fresh sample có thể gửi ngay ở lifecycle đầu tiên. Các lần sau có một recursive
   setTimeout cho send opportunity sau 15 giây; dùng `performance.now()` kiểm khoảng cách.
   Rapid Stop/Start trên cùng controller không reset mốc attempt để tạo burst.
5. Mỗi tick kiểm lại auth/context/foreground/network và sample freshness. Không sample
   hợp lệ hoặc GP2 còn in flight → skip, không accumulate backlog.
6. Sample được consume trước request; lỗi không gửi lại sample đó. Lỗi mạng/400/5xx còn
   bỏ sample thu được trong request thất bại và yêu cầu observation mới sau lỗi.
7. Module-level GP2 flight lock ngăn request chồng kể cả request cũ đang settle sau abort.
   Owner lease ngăn hai controller cùng sở hữu watcher trong một JS realm.
8. Deadline timer riêng theo phần freshness còn lại abort request khi sample hết tuổi.
   Shared Axios auth refresh giữ nguyên nhưng signal ngăn retry body đã hết hạn sau refresh chậm.
9. Timer trễ chỉ mở một opportunity tại thời điểm chạy, lần kế tiếp tính từ lúc đó;
   không catch-up, không dựa vào setInterval chính xác ở background.

Scheduler timer và request-expiry timer là hai mục đích khác nhau, đều cleanup.
Không dùng worker, localStorage, IndexedDB, sessionStorage hoặc analytics cho GPS.

## 7. GP2 ACK, lỗi và GP3 denial

`lastSuccessfulTransmissionAt` chỉ cập nhật bằng `value.serverTime` đã validate của GP2.
Stop không xóa lịch sử ACK cuối trong session đang mở, nhưng đổi transport/account/session
reset UI state. Nhãn là **Last send acknowledged**, không phải LIVE GPS. BE có thể ACK
duplicate/older mà không broadcast hoặc geofence lại, nên FE không tự khẳng định điểm mới.

| Tình huống | Hành vi source |
| --- | --- |
| 401 | Dùng auth/refresh chung; nếu thất bại dừng, không bypass. Subscribe auth ngắt ngay khi clearAuth/session đổi |
| 403 / FORBIDDEN | Dừng/abort, thông báo assignment/quyền, refresh OT3 |
| 404 / TRANSPORT_NOT_FOUND | Dừng/abort, báo không còn transport, refresh OT3 |
| 409 / INVALID_TRANSPORT_STATUS | Dừng/abort, refresh OT3, không đổi Transport status local |
| 400 / VALIDATION_ERROR | Không retry sample sai; chờ observation mới, giữ feedback send error |
| Network/5xx | Không queue/replay; sample mới tại opportunity tương lai mới được thử |
| Response/request không qua Zod | Dừng, không ghi success; yêu cầu reload/support |
| Request quá freshness budget | Abort; không xác nhận success, chờ observation mới |
| GPS POSITION_UNAVAILABLE/TIMEOUT | Bỏ sample; hiện GPS unavailable/timeout, watch có thể phục hồi, không GP3 |
| GPS PERMISSION_DENIED hoặc permission observer denied | Ngừng acquisition/scheduler, cảnh báo đỏ; GP3 theo denial transition |

Sau lỗi terminal, khóa Start cho đến khi context real được xác nhận lại với serverTime
mới hoặc full reload đổi controller; không tự restart sau refresh. Nếu refreshed status
không IN_TRANSIT/sai quyền thì Start vẫn bị khóa theo guard.

GP3 chỉ gọi một lần cho denial transition của started workflow, khi vẫn đủ auth/context,
online và foreground. Cleanup/generation khiến callback watch + observer trùng không
tạo hai denial calls. Stop/timeout/offline không gọi GP3; không queue/retry GP3 tự động.

| GP3 kết quả | UI |
| --- | --- |
| notified true đã validate | Chỉ lúc này mới nói server đã thông báo coordinator |
| notified false đã validate | Không có notification mới; có thể cooldown hoặc không recipient |
| Lỗi/mất mạng/abort | Không xác nhận notification, không retry tự động |

Cooldown 10 phút và recipient do BE quản lý. Driver chủ động Start lại và bị denied
lại là workflow attempt mới; FE không tạo cooldown hay notification service giả.

## 8. Offline, background và cleanup/race protection

| Sự kiện | Xử lý |
| --- | --- |
| Offline / tab ẩn | Clear watch, timer, abort, bỏ sample; giữ intent active nhưng status offline/paused |
| Online + tab visible trở lại | Chỉ trong started session và còn đủ quyền mới tạo watch mới; chờ observation sau resume |
| pagehide / rời trang | Stop hoàn toàn; bfcache quay lại cũng cần Start mới |
| Manual Stop | Giải phóng resources, thông báo stopped by you, tuyệt đối không GP3 |
| Unmount / transportId / account / session đổi | Cleanup đầy đủ; account/transport mới không kế thừa sample/ACK hoặc tự Start |
| Role/token/account unavailable | Auth store subscription dừng ngay, không đợi React render |
| Context known invalid | Hook configure dừng, không dùng read-error cache để tiếp tục gửi |
| Response/callback từ generation cũ | Bỏ, không sửa UI hoặc bật lại sharing |
| Rapid Start/Stop | active guard, owner lease, clearWatch, single scheduler và global flight lock |

Abort không thể rollback một POST BE đã nhận. Nếu mất response/abort sau khi BE xử lý,
FE không biết geofence/notification đã xảy ra hay chưa và không fabricate ACK. Cancellation
ngăn hoạt động FE tiếp theo, không hứa hoàn tác DB. Flight lock là trong một JS realm;
không điều phối giữa hai browser tabs/devices. BE vẫn là nơi ACK duplicate/older theo transport.

Không hứa browser tiếp tục GPS lúc khóa màn hình. Visibility event có thể bị trì hoãn
khi browser/OS suspend; resume luôn bỏ sample cũ và không catch-up.

## 9. Mobile UI và trạng thái

Giữ layout/tokens Phase 1: 16px body, target ≥48px, nút chính ≥64px, wrap text,
max-w-4xl, single-column mobile, hai cột desktop, safe-area đáy; không animation/map.
Chưa đo thực tế 320/360/390/430px, không tuyên bố contrast/overflow đã nghiệm thu.

UI phân biệt Not sharing, Requesting permission, Acquiring location, Waiting for successful
send, Last send acknowledged, Offline, Hidden-page pause, Permission denied, GPS unavailable,
Unsupported browser, Transport unavailable, Send error và stopped by you.
Permission granted không đồng nghĩa đang gửi; network online chỉ là browser hint.
Giờ ACK hiển thị đến giây; không hiển thị tọa độ nhạy cảm. Entry, Back, Refresh journey và
context loading/error giữ nguyên. Mock banner nói rõ Start bị khóa thay vì giả Sharing ON.

## 10. Validation Phase 2

Kết quả cuối được ghi sau lệnh chạy trong chính lượt này, không dùng kết quả Phase 1.

| Lệnh / kiểm tra | Kết quả |
| --- | --- |
| `corepack pnpm exec tsc -b --pretty false` | PASS, exit 0 ở lần kiểm cuối sau deadline refinement |
| `corepack pnpm run lint` | PASS exit 0; 56 warnings ngoài phạm vi, 0 diagnostics ở files thay đổi |
| `corepack pnpm exec oxlint src/features/location-sharing src/features/ongoing-transport/pages/TransportOverviewPage.tsx` | PASS, 0 diagnostics ở lần chạy đã thực hiện |
| `corepack pnpm run build` | PASS, exit 0 cho source cuối; Vite 14.46s, 4447 modules. Warnings large chunks, AddHorsePage static/dynamic import và plugin timings ngoài phạm vi |
| `corepack pnpm exec prettier --check` với 10 files source mới/sửa liệt kê ở §4 | PASS: All matched files use Prettier code style |
| `git -c core.safecrlf=false diff --check` | PASS, exit 0; có kiểm lại sau khi hoàn thiện report |
| Rà privacy source | Không log/persist tọa độ, không analytics/GPS history/GP1/receiver/queue |
| Automated tests | Không tạo hoặc chạy, theo yêu cầu |
| Browser/mobile/GPS/GP2/GP3 E2E | Chưa thực hiện, không có PASS runtime |

Typecheck ban đầu phát hiện TS1294 do constructor parameter properties không phù hợp
`erasableSyntaxOnly`; đã sửa thành fields tường minh. Scoped lint ban đầu cảnh báo
no-this-alias ở owner lease; thêm suppression đúng dòng có giải thích mục đích, không
tắt rule toàn file/project. Không sửa warnings của module đồng đội.

## 11. Runtime status, hạn chế và handoffs

- **Real HTTP mutation count trong lượt: ZERO (0).** Không GP2/GP3 smoke test, không fake GPS
  gửi server, không notification/geofence mutation, không login/mutation API khác.
- Không mở browser hoặc bấm Start. Không geolocation acquisition/permission prompt trong
  lúc coding; typecheck/lint/build chỉ kiểm source. **NOT VISUALLY VERIFIED**.
- Chưa xác minh authenticated GP2/GP3, GPS device thật, CORS, HTTPS deployment, assignment
  thực tế hoặc BE deployed commit. Checkout BE hiện tại không chứng minh deployment cùng version.
- Không có source endpoint blocker theo BE đã audit; runtime data/config chưa xác nhận.
- Latest GPS/cooldown của BE là per-process RAM, restart mất state; scale-out cần shared
  ephemeral state/backplane thuộc BE. Không thay đổi BE trong task này.
- Khuyên: giữ Crew Home/assigned cards, entry URL `/crew/transports/{transportId}/location`
  qua helper `src/features/location-sharing/navigation.ts`, không triển khai Home tại đây.
- Uyên: viewer GP1/SignalR/map vẫn thuộc live-tracking, độc lập sender; không gọi GP1 cho Driver.
- BA/document owner: cập nhật UC-50 NOT_USE/background/Always Allow, không hứa native tracking.

## 12. Manual QA — chỉ khi có quyền và môi trường cô lập rõ ràng

Chưa chạy checklist này. Không dùng staging/shared/production hoặc assumed-safe fixtures.
GP2 có thể ghi arrival và GP3 tạo notification nên cần BE owner cấp transport/account
test thực sự cô lập, recipients test và phê duyệt mutation riêng trước khi thao tác.

1. Chỉ cấu hình Vite/BE cô lập sau khi được cho phép; API URL phải đúng BE đó, mocks tắt,
   HTTPS hoặc localhost trusted, Driver thật được assign trên IN_TRANSIT transport.
2. Mở `/crew/transports/{transportId}/location`: kiểm mount không permission prompt/POST;
   reload cũng không tự Start. Đối chiếu code/current leg với OT3.
3. Khi đã được cho phép mutation, bấm Start lúc đỗ xe; Allow → acquiring → actual GPS →
   GP2. Kiểm JSON timestamp từ phép đo/optional metadata, không route ID giả, ACK/serverTime.
4. Quan sát nhiều opportunities: không overlap, không POST duplicate mỗi callback, mỗi lần
   có fresh point; last send acknowledged không được gọi LIVE GPS.
5. Stop rồi rapid Start/Stop, điều hướng Back, reload, đổi account/transport: không watcher
   hoặc timers leak, late response không đổi UI, không dùng điểm transport/account cũ.
6. Chỉ ở môi trường cô lập, Deny/revoke khi active → warning; một GP3 no-body/denial transition.
   notified false không nói đã thông báo; manual Stop/timeout không phát GP3.
7. Offline, hidden, khóa màn hình → dừng/pause; online + foreground → watch mới/fresh point,
   không replay missed points. pagehide rồi Back cần Start mới.
8. Dùng fixture/error cases cô lập cho 400/401/403/404/409/500/malformed envelope; kiểm auth
   chung, terminal stop/reload lock, không success giả, slow refresh không retry point hết tuổi.
9. Driver READY/COMPLETED/mock context không Start; Escort/Admin/Customer không có route quyền
   Driver. Không sửa account/role để bypass ProtectedRoute.
10. Kiểm 320/360/390/430px và thiết bị thật: wrapping, focus, 48px targets, warning visibility,
    không clipping/overflow, Stop luôn dùng được cả lúc offline/paused/in-flight.

Trước production cần QA có phép trên lifecycle/races, GPS/permission của browser đích,
network/auth refresh và geofence/notification side effects, không chỉ source/static.

## NEXT CODEX SESSION CONTEXT

- Workspace `D:/FPT/FA26/SWP391/pegaxus-fe`, branch `feat/109-driver-location-sharing`,
  HEAD audit `cbb944a`; chạy Git status trước khi tiếp tục, giữ 11 files thay đổi UC-53.
- Báo cáo bị xóa trước task; người dùng đã xác nhận tạo lại đúng path này. Không restore file khác.
- Source Phase 2 ở `sender.ts`, `position.ts`, `services.ts`, `hooks/useLocationSharing.ts`;
  UI hiện có đã nối Start/Stop. Không quay lại permanent disabled Phase 1 hoặc dựng router mới.
- Route `/crew/transports/:transportId/location`, CrewShell/DRIVER child guard/OT3 adapter
  giữ nguyên. Chỉ nhãn Phase 1 ở Overview bị bỏ; không đổi UC-49 query hoặc lifecycle.
- Chỉ real context IN_TRANSIT + actual DRIVER/session cho Start. Mock context khóa GPS.
- Freshness 0..15s, không future/previous-acquisition/duplicate sample; recursive timer,
  single flight/owner lease, deadline abort ngăn Axios refresh retry expired sample.
- Stop/unmount/session/context loss clear watch, permission observer, timers, abort/sample,
  generation protection. Offline/hidden pause; visible-online resume fresh, không replay.
- GP2 response envelope + serverTime; ACK không chứng minh broadcast mới. GP3 no body,
  genuine denial only, false hợp lệ; không retry notification/offline queue.
- BE read-only `52d0b43`, documents `99c23cc`; audit lại nếu backend được pull.
- **0 real HTTP mutations, không automated tests, SOURCE AUDITED — RUNTIME NOT VERIFIED,
  NOT VISUALLY VERIFIED.** Không coi UI/GPS/role/endpoint E2E là PASS.
- Không sửa live-tracking/handover, horse-health/Crew Home, auth/Axios/shared UI, BE/DB/env.
  Không thêm dependency, không commit/push/stage/switch/reset/stash/merge.
- Cần quyền riêng cho isolated QA trước Start/Deny thật; không tự mở Phase tiếp theo.

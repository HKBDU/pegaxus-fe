# Dương — Triển khai FE cho GP2, HO7, OT3, OT4, EC2, EC3

Ngày: 21/10/2026.

**SOURCE AUDITED — RUNTIME NOT VERIFIED** · **NOT VISUALLY VERIFIED**

## 1. Tổng kết

Đã triển khai source cho GP2 arrival/C9, HO7 có feature gate, privacy OT3, capability OT4 và cập nhật EC2/EC3. Không thay sender bằng hệ thống GPS thứ hai. Không phát sinh API mutation thật trong phiên này.

- GP2 phân biệt `accepted=true`, `accepted=false` và ACK legacy chỉ có `serverTime`; legacy không mở khóa C9.
- Arrival chỉ xử lý sau `accepted=true`; popup HO7 tách khỏi gợi ý bàn giao. HO7 có schema, service, mutation hook, xử lý lỗi và refresh OT3/OT4.
- C9/OT2 đã nối trong Crew transport shell; một sender tồn tại qua các tab của cùng chuyến và được dọn khi rời shell/đổi tài khoản/chuyến.
- OT3 loại incident khỏi projection Customer và không render section này; timestamp vẫn lấy nguyên từ BE, không tự xác nhận hoàn tất từ GPS.
- OT4 giữ thông tin legacy nhưng không đoán `handoverRequired` hoặc tạo capability bị thiếu; chặn action cùng Driver khi đủ dữ liệu đáng tin.
- EC2 thêm D6 label/note/status; không đổi `CANCELLED` thật thành trạng thái mới hoặc xác nhận đã giao thông báo. EC3 kiểm tra riêng EXTRA và giữ tùy chọn không gửi overrides.

**Kết luận:** source đủ để review phần đã triển khai; **FE IMPLEMENTED — BE INTEGRATION PENDING** cho các nhánh contract mới. Không kết luận cả luồng đã hoàn tất/E2E PASS. OT4 TS/SCHEDULE, Crew Home C9 và shared status UI còn phụ thuộc owner, ghi rõ ở §7/§10.

## 2. Snapshot repository

| Repository                         | Branch / HEAD đọc được                                                  | Working tree                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| FE `D:/FPT/FA26/SWP391/pegaxus-fe` | `feat/119-fix-ui-ux-issues`, `43c6834257caf3b4d2b2285680b84e867d87f619` | Ban đầu sạch. Cuối: 24 tracked files sửa, 8 files mới, gồm báo cáo này; không stage           |
| BE `../pegaxus-be`                 | `feat/23-implement-logout`, `353d951b4f58e36ca62cd90dafc584c22f682585`  | Sạch; chỉ đọc, không sửa                                                                      |
| Tài liệu `../pegaxus-document`     | `main`, `56cf4638cebf271c52eff0ac13ff51cd072fc608`                      | Giữ nguyên 4 Markdown untracked đã có: ba báo cáo 6 API và `PEGAXUS_TOAN_DU_AN_GIAI_THICH.md` |

BE remote-tracking refs cục bộ: `origin/dev=c8f6105`, `origin/pegaxus-dev=0dcf321`. Không fetch/pull nên đây không phải xác nhận HEAD mới nhất trên remote hoặc deployment. Source BE audit là checkout `353d951`, không tự coi bằng chứng lịch sử là runtime hiện tại.

Nguồn đối chiếu: `../pegaxus-document/api-contract/flow3.md` EC2/EC3; `flow4.md` TrackingSegment/HandoverBoundary/OT2/OT3/OT4/GP2/HO7; `flow5.md` C9/D4/D6/E; `flow5-be-viec-can-sua-flow3-flow4.md`; task assignment Flow 3/4, UC-48/49/53, RACI, BR-046/048/066 và `dbdiagram/racehorse_transport_physical_erd_final_v9.dbml`. Báo cáo delta 20/10 chỉ dùng tham khảo; snapshot FE trong báo cáo cũ không được dùng thay HEAD hiện tại.

## 3. Audit source ban đầu

Các đường dẫn BE trong bảng tương đối với `../pegaxus-be/`.

| API | Đã có đúng ở FE                                                                                                     | Thiếu / mismatch xác nhận                                                                       | Source BE thực tế / ownership                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GP2 | Axios/envelope/Zod, watch sau Start, cadence 15 s, single flight, freshness, permission/GP3, offline/hidden cleanup | Schema chỉ giữ `serverTime`, chưa arrival/accepted/C9                                           | `Pegaxus.Service/LocationTrackingService/Response.cs` `Accepted(ServerTime)`; `Locations.cs:RecordAsync` chưa C1/C9. Dương sửa FE, BE owner sửa projection/geofence                    |
| HO7 | Chưa có                                                                                                             | Chưa schema/service/hook/popup                                                                  | Không tìm thấy endpoint segment arrival trong controller/service hiện tại. C6 thuộc BE; Dương chuẩn bị FE có gate                                                                      |
| OT3 | Endpoint, schema, query auth/session-scoped, overview các audience, health/dossier/ETA/nullable current segment     | Customer vẫn có thể render mảng incident redacted; cần refresh theo state changes               | `TransportService/Queries.cs:GetOverviewAsync` vẫn query incident cho Customer, chỉ bỏ severity/description; `DossierBrief` đang trả `dossierType=null`. D4/C2 thuộc BE                |
| OT4 | Effective segment list, accordion, boundary/record links, status/time lấy từ response                               | Chưa ba field mới và guard cùng Driver                                                          | `TransportService/Response.cs:HandoverBoundary`, `Mapping.cs:ReadBoundariesAsync` chưa `handoverRequired/arrivalAt/createModes`, còn cho cùng Driver tạo. C2/C3 thuộc BE               |
| EC2 | LM guard, concurrency `lastUpdatedAt`, chống submit lặp, decision service                                           | RETURN text còn nói MAIN quay về DRAFT; thiếu D6 UX và thiếu chi tiết EXTRA trong result schema | `RouteChangeService/Service.cs:DecideAsync` đã tạo EXTRA khi APPROVE, nhưng REJECT vẫn gán `CANCELLED`; B5 validation còn legacy. Dương sửa FE; BE sửa D6/B5                           |
| EC3 | Full activation panel/resource selection, optional segments/note, result ACTIVE, LM/status/version guards           | Chỉ kiểm MAIN; lỗi fallback che message BE; chưa invalidate OT3/OT4                             | `RouteChangeService/Service.cs:ActivateReturnAsync` đã kiểm EXTRA và trả `RETURN_DOSSIER_NOT_APPROVED`; B5 trong `Execution.cs` còn chưa đúng. Dương sửa FE, không tự bỏ validation BE |

Controller authorization: `Pegaxus.API/Controllers/TransportLocationsController.cs` GP2/GP3 dùng `DriverPolicy`; `TransportsController.cs` OT3/OT4 dùng `TransportProgressViewerPolicy`, OT2 thêm Driver/Escort policy; `RouteChangeRequestsController.cs` EC2/EC3 thêm `LogisticsManagerPolicy`. Assignment/Booking ownership và concurrency cuối cùng vẫn do BE thực thi.

## 4. Chi tiết triển khai

### GP2 — POST `/api/v1/transports/{transportId}/locations`

- `location-sharing/schemas.ts`: `driverLocationAcceptedSchema` thêm `accepted?: boolean`, `reason?: "NOT_CURRENT_SEGMENT_DRIVER" | null`, `arrival?: ArrivalBoundaryEvent | null`. Optional là tương thích response cũ, không default `accepted=true`.
- `arrivalBoundarySchema`: boundaryNo dương; hai segment ID nullable cho đầu/cuối; `arrivalAt` nullable; boolean `handoverRequired`; location có tên/tọa độ hợp lệ; radius dương; existingHandover nullable với ID/status. Không tự tạo arrival/time khi field thiếu.
- `sender.ts`: nhánh `accepted=false` dừng watch/cycle, hủy proof và arrival, giữ thông báo trung tính. `403` vẫn qua error handler thật, không chuyển thành trường hợp bàn giao.
- Chỉ `accepted=true` mở arrival. Dedup trong RAM theo transport + boundaryNo + from/to ID; không local/sessionStorage. Reload/visit mới không tự phục hồi popup. Không dùng ID nullable làm khóa duy nhất.
- Cảnh báo `ARRIVAL_WARN_METERS=400` dùng `handover/utils.ts:distanceMeters`; cần khoảng cách tăng và còn trong radius server. Speed km/h đổi về m/s, chỉ ước tính khi finite và >0; không countdown giả cho 0/null. Ra ngoài radius thì đóng.
- Giữ một watch, single flight, timestamp phép đo, khoảng freshness 15 s, cadence 15 s, không offline queue/replay. `freshPosition()` chỉ lấy sample RAM đang hợp lệ của sender hiện tại, không mở watch mới.
- Exempt arrival refresh OT3/OT4 và OT2. Required arrival chỉ gợi ý workflow bàn giao, không ghi timestamp/hoàn tất local. Giữ popup exempt qua đúng chuyển tiếp `from→to`, nhưng hủy proof segment cũ và yêu cầu ACK mới.

### HO7 — POST `/api/v1/transports/{transportId}/segments/{routePlanRouteId}/arrival`

- `schemas.ts`: request chỉ latitude/longitude; result gồm boundaryNo, `from(COMPLETED)` và `to(IN_TRANSIT)` cùng timestamps server. Validate ID trả về khớp boundary/request.
- `services.ts:confirmArrival`: Axios base/prefix hiện có; envelope success + value parse; guard freshness cả initial dispatch và authenticated retry. Không fake success hoặc ghi giờ client.
- `hooks/useSegmentArrival.ts`: mutation `retry:false`, `networkMode:"always"`, `gcTime:0`; không để TanStack pause/queue tọa độ khi offline. Controller guard chống click lặp; abort khi boundary/gate đổi, unmount, auth/session/role mất; bỏ ACK muộn và reset pending theo controller.
- `LocationWorkflowDialogs.tsx`: chỉ từ GP2 popup exempt, phải có cả from/to và timestamp tạm; không có nút HO7 ở Tab 2. Cần fresh sample tại lúc confirm. HO7 không xuất hiện trên popup formal handover.
- Success: đóng popup, thông báo xác nhận server, refresh đúng OT3/OT4/OT2. `409 ARRIVAL_LOCKED`: đóng, giữ giờ BE; `422 NOT_IN_ARRIVAL_RADIUS`: đóng; `422 HANDOVER_REQUIRED`: bỏ HO7, chuyển tab Handovers qua helper có sẵn. Lỗi mạng phân biệt với message nghiệp vụ; không retry tự động.
- `features.ts`: `FEATURES.segmentArrival` chỉ true khi `VITE_ENABLE_SEGMENT_ARRIVAL === "true"`. **Mặc định tắt**, chưa sửa `.env`/`.env.example`. Chỉ bật sau khi BE/lead xác nhận C6 trên deployment đích. Hiện UI hiển thị action chờ BE, service cũng kiểm gate.

### OT3 — GET `/api/v1/transports/{transportId}/overview`

- Giữ schema/UI status, route type, currentSegment nullable, counts, timestamps/ETA, health summary, MAIN/EXTRA và canViewGpsTab hiện có. Không đổi timestamp/status theo tọa độ phía FE.
- `ongoing-transport/services.ts:overview` thay incident projection bằng `[]` cho audience Customer **hoặc** principal có role CUSTOMER; bỏ dữ liệu này trước validation branch Customer. Không biến mảng redacted legacy thành dữ liệu công khai.
- `pages/TransportOverviewPage.tsx` có thêm render guard Customer. Operational views giữ nguyên; không sửa IN8/incident module.
- `hooks/useTransportProgressRefresh.ts` invalidate đúng transport và query type overview/segments. `TransportDetailLayout.tsx` theo dõi cache HO5 `handover/record`: chỉ record COMPLETED của `record.transport.transportId` đúng chuyến và updatedAt mới mới refresh; không gọi lại HO5. Poll/refocus cũ vẫn giữ.
- BE legacy đang ghi GPS arrival khác M1–M9: FE chỉ hiển thị giá trị trả về, không thể biến timestamp sai ở BE thành timestamp HO5 đúng. Đây là blocker BE, không được báo timestamp E2E PASS.

### OT4 — GET `/api/v1/transports/{transportId}/segments`

- `schemas.ts:handoverBoundarySchema`: thêm `handoverRequired?:boolean`, `arrivalAt?:string|null`, `createModes?:string[]`; không dùng `??true`, không tạo permission mặc định.
- `timeline.ts:isSameDriverBoundary`: chỉ hai chặng hiệu lực liền kề, cả hai nội bộ, hai Driver ID thực có và bằng nhau; không dùng Escort, tên người hoặc so sánh null. PICKUP/DELIVERY không bị miễn.
- `TransportHandoverBoundary.tsx` và arrival popup dùng chung guard. Exempt không hiện create; legacy thiếu capability chỉ đọc; record links vẫn có. Hiện arrivalAt/createModes server và pending handover mà không đổi underlying status.
- Create shortcut hiện chỉ mở khi `canCreate`, `handoverRequired=true`, `START_NOW` và role phù hợp. Không tự gọi HO3/HO4/HO5. Chỉ thêm optional `enabled` vào hook OT4 để popup không đọc endpoint khi không cần.
- Mock `ongoing-transport/mock/segments.ts` thêm field/capability đúng nhánh, cùng Driver không tạo biên bản; mock chỉ trong cơ chế Flow4 opt-in hiện có và không mở GPS thật.
- **Còn thiếu tích hợp TS/SCHEDULE:** form `handover/components/StartForm.tsx` của Uyên chưa đọc createModes và mặc định `startNow=true`. Không đưa TS vào action có thể gọi sai quyền; modes vẫn hiển thị, shortcut SCHEDULE chờ owner (§7). Không đánh dấu toàn bộ OT4 actions hoàn tất.

### EC2 — POST `/api/v1/route-plans/{routePlanId}/change-decision`

- `RouteChangeDecisionPanel.tsx`: RETURN rejection đổi thành “Không Duyệt RETURN & Chỉ Đạo Chờ Đợi”; “LM Note (gửi thẳng cho Driver và Escort)”, bắt buộc trim ≥10 ký tự, giữ max/form errors/concurrency/busy guards. BACKUP rejection giữ nhãn cũ.
- Sửa text approval: tạo EXTRA DRAFT, MAIN giữ APPROVED; RETURN không ACTIVE cho đến RP7 + EXTRA APPROVED + EC3. Không instruct quay đầu sau EC2, không tự gọi EC4.
- `schemas.ts:routeChangeDecisionResultSchema` giữ dossierCode/dossierType EXTRA/inheritedRequirementCount và branch fields nếu trả về; optional cho legacy. Request không thêm incidentReportId.
- Schema status hiện có đã nhận REJECTED_BY_MANAGER. UI/toast và `RoutePlanHeader.tsx` hiện “LM đã từ chối”; response CANCELLED giữ nguyên và cảnh báo legacy. Không xác nhận LM Note đã tới thiết bị tổ lái.
- `useEmergencyRoute.ts` không tính REJECTED_BY_MANAGER là RETURN đang mở. `services.ts:getEmergencyError` ưu tiên message BE, đặc biệt SCHEDULE_CONFLICT; không suppress B5 hoặc retry mutation.
- Shared chỉ thêm một declaration `REJECTED_BY_MANAGER` trong `src/shared/constants/route-plan-status.ts`. Không mở rộng union/list/map gây bắt buộc sửa badge ngoài quyền; handoff chính xác tại §7.

### EC3 — POST `/api/v1/route-plans/{routePlanId}/return-activation`

- Giữ full activation workflow hiện có. `useEmergencyContext` đọc EXTRA từ AB2 complianceDossiers đã normalize sẵn; không suy EXTRA từ MAIN hoặc dossierType null.
- Panel kiểm MAIN và EXTRA đều APPROVED, hiện hai trạng thái riêng, giữ LM/RETURN CONFIRMED/Transport IN_TRANSIT/version guards. Thiếu EXTRA là chưa xác minh, không tự coi approved.
- Giữ optional segments: không override thì omit segments. `activation-resources.ts` tái dùng resource của PRIMARY đúng plan/booking và resource đã gán trong RETURN hiện tại; không tự kiểm trùng lịch các segment cùng plan. BE vẫn kiểm mode/capacity/provider/documents/lịch khác plan.
- Thêm fallback `RETURN_DOSSIER_NOT_APPROVED`, `VEHICLE_SCHEDULE_CONFLICT`; giữ actual message cho các lỗi dossier/schedule/resource/provider. Refresh workspace sau dossier/version/precondition errors nhưng không resubmit.
- EC2/EC3 success invalidate route/workspace cũ cộng OT3/OT4 đúng transport. Không invalidate toàn app. Không sửa PV/VH/RP/personnel source để bypass B5.

## 5. C9 / OT2 và tích hợp Crew

`GET /api/v1/transports/assigned-to-me?status=READY,IN_TRANSIT,COMPLETED` dùng read-only projection `assignedLocationContextSchema`; `currentSegment` nullable, `isMine?:boolean` để giữ legacy **không đồng nghĩa false**. Không mở rộng ownership toàn OT2.

| Thành phần                                                            | Hợp đồng FE                                                                                                                                                                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAssignedDriverContext(real)`                                      | Chỉ enabled cho auth DRIVER thật, key account/session, stale 10 s, foreground polling 15 s; không dùng mock để xác nhận ownership                                                                                         |
| `useLocationGate({driver,assignment,state,start,observedSegmentId?})` | Trả `status`, `applicable`, `locked`, `ownershipKnown`, `start`; dùng normalized DRIVER từ caller và auth account/session hiện tại                                                                                        |
| Applicable                                                            | OT2 myRole DRIVER + transport IN_TRANSIT + isMine true                                                                                                                                                                    |
| Unlock                                                                | Watch active + GP2 explicit accepted true <60 s, cùng transport/account/session/segment. Không dùng granted/callback/serverTime legacy                                                                                    |
| Unknown                                                               | `waiting_current_segment`, `locked=true`, ownershipKnown false; không đoán đang là Driver hiện tại. Chỉ popup chặn khi applicability đã được xác nhận; đọc hành trình/GPS legacy vẫn được giữ, có notice chưa xác minh C9 |
| Scope                                                                 | Proof RAM, reset khi đổi identity/transport/segment, pause/offline/error/stop. OT2/OT3 khác current ID thì proof không unlock; refresh targeted để đồng bộ                                                                |
| Rejection                                                             | Dừng, restart guard, thông báo trung tính. Không xử lý arrival trong response bị từ chối                                                                                                                                  |

`DriverLocationSession.tsx` gắn trong `ongoing-transport/components/CrewShell.tsx`, không sửa router trung tâm. Query OT3 vẫn `(transportId, undefined, "crew", "data", false)`, cùng key/cache cũ. Page chia sẻ nhận session thay vì mount sender thứ hai. Không auto Start khi vào route. `/crew/transports/:transportId/location` và guard DRIVER hiện có giữ nguyên.

Popup C9 không đóng bằng Escape/outside và giữ nút Start/Stop, reload context, đường tới màn location. Legacy thiếu isMine không được thông báo “đã mở khóa”; chưa thể nghiệm thu gating đầu-cuối cho deployment cũ. Escort không bị C9 chặn.

### Handoff Crew Home `/crew` cho Khuyên

1. Import `useAssignedDriverContext/useLocationGate` từ `src/features/location-sharing/hooks/useLocationGate.ts`; chọn đúng item theo transportId, không dựng isMine.
2. Home chưa có active sender thì dùng `createStoppedLocationSharingState()` từ `location-sharing/sender.ts` làm state stopped, không gọi GPS. Nếu chuyển ownership lifecycle ra Home sau này cần thỏa thuận riêng để không thêm sender song song.
3. Handler `start` ở Home chỉ navigate bằng `driverLocationSharingPath(id)`; user bấm Start trong session hiện có mới xin GPS. **Thẻ chuyến và link enable location phải luôn click được**, kể cả locked/unknown.
4. Disable action thao tác của Driver khi applicable+locked; unknown phải có trạng thái chờ, không dùng legacy ACK để unlock. Escort không áp khóa Driver. Không disable toàn card hoặc link notification.
5. Notification giữ action URL `/crew/transports/{transportId}`; vào trip sẽ mount session và lấy OT2/OT3. Không tự gửi GP2 từ notification handler.

Crew Home **chưa được sửa hoặc gắn hook** trong task này. Ngoài shell, sender sẽ dừng khi unmount; không quảng bá GPS background hoặc active watch còn tồn tại ở Home.

## 6. Handoff Backend theo checklist Lead

| Mã  | Source BE cần xử lý                                                                        | Thiếu / ảnh hưởng FE                                                                                       | Điều kiện nghiệm thu tiếp theo                                                                                              |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| B5  | `RouteChangeService/Execution.cs:ValidateResourcesAsync`                                   | Còn proposed overlap, phép <=/>= và không loại toàn bộ cùng TransportPlan; EC2/EC3 có thể báo conflict sai | Cùng plan dùng resource hợp lệ; khác plan giao chặt mới lỗi; FE hiển thị message thật                                       |
| C1  | `LocationTrackingService/Locations.cs`, `Response.cs`                                      | Chưa arrival; GPS còn ghi giờ ở mọi boundary, cả final transport arrival                                   | Response đúng arrival; required không ghi giờ, exempt đúng M3/M8; final giờ từ DELIVERY HO5                                 |
| C2  | `TransportService/Mapping.cs:ReadBoundariesAsync`, `Response.cs`                           | Chưa handoverRequired/arrivalAt/createModes; dossierType OT3 còn null                                      | Đủ DTO, canCreate/types/modes đúng exemption/role; timestamps/status nhất quán                                              |
| C6  | Controller/service HO7 mới                                                                 | Endpoint chưa có; FE đã gate OFF                                                                           | Assigned from Driver, internal exemption, started/effective segment, radius, response time/status và lỗi HO7 đúng contract  |
| C9  | GP2 `Locations.cs/Response.cs`; OT2 `Response.cs:SegmentBrief`, mapping/service            | Chưa accepted/reason/isMine; cũ vẫn nhận Driver không phụ trách current segment                            | Old Driver accepted=false trước mọi side effect, new Driver true, isMine account-specific; HO5 notification nhắc bật vị trí |
| D4  | `TransportService/Queries.cs:GetOverviewAsync`                                             | Customer vẫn nhận incident title/code trong payload                                                        | Trả activeIncidents=[] thật ở BE; FE hiding không thay bảo mật server                                                       |
| D6  | `RouteChangeService/Service.cs:DecideAsync`, `Notifications.cs` và discarded-status checks | REJECT RETURN vẫn CANCELLED, chưa gửi LM Note tới current Driver/Escort                                    | Trả REJECTED_BY_MANAGER, ghi nguyên note, queue notification đúng người, không giữ tài nguyên/RETURN đã bị từ chối          |

C3–C5: `HandoverService/CompletionEffects.cs`, Creation/Completion/Mapping và policy cần cùng exemption, TS SCHEDULE-only, lifecycle PLANNED→IN_PROGRESS→COMPLETED, HO5 radius và authoritative timestamps. Việc này thuộc BE/Uyên, không sửa tại đây. H1–H3 chỉ liên quan thứ tự EXTRA/MAIN/legal workflow; FE không tự mở dossier hoặc chuyển trạng thái để né precondition.

**Quyết định nghiệp vụ còn mở:** server chưa có flag persisted cho “đã ra khỏi radius rồi quay lại”; HO7 contract kiểm vị trí hiện tại nhưng chưa đủ chứng minh khóa vĩnh viễn sau reentry. Không thêm `isArrivalLocked` vào DTO/DB và không hứa khóa xuyên reload; BA/BE cần chốt.

## 7. Handoff đồng đội và shared ownership

| Owner  | Việc cần làm                                                                                                                                                                              | File / URL chính xác                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uyên   | HO3 đọc handoverRequired/createModes, TS chỉ SCHEDULE; HO4/HO5 theo capabilities, không COMPLETE PLANNED; không cho miễn cùng Driver tạo biên bản                                         | `src/features/handover/components/StartForm.tsx`, schemas/hooks/pages tương ứng; `/crew/transports/{id}/handovers/new` và `/handovers/{handoverId}` |
| Uyên   | HO5 completion cache hiện đã được Dương bridge sang OT3/OT4; nếu đổi query key/shape phải giữ handoff hoặc gọi `refreshTransportProgress(client, transportId)` sau success                | `src/features/handover/hooks/useHandovers.ts`; helper tại `ongoing-transport/hooks/useTransportProgressRefresh.ts`                                  |
| Khuyên | Gắn C9 vào action Crew Home theo §5, không chặn navigation vào trip/location; VH1 cùng-plan resource availability/B5 nếu cần catalog đầy đủ                                               | `/crew`; `/crew/transports/{transportId}`; `/crew/transports/{transportId}/location`                                                                |
| Khuyên | Hoàn thiện union RoutePlanStatus, ROUTE_PLAN_STATUSES, labels và badge cho REJECTED_BY_MANAGER. Task này **chỉ** thêm exported constant một dòng để không phá exhaustive Record của badge | `src/shared/constants/route-plan-status.ts`, `src/features/route-plan/components/RoutePlanStatusBadge.tsx`                                          |

Không sửa component handover/personnel/vehicle/route-plan/Crew Home của đồng đội. Các URL dùng helper `handoverPaths` hiện có; chuyển tới PLANNED record chỉ mở workflow, không giả vờ đã gọi HO4. Không thêm route trùng.

## 8. Phạm vi file và an toàn

Tất cả đường dẫn sau tương đối với repository FE. Ban đầu sạch nên không có user edits phải hoàn tác. Báo cáo này được kiểm tra chưa tồn tại trước khi tạo; không ghi đè report UC53 cũ.

| Nhóm                  | Files mới/sửa                                                                                                                                                                                                                                          | Mục đích                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Location contracts    | `src/features/location-sharing/schemas.ts`, `types.ts`, `services.ts`; mới `features.ts`                                                                                                                                                               | GP2 legacy/new, HO7, OT2 projection, gate deployment |
| Sender/lifecycle      | `src/features/location-sharing/sender.ts`, `hooks/useLocationSharing.ts`; mới `hooks/useLocationGate.ts`, `hooks/useDriverLocationSession.ts`, `hooks/useSegmentArrival.ts`                                                                            | Một watch, proof scoped, mutation/cleanup            |
| Location UI           | `src/features/location-sharing/pages/DriverLocationSharingPage.tsx`; mới `components/DriverLocationSession.tsx`, `components/LocationWorkflowDialogs.tsx`                                                                                              | Session dùng chung, C9/arrival dialogs               |
| Transport integration | `src/features/ongoing-transport/components/CrewShell.tsx`, `TransportDetailLayout.tsx`; mới `hooks/useTransportProgressRefresh.ts`                                                                                                                     | Gắn session, bridge HO5, refresh targeted            |
| OT3/OT4               | `src/features/ongoing-transport/schemas.ts`, `services.ts`, `timeline.ts`, `hooks/useTransportSegments.ts`, `pages/TransportOverviewPage.tsx`, `components/TransportHandoverBoundary.tsx`, `components/TransportRouteTimeline.tsx`, `mock/segments.ts` | Privacy, optional capabilities, same-Driver guard    |
| EC2/EC3               | `src/features/route-view/schemas.ts`, `services.ts`, `activation-resources.ts`, `hooks/useEmergencyRoute.ts`, `components/RoutePlanHeader.tsx`, `components/emergency/RouteChangeDecisionPanel.tsx`, `components/emergency/ReturnActivationPanel.tsx`  | D6/EXTRA, message/version/resource guards            |
| Ngoại lệ shared       | `src/shared/constants/route-plan-status.ts`                                                                                                                                                                                                            | Chỉ một declaration mới; không format lại file       |
| Báo cáo               | `PEGAXUS_DUONG_6_API_FE_IMPLEMENTATION_REPORT.md`                                                                                                                                                                                                      | Bằng chứng và handoff                                |

Không sửa `src/app/router.tsx`, auth/Axios/shared UI, `.env`, `.env.example`, package/lockfile, Home/landing, `handover/**`, `horse-health/**`, `route-plan/**`, fleet/personnel, DB hoặc BE. Không đổi skeleton/GLB/assets. Không có deletion.

Git chỉ dùng status/diff/log/branch/rev-parse/ls-files/for-each-ref để đọc; **không** stage/commit/push/fetch/pull/merge/checkout/switch/reset/restore/stash/clean. Không khởi chạy application server, không browser, GPS acquisition hoặc real API calls.

## 9. Verification thực sự đã chạy

| Kiểm tra                                                                                                                                                        | Kết quả                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.\node_modules\.bin\tsc.cmd -b --pretty false`                                                                                                                 | PASS ở các lượt sau sửa; lỗi TS về field OT4 trong lượt schema chưa hoàn thiện đã được xử lý. Không dùng kết quả cũ thay runtime                                                  |
| `.\node_modules\.bin\oxlint.cmd src/features/location-sharing src/features/ongoing-transport src/features/route-view src/shared/constants/route-plan-status.ts` | PASS, 0 diagnostics                                                                                                                                                               |
| `.\node_modules\.bin\oxlint.cmd`                                                                                                                                | Exit 0, 0 error, 60 warning ngoài file thay đổi; không chỉnh source đồng đội để xóa warning                                                                                       |
| `.\node_modules\.bin\vite.cmd build`                                                                                                                            | PASS; lượt cuối 4536 modules, 13.73 s, exit 0. Còn large chunks, AddHorsePage static/dynamic import và plugin timing warnings ngoài phạm vi                                       |
| Scoped Prettier `--write`/`--check` các source mới/sửa                                                                                                          | Đã format phần source thay đổi; shared status giữ nguyên style và chỉ thêm declaration. Kiểm tra cuối ở lệnh bên dưới                                                             |
| `node scripts/check-import-cycles.mjs`                                                                                                                          | PASS: không circular import trên 746 source files                                                                                                                                 |
| `git -c core.safecrlf=false diff --check`                                                                                                                       | PASS ở lượt kiểm đã chạy; kiểm lại cùng final diff                                                                                                                                |
| Source review độc lập + tự rà diff                                                                                                                              | Đã sửa HO5 nested transportId, authorization cleanup khi segment đổi, HO7 pending/controller race và TanStack offline pause. Không còn must-fix được reviewer nêu ở bản kiểm cuối |
| Automated tests                                                                                                                                                 | Không tạo/chạy; không được phép trong task                                                                                                                                        |
| Browser/mobile/permissions/GPS/geofence/API/E2E                                                                                                                 | **Chưa chạy**, không có screenshot hoặc runtime PASS                                                                                                                              |
| Mock                                                                                                                                                            | Chỉ cập nhật source fixture OT4; chưa chạy mock UI; mock không thay real authorization                                                                                            |

Build/typecheck sinh output local theo cấu hình có sẵn; không thay dependency hoặc mở server. Cảnh báo chuyển LF/CRLF từ Git không phải lỗi whitespace; không thay cấu hình Git để che warning.

### Lệnh static rerun

Chạy từ FE root, không cài package hoặc chạy test/server:

```powershell
.\node_modules\.bin\tsc.cmd -b --pretty false
.\node_modules\.bin\oxlint.cmd src/features/location-sharing src/features/ongoing-transport src/features/route-view src/shared/constants/route-plan-status.ts
.\node_modules\.bin\oxlint.cmd
.\node_modules\.bin\vite.cmd build
node scripts/check-import-cycles.mjs
$taskFiles = @(git diff --name-only -- '*.ts' '*.tsx')
$taskFiles += @(git ls-files --others --exclude-standard -- '*.ts' '*.tsx')
$taskFiles = @($taskFiles | Where-Object { $_ -ne 'src/shared/constants/route-plan-status.ts' })
.\node_modules\.bin\prettier.cmd --check @taskFiles PEGAXUS_DUONG_6_API_FE_IMPLEMENTATION_REPORT.md
git -c core.safecrlf=false diff --check
git status --short
```

Danh sách động chỉ phù hợp working tree của phiên này. Nếu có changes mới của người khác, dùng danh sách file §8 thay vì format/check toàn bộ changes của họ. Không dùng `--write` lên unrelated source.

## 10. Vấn đề còn lại

| Mức              | Phân loại / owner         | Vấn đề và bước tiếp                                                                                                                                                                                                                |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1               | BE / C1 C6 C9             | Arrival/accepted/isMine/HO7 chưa có ở checkout; hoàn thiện BE + deployment rồi mới bật HO7 và nghiệm thu C9                                                                                                                        |
| P1               | BE / C2 C3 C5             | Geofence/time/handover exemption legacy khác contract; FE không tự đổi official timestamps hoặc complete segment                                                                                                                   |
| P1               | BE / D4                   | Phải xóa Customer incident payload ở BE, không chỉ redaction/hide FE                                                                                                                                                               |
| P1               | BE / D6                   | RETURN rejection/notification/discarded-resource logic chưa đổi đầy đủ; không hứa LM Note đã giao                                                                                                                                  |
| P1               | Integration / Khuyên      | Crew Home chưa gắn gate; không tuyên bố khóa action trên Home đã hoạt động                                                                                                                                                         |
| P2               | Teammate-owned / Uyên     | OT4 SCHEDULE-only/TS shortcut chờ form HO3 đọc createModes; hiện withhold action có nguy cơ gọi sai startNow                                                                                                                       |
| P2               | Teammate-owned / Khuyên   | Shared constant đã có nhưng shared union/list/labels/badge vẫn legacy, cần hoàn thiện đồng bộ                                                                                                                                      |
| P2               | BE / B5 + VH1 owner       | Same-plan/external strict schedule validation chưa đúng; catalog resource của BACKUP khác có thể chưa hiện qua legacy availability. Không ép bỏ resource có sẵn/giữ nguyên để né lỗi                                               |
| P2               | Business decision / BA+BE | HO7 leave/reenter lock xuyên reload chưa có contract đủ rõ; không thêm field invented                                                                                                                                              |
| P2               | Documentation             | Flow3 EC2 còn ghi CANCELLED; BR-066/UC-48 còn mô tả approval kích hoạt ngay; UC-53 còn hứa background worker/Always Allow; BR-046 còn endpoint cũ. Áp precedence Flow4 + Flow5 C9/D6 đã được user chỉ định, không sửa tài liệu gốc |
| P1 trước release | FE/QA integration         | Chưa có runtime, role, mobile/focus, real GPS lifecycle/races hoặc real API verification; cần quyền kiểm thử và fixture cô lập riêng                                                                                               |

Một JS realm chỉ có một owner/GP2 flight; không đồng bộ giữa nhiều tab/device. Abort không hoàn tác mutation BE đã nhận. Browser background/lock screen không được bảo đảm; pause/resume vẫn bỏ điểm cũ, không replay. Đây là giới hạn được giữ minh bạch, không fake worker/native GPS.

## 11. Ma trận cuối sáu API

| API | FE Implementation                                                                             | Real BE Support (source checkout)         | Feature Gate/Mock                                    | Runtime Verified | Remaining Owner                    |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- | ---------------- | ---------------------------------- |
| GP2 | Mở rộng schema/sender/arrival/C9; legacy còn gửi được                                         | Endpoint cũ có; C1/C9 chưa có             | GPS real giữ guard hiện có; không mock success       | Không            | BE C1/C9, QA                       |
| HO7 | Schema/service/mutation/popup/errors/refresh đã có                                            | Endpoint thiếu                            | **Gate OFF mặc định**                                | Không            | BE C6, lead bật gate, QA           |
| OT3 | Privacy FE fixed; server-only display và targeted refresh                                     | Cơ bản có; C2/D4/timestamps còn sai/thiếu | Mock cũ opt-in, không giả BE đã sửa                  | Không            | BE C1/C2/D4, QA                    |
| OT4 | New fields/legacy guard/same Driver/readonly + START_NOW path; SCHEDULE integration còn thiếu | New fields thiếu                          | Mock fixture cập nhật, legacy unsafe action withheld | Không            | BE C2, Uyên HO3/C3–C5, QA          |
| EC2 | D6 UX/status + EXTRA lifecycle/error mapping/refresh                                          | EXTRA đã có; D6/B5 chưa đúng              | Phân biệt CANCELLED thật; không fake notification    | Không            | BE B5/D6, Khuyên shared status, QA |
| EC3 | MAIN+EXTRA guards, optional overrides, resource reuse/errors/refresh                          | Endpoint + EXTRA check có; B5 còn lỗi     | Không thay response thật bằng mock thành công        | Không            | BE B5, QA                          |

**FE IMPLEMENTED — BE INTEGRATION PENDING** không đồng nghĩa mọi acceptance criterion đã E2E PASS. Các dependency đồng đội ở trên vẫn là công việc cần tích hợp, không được tính là source đã sửa của task này.

## 12. Manual verification theo role — CHƯA THỰC HIỆN

Chỉ chạy browser/API mutation sau khi được cấp quyền riêng với account, transport và recipients test cô lập. GP2 có thể ghi arrival; HO7 ghi timestamp; GP3 tạo notification; EC2/EC3 đổi route/resources. Không dùng shared DEV/production để thử tự do.

1. **Driver phụ trách current segment:** real IN_TRANSIT + OT2 isMine true; mở `/crew/transports/{id}` bằng card hoặc notification. Popup C9 không tự xin GPS khi mount, Escape/outside không đóng. Start → permission → fresh GP2; chỉ accepted=true đúng scope mới unlock trong 60 s. Granted/callback/serverTime-only không unlock.
2. **Driver vừa bàn giao:** cho GP2 trả false/NOT_CURRENT_SEGMENT_DRIVER; watch/timer dừng, không arrival/GP3 giả, thông báo trung tính. Chuyển offline/online hoặc refresh query không tự restart. Driver mới account khác cần consent/proof riêng.
3. **Driver tại exempt boundary:** accepted=true + arrival false; một popup đúng boundary; không HO3. Gate OFF không POST HO7. Sau BE/gate được duyệt, fresh confirm đúng lat/lon và time server; click lặp không double submit; success đổi cả OT3/OT4. Dismiss giữ giờ BE, không standalone action ở segments.
4. **HO7 lỗi:** fixture được phép trả ARRIVAL_LOCKED/NOT_IN_ARRIVAL_RADIUS/HANDOVER_REQUIRED/network/400/403/409/malformed envelope. Kiểm close/redirect/message, không optimistic time hoặc automatic retry; rời trang/logout trong flight không late success ở session mới.
5. **Driver tại required boundary:** chỉ gợi ý create/start/open theo record và capability; không HO7. PICKUP/DELIVERY luôn formal; outsourced/null ID không suy same Driver. Hoàn tất thực tế bằng module Uyên/HO5 mới cập nhật mốc chính thức.
6. **Geofence/lifecycle:** vị trí đi ra ngoài sau 400 m mới warning; speed 0/null/NaN không countdown; >radius đóng. Offline/hidden pause, foreground lấy point mới; Stop/đổi transport/account/unmount dọn resources. Chuyển tab cùng transport không tạo watch thứ hai hoặc mất consent session.
7. **Escort:** overview/segments vẫn xem được, không C9 Driver popup/sender và không route location trái guard.
8. **LM:** EC2 BACKUP không đổi; RETURN APPROVE chỉ EXTRA DRAFT, MAIN giữ APPROVED, chưa ACTIVE; REJECT note <10 không submit, nhãn D6 đúng, CANCELLED legacy không remap. Race lastUpdatedAt/schedule conflict phải hiện BE message, không resubmit. EC3 chỉ RETURN CONFIRMED + IN_TRANSIT + EXTRA APPROVED; bỏ segments giữ resource, IN_USE cùng-plan hợp lệ khi BE hỗ trợ.
9. **RC/TS:** không được gọi EC2/EC3 như LM. OT4 action đúng new capability; TS SCHEDULE-only được nghiệm thu sau handoff Uyên, không ép gọi START_NOW.
10. **Customer:** Booking ownership thật; Overview không incident title/code/details/actions dù BE legacy gửi array redacted. MAIN/EXTRA/null hiện an toàn; GPS tab theo canViewGpsTab. IN8 notification flow không thay đổi.
11. **Responsive/accessibility:** 320/360/390/430/768/1440 px; dialog long labels/overflow/focus trap, keyboard, pending/disabled, warning visibility. Không coi Prettier/build là bằng chứng visual.

### NEXT CODEX SESSION CONTEXT

- Giữ nguyên working tree hiện tại, không Git mutation. Đọc status trước khi làm tiếp; không dùng snapshot báo cáo cũ thay checkout.
- Phần source nằm trong ba feature đã cấp quyền, shared chỉ một declaration. Không dựng lại sender/router hoặc bật HO7 khi chưa xác nhận BE.
- Session GPS thuộc CrewShell; page dùng context, không tạo hook sender thứ hai. Proof C9 RAM có account/session/transport/segment, explicit accepted=true <60 s; legacy/unknown không unlock.
- GP2/HO7/EC2/EC3 chưa được gọi thật trong phiên. Chưa tests/browser/visual QA. Các static checks không thay E2E.
- Ưu tiên tiếp: BE C1/C2/C6/C9/D4/D6/B5, Uyên TS/SCHEDULE, Khuyên Home/shared status, sau đó QA cô lập có phép. Không tự sửa owner source hoặc tạo fixture DB.

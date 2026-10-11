# Kế hoạch code riêng cho Khuyên

Phạm vi lấy từ:

- [flow3-frontend-task-assignment (1).md](<C:/Users/Administrator/Downloads/flow3-frontend-task-assignment (1).md>)
- [flow3.md](<C:/Users/Administrator/Downloads/flow3.md>)
- [flow3-screen-inventory.md](<F:/BA-learning/us-generate/agile-story-skills/docs/projects/pegaxus-document/screen/flow3-screen-inventory.md>)

## 1. Phạm vi Khuyên

Feature chính:

```text
src/features/route-plan/**
src/shared/components/map/** (mở rộng component dùng chung nếu cần)
src/shared/constants/route-plan-status.ts
```

Use case:

| Step | Use case | Màn hình/chức năng |
|---|---|---|
| 1 | UC-33 | Tạo RoutePlan, route builder, lưu draft/gửi legal review |
| 2 | UC-39 | Sửa RoutePlan, ghi đè toàn bộ `segments[]` |
| 3 | UC-40 | Hủy RoutePlan đang `DRAFT` |
| 4 | UC-37 | Tạo/sửa/xóa mềm contingency route |
| 5 | UC-42 | Gán/gỡ outsource cho từng segment |
| 6 | Shared map | Refactor mode, add-route preview, multi-route rendering và mobile fallback |
| 7 | Shared map/feature | Build plan từ route đã lưu; persistence đi qua API contract, không tự tạo DB model trong FE |

Không làm:

- `src/app/router.tsx`
- `src/app/route-config.ts`
- `RoutePlanDetailPage.tsx`
- `TransportPlanDetailPage.tsx`
- `fleet`, `personnel`, `transport-plan`, `route-view`
- UC-48 đổi lộ trình khẩn cấp; blocker C11 thuộc Dương/BE
- Báo giá, đặt cọc, notification inbox, upload file
- Không tự tạo API/DB `route_plan` mới cho map nếu BE contract chưa chốt; `buildPlan` là interaction state trước, không phải schema FE tự định nghĩa.

## 2. Phát hiện quan trọng từ repo và điều chỉnh plan

Repo đã có sẵn map module:

```text
src/shared/components/map/**
src/shared/utils/map/**
```

Đã dùng:

- MapLibre
- `react-map-gl`
- Geoapify
- `MapViewer`
- `RouteLayer`
- `RouteForm`
- Location search/reverse geocoding
- GeoJSON validation

Khoảng trống cần phát triển theo implementation hiện tại:

- `useMapViewerState` đang dùng `selectionMode: SelectionMode | null`; `Test.tsx` lại có `addMode` riêng.
- `SelectionMode` hiện chỉ có `ADD_LOCATION`, `FROM_LOCATION`, `TO_LOCATION`; chưa có `addRoute`/`buildPlan`.
- `MapViewer` đang nhận một `route` và `RouteLayer` chỉ render một polyline.
- `RouteForm` mới validate và phát payload qua `onSubmit`; whitebox chưa gọi mutation.
- Geoapify mới có search/nearby/reverse geocoding; chưa có routing preview trả polyline/distance/duration.
- Chưa có cache polyline, plan segment list, route-chain validation hoặc logic xử lý route/location dependency.

Vì vậy chỉ phát triển tiếp trên module này. Không tạo lại Leaflet, không tạo `route-map` trong feature, không tạo thêm map module thứ hai.

Các component dùng chung mới (nếu cần) phải đặt trực tiếp trong `src/shared/components/map/**`, cập nhật barrel export và README. Container của `route-plan` chịu trách nhiệm mapping DTO, gọi API, kiểm tra role và mutation.

## 3. Cấu trúc file đề xuất

```text
src/features/route-plan/
├── components/
│   ├── RoutePlanBuilder.tsx
│   ├── RoutePlanSegmentEditor.tsx
│   ├── RoutePlanSummary.tsx
│   ├── ContingencyRoutesTab.tsx
│   ├── ContingencyRouteForm.tsx
│   ├── LegalFeasibilityPanel.tsx
│   ├── CancelRoutePlanDialog.tsx
│   └── OutsourceSegmentDialog.tsx
├── hooks/
│   ├── useRoutePlanBuilder.ts
│   ├── useRoutePlanDetail.ts
│   └── useRoutePlanMutations.ts
├── pages/
│   ├── CreateRoutePlanPage.tsx
│   ├── EditRoutePlanPage.tsx
│   ├── CreateContingencyRoutePage.tsx
│   └── EditContingencyRoutePage.tsx
├── services.ts
├── schemas.ts
├── types.ts
├── constants.ts
└── index.ts

src/shared/components/map/
├── các file hiện có theo README
├── useMapViewerState.ts      # mode duy nhất + state chọn điểm/preview dùng chung
├── RoutePreviewLayer.tsx     # preview style khác route đã lưu
├── component generic mới (chỉ khi dùng chung thật sự)
└── index.ts

src/shared/utils/map/
└── routing.ts                # Geoapify routing preview, AbortSignal, normalize response

src/shared/constants/
└── route-plan-status.ts
```

## 4. Chi tiết từng step

### Step 0 — Contract, type và status trước

Tạo trước:

- `types.ts`: `RoutePlan`, `RouteSegment`, `LocationBrief`, `VehicleBrief`, `Outsourcing`
- `schemas.ts`: validation form
- `route-plan-status.ts`:
  - enum/status label
  - `canEditRoutePlan`
  - `canCancelRoutePlan`
  - điều kiện hiển thị button
- `services.ts`: toàn bộ request của feature
- error mapper theo `errorCode`
- Map interaction state: một `mode: "view" | "addLocation" | "addRoute" | "buildPlan"`; không dùng song song `addMode`/`selectionMode` boolean.

Nguyên tắc:

- Dùng `updatedAt` khi update để chống ghi đè.
- Không tự tính luật nghỉ ngơi, capacity, BCP.
- Hiển thị lỗi BE như `422 SEGMENT_NOT_CONTINUOUS`, `REST_RULE_VIOLATION`, `VEHICLE_CAPACITY_EXCEEDED`.
- Không rẽ nhánh theo HTTP status.
- Khi đổi mode, dọn state của mode cũ: selected point, preview geometry, nearby result, abort request đang chạy.

### Step 1 — UC-33: Create RoutePlan

Route tạm:

```text
/admin/__dev/route-plans/new/:transportPlanId
```

API:

```text
GET  /transport-plans/{id}
GET  /bookings/approved/{bookingId}
GET  /locations
GET  /routes
GET  /vehicles
GET  /transport-providers
POST /transport-plans/{transportPlanId}/route-plans
POST /route-plans/{routePlanId}/legal-review
```

Chức năng:

- Wizard 4 bước.
- Chọn location/route master.
- Thêm, xóa, sắp xếp segment.
- Validate continuity của các segment.
- Segment nội bộ:
  - chỉ `ROAD`
  - được chọn vehicle
- Segment outsource:
  - không chọn vehicle/driver/escort
  - chọn provider phù hợp.
- `SAVE_DRAFT`.
- `SUBMIT_FOR_LEGAL_REVIEW`.
- `LegalFeasibilityPanel` chỉ hiển thị dữ liệu legal review BE trả; không tự đánh giá feasibility ở FE.
- Gửi đúng `segments[]`, `sequenceNo` liên tục từ `1`.

Tái sử dụng:

- `MapViewer`
- `RouteForm`
- `LocationSearch`
- `RouteLayer`
- `Input`, `Select`, `Dialog`, `Card`, `Button`, `Form`
- `LoadingState`, `ErrorState`, toast hiện có

### Step 2 — UC-39: Update RoutePlan

Route tạm:

```text
/admin/__dev/route-plans/:routePlanId/edit
```

API:

```text
GET /route-plans/{routePlanId}
PUT /route-plans/{routePlanId}
POST /route-plans/{routePlanId}/legal-review
```

Chức năng:

- Chỉ cho sửa khi status là `DRAFT`.
- Load `segments[]` hiện tại.
- Ghi đè toàn bộ danh sách segment.
- Bắt buộc `updateReason`.
- Hiển thị `RouteCompare` trước/sau.
- Giữ `updatedAt`.
- Xử lý `409 ROUTE_LOCKED`.
- Dùng chung builder của UC-33, không copy form.

### Step 3 — UC-40: Cancel Draft RoutePlan

Component public:

```text
CancelRoutePlanDialog.tsx
```

API:

```text
POST /route-plans/{routePlanId}/cancel
```

Chức năng:

- Chỉ hiện nút khi `canCancelRoutePlan(...) === true`.
- Bắt buộc nhập `reason`.
- Confirm bằng `AlertDialog`.
- Sau thành công refresh route plan từ BE.
- Dùng toast/error component sẵn có.
- Không tự đổi status nếu request thất bại.

### Step 4 — UC-37: Contingency Route

Component public:

```text
ContingencyRoutesTab.tsx
```

Route tạm:

```text
/admin/__dev/route-plans/:routePlanId/contingency/new
/admin/__dev/route-plans/:routePlanId/contingency/:backupId/edit
```

API dùng chung:

```text
POST /transport-plans/{transportPlanId}/route-plans
GET  /transport-plans/{transportPlanId}/route-plans
PUT  /route-plans/{routePlanId}
POST /route-plans/{routePlanId}/cancel
```

Quy tắc:

- Dùng `routeType = BACKUP`.
- Tất cả segment backup dùng `BACKUP`.
- Lý do tối thiểu 10 ký tự, gửi qua `routeNote`.
- Không dùng các field cũ:
  - `is_contingency`
  - `CONTINGENCY`
  - `primaryRoutePlanId`
  - `replacesRoutePlanRouteId`
- Xử lý:
  - `409 IDENTICAL_CONTINGENCY_ROUTE`
  - `409 DOSSIER_LOCKED`
- Hiển thị cảnh báo khi tạo backup làm ComplianceDossier quay về `DRAFT`.

### Step 5 — UC-42: Outsource theo segment

Component public:

```text
OutsourceSegmentDialog.tsx
```

API:

```text
PUT /route-plans/{routePlanId}/segments/{routePlanRouteId}/outsourcing
```

Chức năng:

- Chuyển segment nội bộ ↔ outsource.
- Chọn provider `ACTIVE`.
- Kiểm tra `supportedModes`.
- Nhập `note` cho service reference/AWB/flight number.
- Khi outsource:
  - xóa lựa chọn vehicle phía client
  - không gửi `vehicleIds`
- Khi chuyển về nội bộ:
  - cho chọn lại vehicle.
- Hiển thị lỗi `PROVIDER_MODE_MISMATCH`.

## 5. Phát triển trên shared map hiện có

### Map

Dùng lại trực tiếp:

```text
src/shared/components/map/MapViewer.tsx
src/shared/components/map/RouteLayer.tsx
src/shared/utils/map/**
```

Không làm lại:

- Tạo map library mới.
- Tự mock geometry.
- Tự tính distance/duration.
- Gửi geometry vào API RoutePlan.

Geoapify:

- MAP1 autocomplete.
- MAP2 reverse geocoding.
- MAP3 routing cho ROAD.
- SEA/AIR vẽ đường thẳng.
- API key chỉ đọc từ `.env`.

### Capability bổ sung nếu thiếu

Chỉ bổ sung vào `src/shared/components/map/**` khi có thể dùng ở nhiều màn hình/feature:

- hiển thị nhiều segment theo sequence;
- màu segment theo status/outsourced;
- chọn/highlight segment;
- fit map theo toàn bộ route;
- fallback an toàn khi tọa độ null.

Không đưa business rule của UC-33/37/39/40/42 vào component map.

### Timeline/compare/status

Nếu chưa có capability tương ứng, tạo component generic trong `shared/components/map`, không tạo trong `route-plan`. `RouteSegmentTimeline` nhận dữ liệu view model đã được feature adapter chuẩn hóa:

- sequence
- from/to
- km
- ETA
- vehicle/provider/personnel
- segment status
- `dwellAfterMinutes`

Tọa độ null không được làm crash map; timeline vẫn hiển thị.

### Compare

`RouteCompare` (nếu cần bổ sung) dùng cho:

- UC-39 update.
- Sau này Dương dùng cho UC-48.

### Status

Status enum/label/button condition chỉ đọc từ:

```text
src/shared/constants/route-plan-status.ts
```

Không để mỗi component tự định nghĩa lại enum hoặc điều kiện. `route-plan` chỉ truyền status và callback vào shared component.

## 6. Kế hoạch hiệu chỉnh map theo implementation hiện tại

### Step M1 — Gom mode về một state

Refactor `src/shared/components/map/useMapViewerState.ts` và `types.ts`:

```ts
type MapMode = "view" | "addLocation" | "addRoute" | "buildPlan";
```

- `mode` có default `view`; không dùng `null`/nhiều boolean để biểu diễn mode.
- `MapViewer` nhận mode/callback theo controlled props để container whitebox và `route-plan` cùng điều khiển được.
- Giữ compatibility cho callback hiện có (`onMapClick`, `onLocationSelect`, `onRouteSelect`).
- `MapSelectionMode` đổi label theo mode, có Cancel và bắt phím `Escape`.
- Add route button đặt cạnh Add Location trong container hiện tại; nút active có trạng thái rõ ràng.
- Chuyển mode phải dọn state mode cũ và abort request cũ.

State generic của map:

```text
mode
selectedLocation / hoveredLocation
startPoint / endPoint
preview geometry + preview distance/duration + preview error
nearby places + nearby loading/error
```

State domain không đặt trong map:

```text
planSegments
route plan name
route-plan mutation state
```

`buildPlan` chỉ là mode tương tác; không tự suy ra đây là bảng DB hay thay thế API RoutePlan.

### Step M2 — Add route mode

Phát triển trên `MapViewer`, `LocationMarkers`, `RouteLayer` và container test:

- Trong `addRoute`, click marker chọn location; click vùng trống bỏ qua.
- Click lần một → `startPoint`; click lần hai → `endPoint`.
- Highlight start/end; banner đổi theo trạng thái:
  - `Chọn điểm bắt đầu`;
  - `Chọn điểm kết thúc`;
  - panel xác nhận.
- Chặn A→A.
- Kiểm tra cặp A→C với route đã load; nếu trùng thì cảnh báo và disable Save.
- Khi đổi điểm cuối, xóa preview cũ trước khi request mới.
- Giữ `RouteForm` làm fallback chọn From/To, nhất là mobile; không xóa form hiện tại.

`MapViewer` không tự gọi API danh sách route hoặc save route; container truyền locations/routes và xử lý callback.

### Step M3 — Geoapify route preview

Thêm utility generic tại `src/shared/utils/map/routing.ts`:

- nhận tọa độ start/end và `AbortSignal`;
- gọi Geoapify routing cho `ROAD`;
- trả geometry/polyline chuẩn hóa bằng utility GeoJSON hiện có;
- trả distance/duration dạng preview;
- phân loại missing key, quota, network, invalid response và abort.

Quy tắc:

- Chỉ gọi khi đủ hai điểm hợp lệ.
- Mỗi request có `AbortController`; request cũ bị hủy khi đổi điểm.
- Có timeout ở container/utility.
- Preview dùng `RoutePreviewLayer` hoặc prop style riêng, khác route đã lưu.
- Lỗi preview giữ panel mở, disable Save, cho chọn lại điểm cuối.
- Nhãn UI phải ghi rõ distance là `Estimated`.
- Không dùng preview distance để thay thế distance chính thức từ BE.

### Step M4 — Save route

Trong container/feature service, không đặt mutation vào map component:

- Panel có Save, Chọn lại điểm cuối, Cancel.
- Payload gửi location IDs nếu có; nếu API contract yêu cầu thì gửi tọa độ start/end.
- BE là nơi validate hai điểm khác nhau, location tồn tại, route chưa trùng và gọi Geoapify để lưu distance/duration.
- Save thành công lấy route chính thức từ response, thêm vào state/map và hiển thị distance BE trả.
- Không optimistic commit nếu BE chưa xác nhận.
- Sau khi lưu, `endPoint` trở thành `startPoint` mới để hỗ trợ chuỗi A→C→D→...→B.
- Có nút Done để về `view`.

Nếu endpoint Create/Edit/Delete Route chưa có trong contract, chỉ hoàn thiện preview/payload/error state và ghi blocker; không gọi endpoint giả.

### Step M5 — View mode, saved routes và cache

Mở rộng `MapViewer`/`RouteLayer` theo hướng backward-compatible:

- hỗ trợ `routes: MapRoute[]`, không phá prop `route` hiện tại;
- mỗi route có source/layer ID ổn định;
- route đã lưu render theo geometry cache hoặc geometry do Geoapify trả;
- route click trả đúng route qua `onRouteSelect`;
- giữ hover marker và edit/delete location hiện có.

Cache:

- ưu tiên cache trong memory theo cặp `fromLocationId:toLocationId:transportMode`;
- chỉ dùng `localStorage` nếu cần giữ qua reload và có version/TTL;
- không cache lỗi/quota;
- invalidation khi route/location thay đổi;
- không gọi lại Geoapify khi cache còn hợp lệ.

Delete/edit dependency:

- FE kiểm tra route liên quan trước khi mở delete location.
- Nếu BE chưa có cascade policy, hiển thị cảnh báo và không giả định cascade.
- Chốt một policy BE: block delete, cascade có kiểm soát, hoặc soft delete; FE chỉ phản ánh policy/error BE.

### Step M6 — Build plan từ route đã lưu

Đây là layer interaction/domain của `route-plan`, không nhét business flow vào map:

- mode `buildPlan` dùng `planSegments: MapRoute[]` theo thứ tự;
- `currentEnd` lấy từ segment cuối;
- route polyline clickable; marker/vùng trống bỏ qua;
- chỉ cho chọn route có `start === currentEnd`;
- route đã nằm trong plan bị disable để tránh vòng lặp;
- route không hợp lệ hiển thị mờ;
- panel hiển thị thứ tự, start/end, xóa đoạn cuối, tổng distance cộng từ DB;
- map đánh số segment và highlight các route thuộc plan;
- tối thiểu một segment trước khi Save.

Payload persistence phải theo API contract hiện hành. Không tự đổi sang `name + routeIds` hoặc tạo bảng `route_plan_segment` nếu BE/contract Flow 3 chưa chốt. Nếu BE chốt API này, thêm service/schema riêng trong `route-plan`, không thêm vào shared map.

### Step M7 — Mobile, fallback và test matrix

- Mobile dùng tap thay hover; banner hiển thị tên điểm đã chọn.
- `RouteForm` vẫn là fallback cho From/To.
- Test mode transition: view → addLocation → addRoute → buildPlan và ngược lại.
- Test đổi điểm cuối nhanh, AbortController và stale response.
- Test Geoapify missing key/quota/network/timeout/no route.
- Test A→A, route trùng, route chain không liên tục, save BE fail.
- Test A→C→D→...→B, undo đoạn cuối, Done.
- Test route/location edit/delete dependency.
- Test mobile không phụ thuộc hover.

## 7. Route tạm để test

Không tự sửa router trung tâm nếu chưa được owner router đồng ý.

Cách ít ảnh hưởng nhất:

1. Tạo page test trong `src/features/route-plan/pages`.
2. Export page/component từ `src/features/route-plan/index.ts`.
3. Nhờ owner router thêm tạm một nhóm route:

```text
/admin/__dev/route-plans/new/:transportPlanId
/admin/__dev/route-plans/:routePlanId/edit
/admin/__dev/route-plans/:routePlanId/contingency/new
```

4. Xóa nhóm route này sau khi hoàn tất.
5. Route production chính chỉ được owner router tích hợp sau cùng.

Có thể dùng pattern dev route đang tồn tại trong `router.tsx`.

## 8. Tách branch/commit

Branch đề xuất:

```text
feat/flow3-route-plan-khuyen
```

Commit nhỏ:

```text
feat(flow3): add route plan contracts and status rules
feat(flow3): unify shared map interaction modes
feat(flow3): add shared route preview and multi-route rendering
feat(flow3): implement create route plan
feat(flow3): implement update route plan
feat(flow3): implement cancel draft route plan
feat(flow3): implement contingency route plans
feat(flow3): implement outsourced route segments
chore(flow3): add temporary route-plan test routes
```

Không sửa trực tiếp:

```text
src/features/fleet/**
src/features/personnel/**
src/features/transport-plan/**
src/features/route-view/**
RoutePlanDetailPage.tsx
TransportPlanDetailPage.tsx
src/app/route-config.ts
```

## 9. Blocker BE cần ghi chú

Không chặn code FE:

- C30: backup route khi ComplianceDossier đã đi xa; FE xử lý `409 DOSSIER_LOCKED`.
- BE phải trả tọa độ `fromLocation`/`toLocation` trong:
  - `/locations`
  - `/routes`
  - `/route-plans/{id}`
- BE chưa trả geometry; FE chỉ gọi Geoapify để hiển thị.
- `/routes` phải trả distance/duration theo contract.
- `TransportPlan.status` phải là `APPROVED` trước khi tạo RoutePlan; test có thể seed/mock.
- UC-48/C11 thuộc Dương, không triển khai trong phần Khuyên.
- Không có endpoint notification inbox.
- Không có API báo giá/đặt cọc trong Flow 3.
- API Create/Edit/Delete Route, geometry persistence và Geoapify routing backend chưa có trong README/contract hiện tại; chỉ wire khi BE chốt.
- Chính sách xóa Location có Route liên quan chưa chốt: block, cascade hay soft delete.
- Cache polyline cần chốt scope: memory-only hay localStorage có TTL/version.
- API build plan cần chốt payload (`routeIds` hay `segments[]`) trước khi implement persistence.

## 10. Checklist hoàn tất

- Mỗi UC có page/component/service riêng.
- Map chỉ có một `mode`; không còn trạng thái chồng chéo giữa `addMode` và `selectionMode`.
- Add route có preview, abort stale request, error state và estimated distance.
- Save chỉ cập nhật map sau response thành công từ BE.
- View hỗ trợ route đã lưu, cache có invalidation và không làm mất hover/edit/delete hiện tại.
- Build plan giữ `planSegments` ở feature/domain layer, không đưa persistence vào shared map.
- Không duplicate builder giữa create/update/backup.
- Tái sử dụng tối đa `src/shared/components/ui`, `common`, `map`, `utils/map`.
- Có loading/empty/error/success state.
- Error hiển thị theo `errorCode` và `errors[].field`.
- Kiểm tra role từ BE/route guard.
- Không tự suy luận business rule nặng.
- Chạy:

```text
pnpm exec tsc -b
pnpm lint
pnpm build
pnpm check:cycles
```

Đề xuất thứ tự thực hiện thực tế: **Step 0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → UC-33 → UC-39 → UC-40 → UC-37 → UC-42 → integration với route-view**.

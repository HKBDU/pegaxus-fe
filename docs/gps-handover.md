# BÁO CÁO BÀN GIAO KỸ THUẬT & NGHIỆP VỤ (GPS HANDOVER REPORT)
## CƠ CHẾ ĐỊNH VỊ TỰ ĐỘNG CHUYẾN ĐI & CHẶNG ĐƯỜNG DÀNH CHO TÀI XẾ & ESCORT

> **Dự án**: Cross-Border Racehorse Transport System (`pegaxus-fe`)  
> **Tài liệu tham chiếu**:  
> - Business Rules: `BR-046` (Chia sẻ vị trí GPS), `BR-048` (Quy tắc lộ trình quay đầu & hồ sơ), `BR-066`.  
> - API Contracts: `api-contract/flow4.md` (Mục M1–M9, OT2, OT3, OT4, GP2, HO5, HO7), `api-contract/flow5.md` (Mục C1, C2, C9).  
> - Backend Specs: `Backend.Everything/clear-flow/GEOFENCE_RADIUS_CHECK.md`, `SIGNALR_NOTIFICATION.md`.  
> - Frontend Modules: `src/features/location-sharing/`, `src/features/horse-health/`, `src/features/handover/`, `src/features/incident-report/`.

---

## MỤC LỤC
1. [Nguyên Lý Nghiệp Vụ Cốt Lõi (Core Principles)](#1-nguyên-lý-nghiệp-vụ-cốt-lõi)
2. [Sơ Đồ Luồng Dữ Liệu Tự Động (Data Flow Architecture)](#2-sơ-đồ-luồng-dữ-liệu-tự-động)
3. [Hiện Trạng Triển Khai Trong Frontend Repo](#3-hiện-trạng-triển-khai-trong-frontend-repo)
4. [Danh Sách Lỗi Nặng & Khiếm Khuyết Cần Khắc Phục](#4-danh-sách-lỗi-nặng--khiếm-khuyết-cần-khắc-phục)
5. [Phân Định Trách Nhiệm Sửa Lỗi (FE vs BE Matrix)](#5-phân-định-trách-nhiệm-sửa-lỗi-fe-vs-be)
6. [Hướng Dẫn Triển Khai Mã Nguồn Chi Tiết (Code Fix Guide)](#6-hướng-dẫn-triển-khai-mã-nguồn-chi-tiết)
7. [Kịch Bản Kiểm Thử & Tiêu Chí Nghiệm Thu (Acceptance Criteria)](#7-kịch-bản-kiểm-thử--tiêu-chí-nghiệm-thu)

---

## 1. NGUYÊN LÝ NGHIỆP VỤ CỐT LÕI

Trong quá trình vận chuyển ngựa đua qua biên giới, tài xế (**Driver**) và người áp tải chăm sóc ngựa (**Escort**) phải làm việc trong điều kiện thực địa (lái xe đường dài, chăm sóc ngựa, làm thủ tục hải quan). Do đó, thiết kế hệ thống đặt ra các nguyên tắc bất biến:

### 1.1. Tự động nhận diện Chuyến đi (Zero Manual Trip Selection)
* Tài xế và Escort **không bao giờ phải gõ mã chuyến, không phải chọn chuyến đi từ danh sách dropdown** khi thao tác.
* Khi đăng nhập vào ứng dụng mobile/PWA, hệ thống sử dụng **Token xác thực (Identity / Employee ID)** gọi API **`OT2`** (`GET /api/v1/transports/assigned-to-me?status=READY,IN_TRANSIT`).
* Backend tự động đối chiếu bảng phân công nhân sự (`TransportAssignment`) để trả về chuyến đi duy nhất mà nhân viên đó đang phụ trách.

### 1.2. Tự động nhận diện Chặng đường hiện tại (`currentSegment`)
Chặng đường của một chuyến xe được xác định thông qua **Mốc thời gian thực tế** và **Trạng thái chặng**:
* Chặng hiện tại là chặng đã có giờ khởi hành thực tế (`actual_departure_at != null`) và chưa có giờ đến thực tế (`actual_arrival_at == null`), trạng thái là `IN_TRANSIT`.
* Việc chuyển chặng được kích hoạt bởi:
  1. **Biên bản bàn giao (HO5)**: Tại các điểm giao nhận, đổi tài xế, hoặc cửa khẩu (`handoverRequired = true`), thời điểm ký hoàn tất biên bản chính là mốc chốt giờ đến chặng trước và giờ đi chặng sau.
  2. **GPS Geofence (GP2)**: Tại các ranh giới chạy liên tục cùng một tài xế (`handoverRequired = false`), hệ thống tự động ghi giờ đến tạm khi xe đi vào bán kính đích.

### 1.3. Cơ chế Geofence 500m & Giám sát GPS thời gian thực (Haversine 500m)
* **Bật chia sẻ vị trí**: Tài xế chỉ cần kích hoạt công tắc *"Bật chia sẻ vị trí hành trình"*.
* **Tần suất gửi**: Trình duyệt dùng `navigator.geolocation.watchPosition`, đóng gói tọa độ gửi lên API **`GP2`** (`POST /api/v1/transports/{transportId}/locations`) đều đặn mỗi **15 giây**.
* **Xử lý mất mạng (`BR-046`)**: Nếu mất mạng trên đường cao tốc, bỏ qua điểm lỡ, khi có mạng trở lại chỉ gửi điểm mới nhất, **tuyệt đối không gửi bù dữ liệu cũ**.
* **Thuật toán Geofence trên BE**: Backend tính khoảng cách Haversine giữa tọa độ xe gửi lên và tọa độ điểm đích (`toLocation`) của chặng:
  $$\text{Khoảng cách} = 2 \times R \times \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta\text{long}}{2}\right)}\right) \le 500\text{ m}$$
  Khi xe vào bán kính 500m, BE kích hoạt sự kiện `arrival`.

### 1.4. Quy tắc Quyền sở hữu độc quyền của Driver chặng (`C9` / Single Ownership)
* Trong một chuyến đi đường dài có thể có 2 tài xế (Driver 1 lái chặng Pháp, Driver 2 lái chặng Anh).
* Backend chỉ chấp nhận tọa độ GPS từ tài xế được phân công lái chặng đang `IN_TRANSIT`. Nếu Driver 2 bật app sớm hoặc Driver 1 quên chưa tắt app, BE tự động trả về:
  ```json
  { "serverTime": "...", "accepted": false, "reason": "NOT_CURRENT_SEGMENT_DRIVER" }
  ```
* Phía Frontend cài đặt `useLocationGate`: Khóa các tính năng tác vụ của Driver 2 cho đến khi Driver 1 ký bàn giao xe xong.

---

## 2. SƠ ĐỒ LUỒNG DỮ LIỆU TỰ ĐỘNG

```
[Driver / Escort Mobile]                   [Backend (pegaxus-be)]              [Hardware / DB]
        │                                             │                               │
 1. Đăng nhập (JWT Token)                             │                               │
        ├────────────────── GET /assigned-to-me ─────►│ Query TransportAssignment    │
        │◄───────────────── Chuyến & Chặng hiện tại ──┤ Lấy toLocation & toạ độ 500m  │
        │                                             │                               │
 2. Bật GPS (WatchPosition)                           │                               │
        │ (Lấy toạ độ thiết bị mỗi 15s)               │                               │
        ├────────────────── POST /locations (GP2) ───►│                               │
        │                   {lat, long, speed}        ├─ So khớp driver_employee_id   │
        │                                             ├─ Tính Haversine <= 500m?      │
        │                                             │                               │
        │◄───────────────── accepted: true ───────────┤                               │
        │                   arrival: { 500m geofence }│                               │
        │                                             │                               │
 3. Điền Form Nghiệp vụ                               │                               │
    (Sự cố, Nhật ký, BCP, Hải quan)                   │                               │
        │                                             │                               │
        ├─ Tự lấy transportId từ assigned-to-me       │                               │
        ├─ Tự lấy vehicleId từ overview.currentSegment│                               │
        ├─ Tự đọc GPS hiện tại cho locationId         │                               │
        ▼                                             │                               │
 [Gửi Form không cần người dùng chọn chuyến/chặng] ──►│ Nhận đủ context ─────────────► Lưu DB
```

---

## 3. HIỆN TRẠNG TRIỂN KHAI TRONG FRONTEND REPO

### 3.1. Các thành phần đã triển khai thành công (Đạt chuẩn)
1. **Trang chủ đội xe ([`CrewHomePage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/horse-health/pages/CrewHomePage.tsx))**:
   - Sử dụng hook `useAssignedTransports` gọi API `OT2`.
   - Hiển thị tự động thông tin mã chuyến, mã đặt chỗ, số lượng ngựa, và tên chặng hiện tại (`fromLocationName → toLocationName`).
2. **Module Chia sẻ vị trí ([`src/features/location-sharing/`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/location-sharing/))**:
   - Class `LocationSender` quản lý vòng đời GPS bằng `navigator.geolocation.watchPosition`.
   - Timer 15 giây (`SEND_INTERVAL_MS = 15_000`) gửi tọa độ lên `GP2`.
   - Xử lý mượt mà sự kiện `arrival` khi xe vào bán kính 500m (mở popup nhắc cập nhật giờ đến hoặc gợi ý tạo biên bản bàn giao).
   - Hook `useLocationGate` kiểm soát quyền gửi theo đúng chặng (`currentSegment.isMine`).
3. **Form Bàn giao chặng ([`HandoverStartPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/handover/pages/HandoverStartPage.tsx))**:
   - Tự động lấy điểm bàn giao từ ranh giới chặng (query params `fromRoutePlanRouteId`, `toRoutePlanRouteId`). Tài xế không phải gõ tay trạm dừng.
4. **Form BCP ([`BcpQuarantineProofPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/quarantine/pages/BcpQuarantineProofPage.tsx)) & Hải quan ([`CustomsClearanceProofPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/clearance/pages/CustomsClearanceProofPage.tsx))**:
   - Tự động đọc mã hồ sơ pháp lý từ chuyến đi, tự điền tên trạm kiểm dịch/hải quan theo quốc gia đi và đến.
5. **Form Nhật ký sức khỏe ngựa ([`HealthLogPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/horse-health/pages/HealthLogPage.tsx))**:
   - Escort ghi nhận sinh hiệu theo từng con ngựa của chuyến đi hiện tại, không đòi hỏi chọn chặng.

---

## 4. DANH SÁCH LỖI NẶNG & KHIẾM KHUYẾT CẦN KHẮC PHỤC

Mặc dù giao diện các form không yêu cầu nhập tay mã chuyến/chặng, nhưng **luồng truyền dữ liệu ngầm giữa các màn hình đang bị đứt gãy nghiêm trọng**:

### 🔴 Lỗi 1: Form Báo cáo sự cố xe (Vehicle Incident) mất hoàn toàn ID chuyến và ID xe
* **Vị trí**:
  - Gọi đi: [`src/features/horse-health/components/CrewHomeActions.tsx#L109-L115`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/horse-health/components/CrewHomeActions.tsx#L109-L115)
  - Nhận vào: [`src/features/incident-report/pages/VehicleIncidentPage.tsx#L40-L51`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/incident-report/pages/VehicleIncidentPage.tsx#L40-L51)
* **Hiện tượng**:
  - Tại `CrewHomeActions`, nút `"Report Transport Incident"` chỉ điều hướng tới `/crew/incidents/new/vehicle` mà **không truyền state**.
  - Tại `VehicleIncidentPage`, code đọc `routeState.transportId` và `routeState.vehicleId`. Do không có state, cả 2 trường này bị gán chuỗi rỗng `""`.
  - Trang này **không có cơ chế tự động gọi `useAssignedTransports` hay `useTransportOverview` để bù đắp dữ liệu**.
* **Hậu quả**: Khi tài xế bấm *"Submit Incident"*, request gửi lên BE chứa `transportId: ""` và `vehicleId: ""`, lập tức nhận mã lỗi **`400 VALIDATION_ERROR` (ID không hợp lệ)**. Tính năng báo cáo hỏng xe trên đường bị tê liệt.

### 🔴 Lỗi 2: Form Báo cáo sự cố ngựa (Horse Incident) bị trắng danh sách khi F5/Reload
* **Vị trí**: [`src/features/incident-report/pages/HorseHealthIncidentPage.tsx#L70-L72`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/incident-report/pages/HorseHealthIncidentPage.tsx#L70-L72)
* **Hiện tượng**:
  - Trang đọc `const transportId = routeState.transportId ?? null`.
  - Nếu Escort reload trình duyệt trên điện thoại hoặc mở từ thanh thông báo, bộ nhớ `location.state` của React Router bị xóa sạch.
  - `transportId` thành `null` khiến hook `useHorseHealthOverview(null)` không lấy được dữ liệu.
* **Hậu quả**: Toàn bộ danh sách ngựa của chuyến đi bị biến mất, Escort không thể chọn được con ngựa nào để báo cáo cấp cứu.

### 🔴 Lỗi 3: Trang chủ Crew hiển thị "No ongoing transport" khi chuyến ở trạng thái `READY`
* **Vị trí**: [`src/features/horse-health/pages/CrewHomePage.tsx#L35`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/horse-health/pages/CrewHomePage.tsx#L35)
* **Hiện tượng**:
  ```tsx
  const currentTransport = query.data?.items.find((transport) => transport.status === "IN_TRANSIT")
  ```
  Code chỉ tìm kiếm chuyến có trạng thái `IN_TRANSIT`.
* **Hậu quả**: Khi chuyến xe đã sẵn sàng khởi hành (`READY`) nhưng chưa lăn bánh (chưa chuyển `IN_TRANSIT`), tài xế và escort mở ứng dụng lên chỉ thấy thông báo: *"No ongoing transport. No transport in progress is assigned to you"*. Hệ thống che giấu toàn bộ các nút thao tác làm thủ tục kiểm tra trước chuyến đi (**Pre-trip inspection**) và nhận bàn giao ngựa ban đầu (**Pickup handover**).

---

## 5. PHÂN ĐỊNH TRÁCH NHIỆM SỬA LỖI (FE vs BE)

| Hạng mục lỗi | Trách nhiệm | Chi tiết phân định |
|---|:---:|---|
| **Lỗi 1: Sự cố xe mất `transportId` & `vehicleId`** | **FRONTEND** | BE đã có sẵn API `OT2` (trả `transportId`) và `OT3` (trả `currentSegment.vehicles`). FE phải truyền `state` ở nút bấm và bổ sung hook tự động nạp xe của chặng hiện tại. |
| **Lỗi 2: Sự cố ngựa mất danh sách khi F5 reload** | **FRONTEND** | BE đã có API `horse-health-overview`. FE phải bổ sung fallback lấy `transportId` từ `useAssignedTransports` khi `routeState` bị null. |
| **Lỗi 3: Trang chủ bỏ sót chuyến `READY`** | **FRONTEND** | API `OT2` BE đã trả về mảng gồm cả `READY` và `IN_TRANSIT`. FE tự lọc cứng `IN_TRANSIT` nên phải nới lỏng điều kiện tìm kiếm. |
| **Thuật toán GPS Geofence 500m & Lọc Driver C9** | **BACKEND** | BE chịu trách nhiệm chạy thuật toán Haversine và chặn điểm GPS của Driver không đúng chặng (đã quy định tại `GEOFENCE_RADIUS_CHECK.md` và `flow5.md C9`). |

---

## 6. HƯỚNG DẪN TRIỂN KHAI MÃ NGUỒN CHI TIẾT

### Bước 1: Sửa nút bấm tại `CrewHomeActions.tsx`
Cập nhật nút `"Report Transport Incident"` truyền đủ `transportId`:

```diff
--- a/src/features/horse-health/components/CrewHomeActions.tsx
+++ b/src/features/horse-health/components/CrewHomeActions.tsx
@@ -111,6 +111,7 @@ export function CrewHomeActions({
           icon={CarFront}
           label="Report Transport Incident"
           to={incidentPaths.newVehicle()}
+          state={{ transportId: transport.transportId }}
           tone="danger"
         />
```

### Bước 2: Tự động nạp Chuyến & Phương tiện tại `VehicleIncidentPage.tsx`
Bổ sung fallback tự động tìm chuyến từ `useAssignedTransports()` và tự lấy `vehicleId` của chặng từ `useTransportOverview()`:

```tsx
// Thêm hook lấy chuyến và thông tin chặng
const assignedQuery = useAssignedTransports();
const activeTransportId = routeState.transportId 
  || assignedQuery.data?.items.find((t) => t.status === "IN_TRANSIT" || t.status === "READY")?.transportId 
  || "";

const overview = useTransportOverview(activeTransportId, undefined, "crew");
const currentVehicleId = routeState.vehicleId 
  || overview.data?.currentSegment?.vehicles?.[0]?.vehicleId 
  || "";

// Tự động gán vào form khi dữ liệu sẵn sàng
useEffect(() => {
  if (activeTransportId && !form.values.transportId) {
    form.patch({ transportId: activeTransportId });
  }
  if (currentVehicleId && !form.values.vehicleId) {
    form.patch({ vehicleId: currentVehicleId });
  }
}, [activeTransportId, currentVehicleId, form]);
```

### Bước 3: Tự động phục hồi `transportId` tại `HorseHealthIncidentPage.tsx`
```tsx
const assignedQuery = useAssignedTransports();
const transportId = routeState.transportId 
  ?? assignedQuery.data?.items.find((t) => t.status === "IN_TRANSIT" || t.status === "READY")?.transportId 
  ?? null;
```

### Bước 4: Nhận diện cả chuyến `READY` tại `CrewHomePage.tsx`
```diff
--- a/src/features/horse-health/pages/CrewHomePage.tsx
+++ b/src/features/horse-health/pages/CrewHomePage.tsx
@@ -34,7 +34,8 @@ function TransportCard({ transport }: { transport: AssignedTransport }) {
 export default function CrewHomePage() {
   const query = useAssignedTransports()
-  const currentTransport = query.data?.items.find((transport) => transport.status === "IN_TRANSIT")
+  const currentTransport = query.data?.items.find((t) => t.status === "IN_TRANSIT")
+    ?? query.data?.items.find((t) => t.status === "READY")
 
   return <CrewShell><div className="mx-auto max-w-3xl space-y-4">
```

---

## 7. KỊCH BẢN KIỂM THỬ & TIÊU CHÍ NGHIỆM THU

### Test Case 1: Đăng nhập nhận ca khi chuyến đang `READY`
* **Các bước**:
  1. Gán Driver A và Escort B vào chuyến `TR-001` (trạng thái `READY`).
  2. Driver A đăng nhập vào mobile.
* **Kỳ vọng**: Màn hình Home hiển thị thẻ chuyến `TR-001`, hiển thị chặng xuất phát 1, trạng thái `READY`. Các nút Pre-trip check và Bàn giao Pickup xuất hiện bình thường.

### Test Case 2: Báo cáo hỏng xe khẩn cấp giữa đường
* **Các bước**:
  1. Chuyến xe đang chạy (`IN_TRANSIT`). Xe gặp sự cố nổ lốp.
  2. Driver bấm nút đỏ *"Report Transport Incident"*.
* **Kỳ vọng**:
  - Không có ô nhập mã chuyến hay biển số xe nào trên form.
  - Vị trí GPS tự động nhận diện tọa độ thực tế từ điện thoại.
  - Header hiển thị đúng mã chuyến đi hiện tại.
  - Bấm gửi thành công, API nhận đủ `transportId` và `vehicleId` hợp lệ, không bị lỗi 400.

### Test Case 3: Báo cáo cấp cứu ngựa và Reload trình duyệt
* **Các bước**:
  1. Escort bấm *"Report Horse Incident"*.
  2. Tại màn hình chọn ngựa, Escort vuốt màn hình kéo để F5/Reload trình duyệt.
* **Kỳ vọng**: Màn hình tự phục hồi dữ liệu từ `assigned-to-me`, danh sách ngựa của chuyến đi vẫn hiển thị đầy đủ, không bị lỗi màn hình trắng.

### Test Case 4: Xe chạy vào bán kính Geofence 500m
* **Các bước**:
  1. Driver bật chia sẻ vị trí (GPS gửi đều 15s/lần).
  2. Xe di chuyển tới cách trạm dừng `toLocation` dưới 500m.
* **Kỳ vọng**:
  - Màn hình Driver tự động bật Popup thông báo đã đến điểm kết thúc chặng.
  - Nếu là chặng cần biên bản (`handoverRequired = true`), popup hiển thị gợi ý tạo biên bản bàn giao.
  - Nếu là chặng cùng tài xế đi tiếp (`handoverRequired = false`), popup hiển thị đồng hồ đếm ngược xác nhận cập nhật giờ đến.

---
*Tài liệu được thiết lập để làm tiêu chuẩn bàn giao kỹ thuật cho tính năng Định vị GPS và Tự động hóa Chặng/Chuyến tại dự án Pegaxus.*

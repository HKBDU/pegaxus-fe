#Thiếu nợ notification

# API Contract — Flow 3: Lập kế hoạch lộ trình & Điều phối phương tiện

> **Căn cứ:** UC-32 → UC-48 (`use-case/use-case-details/flow3/`) + Physical ERD **V7** (`dbdiagram/racehorse_transport_physical_erd_final_v7.dbml`: `Transport`, `TransportPlan`, `RoutePlan`, `RoutePlanRoute`, `RoutePlanRouteVehicle`, `Location`, `Route`, `Vehicle`, `TransportProvider`, `TransportPlanProvider`, `EmployeeTransportPlan`, `BookingEmployeeAssignment`, `Notification`, `AccountNotification`, `OutboxMessage`) + `screen/flow3-screen-inventory.md` + quy ước của `api-contract/flow1.md` và `flow2.md`.
>
> **Nguyên tắc xử lý khi UC và ERD v7 lệch nhau:** contract **không tự quyết**. Mọi điểm lệch/thiếu đều được ghi ở [Mục 1](#1-️-conflict-và-điểm-cần-team-confirm) (mã `C01…C26`). Ở các API bị ảnh hưởng có gắn nhãn `⚠️ Cxx`. Phần contract bên dưới viết theo **"Đề xuất"** của từng conflict để FE/BE có thể làm tiếp; khi team chốt khác, chỉ cần sửa đúng chỗ có nhãn.
>
> **Đọc [Mục 1](#1-️-conflict-và-điểm-cần-team-confirm) trước khi review phần còn lại.** Cột `Xác nhận` ở bảng đó là chỗ để bạn ghi quyết định.

## Mục lục

- [0. Quy ước chung](#0-quy-ước-chung)
- [1. ⚠️ Conflict và điểm cần team confirm](#1-️-conflict-và-điểm-cần-team-confirm)
- [2. Quy tắc nghiệp vụ & state machine](#2-quy-tắc-nghiệp-vụ--state-machine)
- [3. Object dùng chung](#3-object-dùng-chung)
- [4. Lookup: Location & Route master](#4-lookup-location--route-master)
- [5. Booking đã duyệt (UC-32)](#5-booking-đã-duyệt-uc-32)
- [6. Transport Plan (UC-34, UC-35)](#6-transport-plan-uc-34-uc-35)
- [7. Báo giá ước tính (UC-34, UC-35)](#7-báo-giá-ước-tính-uc-34-uc-35)
- [8. Transport Provider (UC-41) & thuê ngoài (UC-42)](#8-transport-provider-uc-41--thuê-ngoài-uc-42)
- [9. Vehicle (UC-43 → UC-46)](#9-vehicle-uc-43--uc-46)
- [10. Route Plan (UC-33, UC-37 → UC-40)](#10-route-plan-uc-33-uc-37--uc-40)
- [11. Thẩm định pháp lý & phê duyệt (UC-47)](#11-thẩm-định-pháp-lý--phê-duyệt-uc-47)
- [12. Phân công nhân sự (UC-36)](#12-phân-công-nhân-sự-uc-36)
- [13. Thay đổi lộ trình khẩn cấp (UC-48)](#13-thay-đổi-lộ-trình-khẩn-cấp-uc-48)
- [14. Sự kiện Notification (không có endpoint)](#14-sự-kiện-notification-không-có-endpoint)
- [15. Mapping UC → API](#15-mapping-uc--api)
- [16. Phụ lục — Đề xuất bổ sung ERD](#16-phụ-lục--đề-xuất-bổ-sung-erd)

---

## 0. Quy ước chung

Kế thừa `api-contract/flow1.md` và `flow2.md`: Base URL `/api/v1`, ID số `bigint` (theo ERD V7; mục "ID: UUID" ở flow1 đã lỗi thời), timestamp ISO 8601 UTC, ngày `YYYY-MM-DD`, field camelCase bám tên cột ERD, tất cả endpoint 🔒 `Authorization: Bearer <accessToken>`.

**Response thành công / lỗi** (đúng format flow1; `errorCode` và `errors` nằm **ngoài** `value`, không như bản flow3 cũ):

```json
{ "isSuccess": true, "code": 200, "message": "Result message", "value": {} }
```

```json
{
  "isSuccess": false,
  "code": 422,
  "errorCode": "REST_RULE_VIOLATION",
  "message": "Violation of mandatory rest rules (BR-033/BR-034).",
  "errors": [{ "field": "segments[1]", "message": "Driving time 5h 20m exceeds 4.5h without a rest stop of at least 45 minutes" }],
  "value": null
}
```

**Phân trang:** query `pageIndex`, `pageSize`, `sortBy` (dạng `createdAt:desc`); response `items`, `pageIndex`, `pageSize`, `totalItems`, `totalPages`. Danh sách rỗng trả `200` với `items: []`, không trả `404`.

**Chống ghi đè (optimistic locking):** API sửa gửi `lastUpdatedAt` (giá trị `updatedAt` FE đang giữ), giống B5 của flow1. Lệch → `409 *_MODIFIED`. Response ghi trả `updatedAt` mới.

**Lỗi chung** (không lặp lại ở từng API):

| HTTP | errorCode | Khi nào |
| ---- | --------- | ------- |
| 400 | `VALIDATION_ERROR` | Thiếu field bắt buộc / sai kiểu / sai khoảng giá trị; `errors[]` liệt kê `{ field, message }` |
| 401 | `UNAUTHORIZED` | Token sai hoặc hết hạn |
| 403 | `FORBIDDEN` | Sai role, hoặc RC/TS không được phân công vào Transport Plan đó |
| 500 | `SYSTEM_ERROR` | Lỗi hệ thống |

**Quy ước HTTP cho lỗi nghiệp vụ** (theo tiền lệ flow1: `422 BOOKING_HAS_NO_HORSE`): `404` không tìm thấy · `409` xung đột trạng thái / trùng dữ liệu / bị khóa / bị sửa trước · `422` vi phạm quy tắc nghiệp vụ (đặt cọc, nghỉ ngơi, sức chứa, pháp lý…).

**Actor viết tắt:** `LM` = Logistics Manager, `RC` = Fleet & Route Coordinator, `TS` = Transport Specialist, `DRV` = Driver, `ESC` = Escort, `CUS` = Customer.

**Mã tự sinh (BR-016):** `planCode = TP-YYYYMMDD-XXXX`; `routePlanCode = RP-YYYYMMDD-XXXX` (⚠️ C21: BR-016 chưa quy định mã RoutePlan, đây là đề xuất); `XXXX` 4 chữ số, unique, retry tối đa 20 lần. Mã do server sinh, client không gửi.

**Bỏ qua trong contract này:** không trả `statusName` (FE tự map nhãn hiển thị); không có endpoint đọc audit (UC-35/40/46 chỉ yêu cầu **ghi** audit — xem C07).

---

## 1. ⚠️ Conflict và điểm cần team confirm

Đã đối chiếu từng UC của Flow 3 với ERD V7. Mức độ: 🔴 **Blocker** (không implement đúng UC nếu giữ nguyên V7) · 🟠 **High** · 🟡 **Medium** · ⚪ **Low**. Cột **Đề xuất** là phương án mà contract bên dưới **đang dùng**. Cột **Xác nhận**: bạn điền `✅ đồng ý` hoặc quyết định khác.

### 1.1. Blocker

| ID | Conflict (UC ↔ ERD V7) | Ảnh hưởng API | Đề xuất (contract đang dùng) | Xác nhận |
| --- | --- | --- | --- | --- |
| 🟢 **C01** | **RoutePlan 1-1 với TransportPlan.** V7: `RoutePlan.transport_plan_id [unique]` và `Ref: RoutePlan.transport_plan_id - TransportPlan` (one-to-one). UC-37 cần **nhiều** RoutePlan cho 1 TransportPlan (1 chính + n dự phòng), mỗi cái có status/thẩm định riêng, liên kết với RoutePlan chính (`is_contingency = true`), phạm vi toàn tuyến hoặc 1 chặng (`RoutePlanRouteID`). V7 có `RoutePlanRoute.route_type` (`PRIMARY/BACKUP/RETURN`) nhưng ở **cấp chặng**: không có status/legal review riêng cho phương án dự phòng, và `(route_plan_id, sequence_no) [unique]` làm backup và primary đụng `sequence_no`. | RP1–RP8, EC1–EC4, mọi API trả Route Plan | **Phương án A (đang dùng):** bỏ `[unique]` trên `RoutePlan.transport_plan_id`; thêm `RoutePlan.route_type` (`PRIMARY/BACKUP`), `primary_route_plan_id` (self FK, null với PRIMARY), `reason`, `replaces_route_plan_route_id` (null = toàn tuyến). Mỗi RoutePlan có `sequence_no` riêng. Mỗi TransportPlan tối đa **1 PRIMARY chưa hủy**. `RoutePlanRoute.route_type` giữ cho `RETURN` (UC-48) và đồng bộ theo plan. **Phương án B (giữ V7):** 1 RoutePlan, backup là `RoutePlanRoute.route_type = BACKUP` dùng offset `sequence_no`; đổi lại không có status/thẩm định riêng cho backup, UC-37 phải rút gọn. | ✅ Resolved (Db hiện tại là TP 1:N RT) |
| 🟢 **C02** | **State machine RoutePlan (Đã thống nhất theo DB V7).** `route_plan_status` sử dụng chính xác các trạng thái theo DB V7: `DRAFT, CONFIRMED, ACTIVE, COMPLETED, CANCELLED`. `CONFIRMED` là trạng thái khi TS chấp nhận RoutePlan (chuyển `ComplianceDossier` từ `DRAFT` sang `IN_PREPARATION`), đủ điều kiện để gán Driver & Escort (Đợt 2). Các Use Case detail đã được điều chỉnh đồng bộ theo DB. | Mọi API Route Plan; UC-32 `routePlanningStatus` | Sử dụng `route_plan_status` chuẩn DB V7: `DRAFT, CONFIRMED, ACTIVE, COMPLETED, CANCELLED`. | ✅ Resolved |
| 🟢 **C03** | **Provider gắn trên chặng.** UC-33/36/42 yêu cầu lưu `transport_provider_id` **trực tiếp vào `RoutePlanRoute`** (kèm `service_type` và mã tham chiếu AWB/booking). V7 `RoutePlanRoute` **không có** field này; `TransportPlanProvider` chỉ là liên kết cấp plan (PK `(transport_plan_id, transport_provider_id)`) nên không biết provider nào chạy chặng nào, và 2 chặng cùng provider khác AWB không lưu được. | RP1, RP4, OS1, RP3, mọi API trả Segment | Thêm vào `RoutePlanRoute`: `transport_provider_id` (FK, null), `service_type varchar(100)`, `provider_reference varchar(150)`. **Chặng thuê ngoài ⇔ `transport_provider_id IS NOT NULL`**; không cần cột `execution_type` riêng (API trả `executionType` = `INTERNAL`/`OUTSOURCED` suy ra). `TransportPlanProvider` vẫn được upsert/xóa tự động theo UC-42. | ✅ Resolved (Db đã gắn dc provider) |
| 🟢 **C04** | **Escort + thời điểm gán Driver.** (a) UC-36 gán **Driver + Escort theo từng chặng**; V7 chỉ có `RoutePlanRoute.driver_employee_id`, không có Escort theo chặng. (b) V7 ghi chú 11: `driver_employee_id` phải có **trước khi** RoutePlan `CONFIRMED/ACTIVE`; UC-36/47 gán Driver **sau** khi RoutePlan được Manager duyệt. (c) Flow 2 (R13) kiểm quyền Driver/Escort nộp proof qua `EmployeeTransportPlan`, nên Phase 2 phải ghi bảng đó; PK `(employee_id, transport_plan_id)` chỉ cho 1 dòng/nhân viên/plan. | PS3, PS4, RP8, RP3 | (a) Thêm `RoutePlanRoute.escort_employee_id` (FK Employee, role `ESCORT`). (b) Bỏ ràng buộc "driver phải có trước khi CONFIRMED" — chỉ kiểm tra "đủ nhân sự" ở thời điểm **khởi hành** (Flow 4) và để `personnelStatus` suy ra. (c) PS3/PS4 upsert thêm dòng `EmployeeTransportPlan` (`responsibility = DRIVER/ESCORT`) cho Flow 2. | ✅ Resolved (Đã có đủ escort và driver. Phân công đã dc ghi chú sẽ có sau khi RoutePlan thành confirmed) |
| 🔴 **C05** | **Hai nơi lưu phân công đợt 1.** V7 có `BookingEmployeeAssignment` (LM giao TS/RC cho **Booking**, có `status ACTIVE/REVOKED`, giữ lịch sử thay người) **và** `EmployeeTransportPlan` (UC-34/36 ghi bảng này). Cả hai cùng mô tả "TS + RC phụ trách chuyến". Ngoài ra `BookingEmployeeAssignment.booking_id/employee_id/…` là `uuid` trong khi `Booking.booking_id`/`Employee.employee_id` là `bigint` → `Ref` sai kiểu; unique `(booking_id, assignment_role)` không lọc `status = ACTIVE` nên không giữ được lịch sử khi thay người. | PS1, PS2, TP1 | Contract ghi **`EmployeeTransportPlan`** (đúng UC-34/36 và Flow 2 R13). Cần team chốt: bỏ `BookingEmployeeAssignment` hay dùng làm lịch sử (và sửa kiểu `uuid → bigint`, đổi unique thành partial `WHERE status = 'ACTIVE'`). | ☐ |
| 🟢 **C06** | **Báo giá & đặt cọc không có trong V7.** UC-34/35 lưu báo giá ở "bảng DB Báo giá riêng" (tổng + chi tiết cước/kiểm dịch/nhân công/chăm sóc ngựa/dự phòng, currency); UC-32/33/47 dùng `DEPOSIT_PENDING/DEPOSIT_PAID` để lọc và chặn. V7 **không có** bảng quotation, và `Invoice`/`Receipt` không có khái niệm "đặt cọc" (không có `invoice_type`/`deposit_*`). | TP1, TP4, QT1–QT3, AB1, AB2, RP1, RP8 | Thêm `TransportQuotation` + `TransportQuotationItem` (Phụ lục 16). `depositStatus` **suy ra, read-only**: `PAID` khi Invoice loại `DEPOSIT` của Booking đã `PAID`, ngược lại `PENDING` — cần thêm `Invoice.invoice_type (DEPOSIT/FINAL/…)`. Khi cọc `PAID`, **Flow 5 chuyển `TransportPlan.status PENDING → APPROVED`** (sự kiện nội bộ, không có endpoint ở Flow 3). | ✅ Resolved (Đã sửa thêm type cho invoice) |

### 1.2. High

| ID | Conflict (UC ↔ ERD V7) | Ảnh hưởng API | Đề xuất (contract đang dùng) | Xác nhận |
| --- | --- | --- | --- | --- |
| 🟢 **C07** | **Thẩm định pháp lý và kết quả từ TS.** Không cần tạo thêm bảng/trường mới trong DB. API vẫn đọc kết quả từ TS với ghi chú "(Lấy data từ ComplianceDossier)". Phía BE sẽ tự xử lý tra cứu và audit từ `ComplianceDossier`, giữ nguyên DB V7. | RP7, RP8, RP5, TP4, VH5 | Giữ nguyên DB V7. API trả kết quả thẩm định TS bằng cách đọc dữ liệu từ `ComplianceDossier`. | ✅ Resolved |
| 🟢 **C08** | **`transportModeOptions` (multi-select UC-34/35) không có chỗ lưu.** `TransportPlan` không có field phương thức vận tải dự kiến; chặng thì chưa tồn tại lúc lập plan. Ngoài ra UC-34 coi `SEA`/`AIR` là **chỉ thuê ngoài**, nhưng UC-43/44 và V7 cho tạo `Vehicle` `AIR/SEA` nội bộ. | TP1, TP4, TP3 | Thêm bảng `TransportPlanMode (transport_plan_id, transport_mode)` (hoặc cột mảng). Contract không ép "SEA/AIR bắt buộc có provider". | ✅ Resolved (Sửa xóa multi rồi) |
| 🟢 **C09** | **`RAIL` không có trong V7.** UC-43/44/45 liệt kê `transport_mode = ROAD, AIR, SEA, RAIL`; V7 `transport_mode = ROAD/SEA/AIR`. | VH1, VH3, VH4, L2 | Contract **chỉ nhận `ROAD/SEA/AIR`** (V7). Cần chốt: thêm `RAIL` vào enum hay bỏ khỏi UC. | ✅ Resolved (Sửa xóa rail rồi) |
| 🟠 **C10** | **Vehicle status.** UC-43/46: `AVAILABLE, ASSIGNED, IN_TRANSIT, MAINTENANCE, SUSPENDED, OUT_OF_SERVICE`. V7: `AVAILABLE, ASSIGNED, IN_USE, MAINTENANCE, INACTIVE`. `IN_TRANSIT ≈ IN_USE`; `SUSPENDED` (tạm ngưng, khôi phục được) và `OUT_OF_SERVICE` (thanh lý) cùng bị gộp vào `INACTIVE`. Thêm nữa, `ASSIGNED` là 1 giá trị toàn cục nhưng gán xe là **theo khoảng thời gian** (N-N qua `RoutePlanRouteVehicle`) → xe `ASSIGNED` cho chuyến tháng 11 vẫn có thể rảnh tháng 10. | VH1–VH5, RP1 | Enum đề xuất: `AVAILABLE, ASSIGNED, IN_USE, MAINTENANCE, SUSPENDED, OUT_OF_SERVICE` (thay `INACTIVE` bằng 2 giá trị). Khi lọc theo `availableFrom/availableTo`, tính theo **chồng lịch** `RoutePlanRoute`, không dựa riêng vào `status`. | 📝 Note đợi sửa |
| 🟢 **C11** | **Thay đổi lộ trình khẩn cấp (UC-48) không có thực thể.** UC-48 xem một "đề xuất thay đổi" do RC lập (lý do, tuyến cũ vs mới, BCP/nghỉ 24h, ETA mới, chi phí phát sinh, trạng thái `IN_TRANSIT_ROUTE_CHANGE_REQUESTED`). V7 **không có** bảng này, và **không có UC nào cho RC gửi đề xuất**. Thay tuyến giữa đường cũng cần giữ chặng cũ (BR-025) nhưng `RoutePlanRoute` không có cờ `superseded`. | EC1–EC4 | Thêm `RouteChangeRequest` + cột `RoutePlanRoute.superseded_at / superseded_by_change_request_id`. Contract bổ sung **EC1 (RC gửi đề xuất)** vì UC-48 precondition cần. | ✅ Resolved (Đã xử lí. BE cho booking và TP là 1:1 fully rồi) |
| 🟢 **C12** | **Phân công Đợt 2 (Driver & Escort) khi RoutePlan CONFIRMED.** Khi TS chấp nhận `RoutePlan` (chuyển `ComplianceDossier` từ `DRAFT` sang `IN_PREPARATION`), `RoutePlan` tự động chuyển sang `CONFIRMED`. Trạng thái `CONFIRMED` là điều kiện kích hoạt mở phân công Đợt 2 (Driver & Escort). `compliance_dossier_status` gồm: `DRAFT, IN_PREPARATION, READY_FOR_SUBMISSION, SUBMITTED, PENDING, APPROVED, REJECTED, CLOSED`. | PS3, PS4, RP8 | Đợt 2 phân công Driver & Escort khi `RoutePlan` đạt trạng thái `CONFIRMED`. | ✅ Resolved |
| 🟢 **C13** | **`transport_id` vs `bookingId`, và mã `TP-`.** V7 `TransportPlan.transport_id` (không unique). `Transport` tạo **1-1 khi Booking được duyệt** (flow1 R12/B9, `Transport.booking_id [unique]`) nên API dùng `bookingId` rồi BE resolve `transportId` là khả thi. Nhưng (i) UC-34 EXC-01 "mỗi booking chỉ 1 plan" chưa có unique; (ii) flow1 B9 ví dụ `transportCode: "TP-20260917-0001"` trùng tiền tố `TP-` mà BR-016 dành cho **TransportPlan**. | TP1, mọi API trả plan | API dùng `bookingId`; BE resolve `Transport`. Đề xuất thêm `[unique]` cho `TransportPlan.transport_id` (có thể partial `WHERE status <> 'CANCELLED'`). Đề xuất `transportCode` đổi tiền tố (ví dụ `TR-`) để không trùng `TP-`. | ✅ Resolved (BE cho booking và TP là 1:1 fully rồi) |

### 1.3. Medium

| ID | Conflict / thiếu | Ảnh hưởng API | Đề xuất (contract đang dùng) | Xác nhận |
| --- | --- | --- | --- | --- |
| 🟡 **C14** | **Endpoint đọc Booking của flow1 không dùng được cho Flow 3.** B7/B8 flow1 chỉ cho `Customer, LM`; UC-32 cần `RC` và các filter (loại vận chuyển, đặt cọc, trạng thái lập lộ trình). `Booking` lưu `origin_address/origin_country` dạng **text** (không có `location_id`) nên bản cũ trả `origin.locationId` là sai. | AB1, AB2 | Tạo read-model riêng `/approved-bookings` (RC, LM) thay vì đổi quyền flow1. `transportScope` suy ra: `origin_country ≠ destination_country → INTERNATIONAL`. | ☐ |
| 🟢 **C15** | **Mô hình trạm dừng/BCP.** UC-33 có trạm nghỉ 45 phút, nghỉ 24h tại "Approved Control Post", BCP, điểm tiếp nhiên liệu. V7: `Location.location_type` có `BORDER_GATE, AIRPORT, SEAPORT, STABLE, REST_STOP` nhưng **không có** `CONTROL_POST`, và không có field "thời gian dừng". | RP1, RP4, RP3 | Trạm dừng = `Location` làm điểm nối giữa 2 chặng; **thời gian dừng suy ra** = `chặng[i+1].plannedDepartureAt − chặng[i].plannedArrivalAt` (API trả `dwellAfterMinutes`). BCP = location có `location_type ∈ {BORDER_GATE, AIRPORT, SEAPORT}`. Đề xuất thêm `location_type = CONTROL_POST` cho "Approved Control Post". | ✅ Resolved (Kiểm soát thời gian dừng out of scope) |
| 🟢 **C16** | **Kiểm tra bằng lái chở động vật sống (UC-36 bước 8).** `Employee` không có dữ liệu bằng lái/chứng chỉ. | PS3, PS4 | Contract **chỉ kiểm tra** role `DRIVER/ESCORT` + trùng lịch; chưa kiểm bằng lái. | ✅ Resolved (Ko kiểm, out of scope) |
| 🟢 **C17** | **Trạng thái `Transport` & `FULLY_ASSIGNED`.** UC-36 bước 9 đặt "trạng thái phân công `FULLY_ASSIGNED`"; V7 `transport_status = CREATED/PLANNING/READY/IN_TRANSIT/COMPLETED/CANCELLED` và UC không nói ai chuyển `PLANNING/READY`. | TP1, PS3 | `personnelStatus` (`NOT_ASSIGNED/PARTIALLY_ASSIGNED/FULLY_ASSIGNED`) **suy ra**, không lưu. Đề xuất: `Transport` `CREATED → PLANNING` khi tạo TransportPlan; `→ READY` khi route PRIMARY `APPROVED` và `FULLY_ASSIGNED`. `IN_TRANSIT/COMPLETED` do Flow 4. | ✅ Resolved (LM chuyển) |
| 🟢 **C18** | **Lộ trình dự phòng có cần thẩm định/duyệt riêng không?** UC-37 chỉ nói notify TS kiểm giấy tờ; UC-47 chỉ nhắc "lộ trình dự phòng đính kèm"; UC-48 yêu cầu backup "đã chốt trước khởi hành". | RP7, RP8, EC4 | Backup đi qua RP7 (TS thẩm định) như route chính; **RP8 duyệt PRIMARY thì duyệt luôn mọi BACKUP đang `PENDING_MANAGER_APPROVAL`** trong cùng transaction. EC4 chỉ cho dùng backup `APPROVED`. | ✅ Resolved (Lộ trình thẩm định dự phòng giống hệt thẩm định lộ trình chính, UI 2 tab, làm song song) |
| 🟢 **C19** | **"Trình Manager" là bước tự động hay thủ công.** UC-33 bước 8 / UC-39 AC-002: sau khi TS xác nhận, **RC trình** Manager. UC-33 bước 6 nói lưu `DRAFT` rồi tự gửi TS, còn AC-001 lại nói trạng thái `PENDING_LEGAL_REVIEW` ngay sau khi lưu. | RP1, RP4, RP7 | Hai `action`: `SAVE_DRAFT` (không gửi TS) và `SUBMIT_FOR_LEGAL_REVIEW` (→ `PENDING_LEGAL_REVIEW`, notify TS). TS `isFeasible = true` → **tự động** `PENDING_MANAGER_APPROVAL` (không có bước RC trình). Nếu team muốn bước thủ công cần thêm trạng thái `LEGAL_APPROVED` + 1 endpoint. | ✅ Resolved (Là sau khi chuyển thành CONFIRMED tự notify LM) |

### 1.4. Low / giả định cần xác nhận

| ID | Nội dung | Contract đang làm | Xác nhận |
| --- | --- | --- | --- |
| ⚪ **C20** | Unique & soft delete: `TransportProvider.tax_code` chưa unique; `provider_code`, `vehicle_code`, `license_plate` unique cả bản đã xóa mềm (UC-41/44 chỉ cần unique trên bản chưa xóa); `supported_modes varchar(100)` là chuỗi CSV. | Contract kiểm tra unique trên bản chưa xóa; `supportedModes` là mảng, lưu CSV `"AIR,ROAD"`. Đề xuất partial unique index (V7 ghi chú 19). | ☐ |
| ⚪ **C21** | Mã: RoutePlan chưa có quy ước mã; flow1 ví dụ booking `BK-…` còn UC/BR-016 dùng `REQ-…`. | Dùng `RP-…` và `REQ-…`. | ☐ |
| ⚪ **C22** | UC-35 AC-002 yêu cầu `400` khi sửa plan đang `IN_TRANSIT`. | Dùng `409 PLAN_LOCKED` cho nhất quán quy ước mục 0. | ☐ |
| ⚪ **C23** | **Không UC nào của Flow 3 mô tả API phía Customer:** xem báo giá, đồng ý báo giá, đặt cọc. | Không có endpoint; `TransportPlan PENDING → APPROVED` là sự kiện của Flow 5 (xem C06). Cần Flow 1/5 bổ sung. | ☐ |
| ⚪ **C24** | UC-48 AC-002: Driver tự chọn đường tránh (<50 km và <1 giờ) thì hệ thống tự ghi nhận, không tạo ticket (BR-036). Đây là thao tác của Driver trên Responsive Web (Flow 4). | **Không có endpoint ở Flow 3.** Flow 4 phải ghi nhận. EC1 chỉ dùng cho thay đổi **cần duyệt**. | ☐ |
| ⚪ **C25** | UC chưa rõ: (a) cho sửa RoutePlan **sau khi `APPROVED`** nhưng trước khởi hành không (UC-39 vs UC-40); (b) đổi status xe đang `ASSIGNED` sang `MAINTENANCE/SUSPENDED` có được không (UC-46 chỉ chặn `IN_TRANSIT`). | (a) **Không** (`409 ROUTE_LOCKED`). (b) **Không** — chặn `ASSIGNED` và `IN_USE` bằng `409 VEHICLE_STATUS_LOCKED`. | ☐ |
| ⚪ **C26** | **Notification (ghi chú "Thiếu nợ notification" đầu file):** `Notification.transport_id` bắt buộc; UC có thông báo cho Customer. Flow 3 không có endpoint inbox (thuộc Flow 8). | [Mục 14](#14-sự-kiện-notification-không-có-endpoint) liệt kê đủ sự kiện/recipient/loại; ghi `Notification` + `AccountNotification` + `OutboxMessage` (`EMAIL`, `SIGNALR_ACCOUNT`) trong cùng transaction. | ☐ |

---

## 2. Quy tắc nghiệp vụ & state machine

### 2.1. Enum

| Enum | Giá trị | Ghi chú |
| ---- | ------- | ------- |
| `TransportPlanStatus` | `DRAFT, PENDING, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED` | **Đúng V7.** Mapping từ nhãn UC: `QUOTED_PENDING_DEPOSIT → PENDING`, `READY_FOR_ROUTING → APPROVED`, `IN_TRANSIT → IN_PROGRESS` |
| `RoutePlanStatus` | `DRAFT, PENDING_LEGAL_REVIEW, PENDING_MANAGER_APPROVAL, REJECTED_BY_MANAGER, APPROVED, ACTIVE, COMPLETED, CANCELLED` | ⚠️ C02. V7 chỉ có `DRAFT, CONFIRMED(=APPROVED), ACTIVE, COMPLETED, CANCELLED` |
| `RouteType` | `PRIMARY, BACKUP` (+ `RETURN` chỉ cho chặng quay đầu UC-48) | ⚠️ C01. V7 `route_type` có cả 3 giá trị, nhưng ở cấp chặng |
| `TransportMode` | `ROAD, SEA, AIR` | ⚠️ C09 (UC có thêm `RAIL`) |
| `VehicleStatus` | `AVAILABLE, ASSIGNED, IN_USE, MAINTENANCE, SUSPENDED, OUT_OF_SERVICE` | ⚠️ C10. V7 có `INACTIVE` thay cho 2 giá trị cuối. `ASSIGNED`, `IN_USE` do hệ thống |
| `ProviderStatus` | `ACTIVE, INACTIVE, SUSPENDED` | Đúng V7 |
| `ExecutionType` | `INTERNAL, OUTSOURCED` | **Suy ra** từ `transport_provider_id` của chặng (C03), không lưu |
| `SegmentStatus` | `PENDING, IN_PROGRESS, COMPLETED` | **Suy ra** từ `actual_departure_at/actual_arrival_at` |
| `DepositStatus` | `PENDING, PAID` | **Suy ra** (C06) |
| `RoutePlanningStatus` | `NOT_STARTED, IN_PROGRESS, COMPLETED` | **Suy ra**: chưa có RoutePlan PRIMARY chưa hủy → `NOT_STARTED`; có nhưng chưa `APPROVED` → `IN_PROGRESS`; PRIMARY `APPROVED/ACTIVE/COMPLETED` → `COMPLETED` |
| `PersonnelStatus` | `NOT_ASSIGNED, PARTIALLY_ASSIGNED, FULLY_ASSIGNED` | **Suy ra** (C17): chặng nội bộ cần Driver **và** Escort; chặng thuê ngoài chỉ cần provider |
| `TransportScope` | `DOMESTIC, INTERNATIONAL` | **Suy ra** (C14) |
| `LegalReviewResult` | `FEASIBLE, NOT_FEASIBLE` | ⚠️ C07 |
| `ChangeRequestStatus` | `PENDING, APPROVED, REJECTED, EMERGENCY_RETURN` | ⚠️ C11 |
| `ExpiryStatus` | `VALID, EXPIRING_SOON (≤ 7 ngày), EXPIRED` | Suy ra từ `registration_expiry_date`/`insurance_expiry_date` (UC-43 EXC-01) |

### 2.2. State machine RoutePlan

```text
                SAVE_DRAFT                         SUBMIT_FOR_LEGAL_REVIEW
   (tạo) ───────────────────► DRAFT ────────────────────────────────────────► PENDING_LEGAL_REVIEW
                                ▲  ▲                                                 │
                                │  │ TS: NOT_FEASIBLE (kèm lý do)                    │ TS: FEASIBLE
                                │  └─────────────────────────────────────────────────┤
                                │                                                    ▼
                                │                                         PENDING_MANAGER_APPROVAL
                                │ RC sửa & lưu                                       │
                                │                          LM: REJECT (≥10 ký tự)    │ LM: APPROVE
   REJECTED_BY_MANAGER ◄────────┼────────────────────────────────────────────────────┤
        │ (RC sửa → DRAFT)      │                                                    ▼
        └───────────────────────┘                                                APPROVED ──(Flow 4 khởi hành)──► ACTIVE ──► COMPLETED

   Hủy (UC-40): chỉ từ DRAFT hoặc REJECTED_BY_MANAGER ─► CANCELLED
```

### 2.3. Quy tắc

| #   | Quy tắc |
| --- | ------- |
| R1 | **Phân quyền:** LM: UC-32, 34, 35, 36, 41, 42, 43–46, 47, 48 và UC-37 (backup). RC: UC-32, 33, 37–40, 43–46 và EC1. TS: xem Route Plan + RP7. Server luôn kiểm tra role; RC/TS chỉ truy cập Transport Plan mình được phân công (`EmployeeTransportPlan`), LM xem tất cả. |
| R2 | **Điều kiện lập plan:** `Booking.status = APPROVED` và đã có `Transport` (R12 flow1). Mỗi Booking chỉ có **1 TransportPlan chưa hủy** (UC-34 EXC-01). |
| R3 | **Cổng đặt cọc (UC-33, UC-47):** tạo RoutePlan và duyệt RoutePlan chỉ khi `TransportPlan.status ∈ {APPROVED}` (đã cọc). Chưa cọc → `422 DEPOSIT_REQUIRED`. |
| R4 | **Phân công 2 đợt (UC-36):** Đợt 1 (TS + RC) gán được ngay khi có TransportPlan. Đợt 2 (Driver + Escort theo chặng) chỉ khi route **PRIMARY** `APPROVED` (C12). Chặng thuê ngoài **không** nhận Driver/Escort. |
| R5 | **Chặng liên tục:** chặng `i+1` phải bắt đầu tại nơi chặng `i` kết thúc (`fromLocationId[i+1] = toLocationId[i]`), `plannedDepartureAt[i+1] ≥ plannedArrivalAt[i]`, `sequenceNo` liền từ 1. |
| R6 | **BR-033 (ROAD):** thời gian lái liên tục ≤ 8 giờ; sau mỗi 4–4,5 giờ lái bắt buộc có điểm dừng ≥ 45 phút (dwell). Server tính trên mỗi chặng `ROAD`: `estimatedDurationMinutes` của chặng > 270 phút mà dwell trước chặng kế < 45 phút → vi phạm. |
| R7 | **BR-034:** tổng hành trình (chặng đầu khởi hành → chặng cuối đến, tính cả dwell/phà/BCP) > 24 giờ ⇒ phải có **ít nhất 1 điểm dừng ≥ 24 giờ liên tục** tại `Location` loại `CONTROL_POST` (C15). Vi phạm R6/R7 → `422 REST_RULE_VIOLATION` (message theo UC-33 EXC-01). |
| R8 | **BCP bắt buộc xuyên biên giới:** Booking `INTERNATIONAL` phải có ≥ 1 điểm dừng/điểm nối thuộc `location_type ∈ {BORDER_GATE, AIRPORT, SEAPORT}` (C15); thiếu → `422 BCP_REQUIRED`. |
| R9 | **Vehicle trên chặng:** `vehicle.transportMode = route.transportMode`; xe `AVAILABLE` hoặc `ASSIGNED` nhưng **không chồng lịch** với chặng khác (so khoảng `[plannedDepartureAt, plannedArrivalAt]` trên `RoutePlanRouteVehicle`); `registration/insurance_expiry_date` chưa hết hạn tại ngày chặng; tổng `capacityHorses` của xe trên chặng ≥ số ngựa của Booking. Chặng thuê ngoài **không** nhận `vehicleIds`. |
| R10 | **Trạng thái xe tự động:** `AVAILABLE → ASSIGNED` khi gán vào chặng thuộc route `APPROVED`; `ASSIGNED → IN_USE` khi chuyến khởi hành (Flow 4); trả về `AVAILABLE` khi không còn chặng nào chưa hoàn thành. Không có API đổi thủ công sang `ASSIGNED/IN_USE`. |
| R11 | **Backup không trùng primary 100%:** so sánh chuỗi `(routeId)` có thứ tự; trùng hoàn toàn → `409 IDENTICAL_CONTINGENCY_ROUTE`. Backup phải cùng điểm đầu/cuối với phạm vi nó thay (toàn tuyến hoặc 1 chặng `replacesRoutePlanRouteId`). |
| R12 | **Hủy RoutePlan (UC-40):** chỉ `DRAFT`/`REJECTED_BY_MANAGER`, có lý do; không đổi trạng thái Booking/TransportPlan; bản ghi giữ lại (`status = CANCELLED`), ghi audit. Sau khi hủy PRIMARY, `routePlanningStatus` về `NOT_STARTED`. |
| R13 | **Route master tái sử dụng:** chặng gửi `routeId` có sẵn, hoặc `fromLocationId + toLocationId + transportMode` để BE tìm/tạo `Route` (distance/duration lấy từ Map service). |
| R14 | **Atomic:** các side effect của một API ghi (đổi status + tạo notification + ghi audit + gán nhân sự/xe) chạy trong **một transaction**; Notification/Email/SignalR đưa vào `OutboxMessage` cùng transaction. |
| R15 | **Server tính toán:** tổng báo giá, `totalDistanceKm`, `estimatedDurationMinutes`, `dwellAfterMinutes`, các status suy ra đều do server tính, không tin giá trị client gửi (V7 ghi chú 9). |

---

## 3. Object dùng chung

### 3.1. `EmployeeBrief`

```json
{ "employeeId": 21, "employeeCode": "EMP-2026-021", "fullName": "Nguyen Van A", "role": "TRANSPORT_SPECIALIST" }
```

### 3.2. `LocationBrief`

| Field | Type | Mô tả |
| ----- | ---- | ----- |
| `locationId` | number | |
| `locationName` | string | |
| `locationType` | string \| null | `CITY, BORDER_GATE, AIRPORT, SEAPORT, STABLE, REST_STOP, OTHER` (+ `CONTROL_POST` — C15) |
| `city` / `country` | string | |
| `latitude` / `longitude` | number \| null | |

### 3.3. `Provider`

| Field | Type | Mô tả |
| ----- | ---- | ----- |
| `transportProviderId` | number | |
| `providerCode` | string | Duy nhất trên bản chưa xóa |
| `providerName` | string | |
| `status` | string | `ProviderStatus` |
| `supportedModes` | string[] | `ROAD`, `SEA`, `AIR` |
| `taxCode`, `contactName`, `phone`, `email`, `address`, `country`, `note` | string \| null | |
| `createdAt`, `updatedAt` | string | |

### 3.4. `Vehicle`

| Field | Type | Mô tả |
| ----- | ---- | ----- |
| `vehicleId`, `vehicleCode`, `vehicleName` | | |
| `transportMode` | string | ⚠️ C09 |
| `licensePlate`, `vehicleType`, `manufacturer`, `model` | string \| null | |
| `capacityHorses` | number | 2–9 (BR-BOOKING-02) |
| `status` | string | `VehicleStatus` |
| `registrationNumber` / `registrationExpiryDate` / `registrationStatus` | string / date / `ExpiryStatus` | |
| `insuranceNumber` / `insuranceExpiryDate` / `insuranceStatus` | string / date / `ExpiryStatus` | |
| `specialEquipment` | string \| null | |
| `warnings` | string[] | Ví dụ `["REGISTRATION_EXPIRED"]`, `["INSURANCE_EXPIRING_SOON"]` |
| `isAvailable` | boolean | Chỉ có khi list/detail gọi kèm `availableFrom/availableTo`: không chồng lịch và status cho phép |
| `createdAt`, `updatedAt` | string | |

### 3.5. `Segment` (một `RoutePlanRoute`)

| Field | Type | Mô tả |
| ----- | ---- | ----- |
| `routePlanRouteId` | number | |
| `sequenceNo` | number | 1…n |
| `routeType` | string | `PRIMARY` / `BACKUP` / `RETURN` |
| `route` | object | `routeId`, `routeCode`, `routeName`, `transportMode`, `distanceKm`, `estimatedDurationMinutes` |
| `fromLocation` / `toLocation` | `LocationBrief` | |
| `plannedDepartureAt` / `plannedArrivalAt` | string | |
| `actualDepartureAt` / `actualArrivalAt` | string \| null | Flow 4 ghi |
| `status` | string | `SegmentStatus` (suy ra) |
| `dwellAfterMinutes` | number \| null | Thời gian dừng sau chặng này; `null` ở chặng cuối |
| `executionType` | string | `INTERNAL` / `OUTSOURCED` (suy ra, C03) |
| `vehicles` | array | `vehicleId`, `vehicleCode`, `vehicleName`, `licensePlate`, `transportMode`, `capacityHorses`. Rỗng với chặng thuê ngoài |
| `outsourcing` | object \| null | `provider` (`Provider`), `serviceType`, `providerReference`. `null` với chặng nội bộ |
| `driver` / `escort` | `EmployeeBrief` \| null | `null` nếu chưa gán hoặc chặng thuê ngoài |
| `note` | string \| null | |

### 3.6. `RoutePlan`

| Field | Type | Mô tả |
| ----- | ---- | ----- |
| `routePlanId`, `routePlanCode` | | |
| `transportPlanId` | number | |
| `bookingId`, `bookingCode` | | |
| `routeType` | string | `PRIMARY` / `BACKUP` (C01) |
| `primaryRoutePlanId` | number \| null | Có khi `routeType = BACKUP` |
| `replacesRoutePlanRouteId` | number \| null | Backup cho 1 chặng; `null` = toàn tuyến |
| `reason` | string \| null | Bắt buộc với BACKUP |
| `status` | string | `RoutePlanStatus` |
| `isCrossBorder` | boolean | |
| `totalDistanceKm` / `estimatedDurationMinutes` | number | Server tính |
| `plannedDepartureAt` / `plannedArrivalAt` | string | Chặng đầu / chặng cuối |
| `segments` | `Segment[]` | Theo `sequenceNo` |
| `personnelStatus` | string | `PersonnelStatus` |
| `legalReview` | object \| null | `result`, `note`, `reviewedBy` (`EmployeeBrief`), `reviewedAt` (C07) |
| `approval` | object \| null | `decision` (`APPROVED`/`REJECTED`), `note`/`reason`, `decidedBy` (`EmployeeBrief`), `decidedAt` (C07) |
| `routeNote` | string \| null | |
| `createdAt`, `updatedAt` | string | `updatedAt` dùng cho `lastUpdatedAt` |

### 3.7. `TransportPlan`

| Field | Type | Mô tả |
| ----- | ---- | ----- |
| `transportPlanId`, `planCode` | | |
| `status` | string | `TransportPlanStatus` |
| `booking` | object | `bookingId`, `bookingCode`, `status`, `transportScope` |
| `transport` | object | `transportId`, `transportCode`, `status` |
| `plannedStartAt` / `plannedEndAt` | string \| null | |
| `transportModeOptions` | string[] | C08 |
| `planningNote` | string \| null | |
| `estimatedDistanceKm` / `estimatedDurationMinutes` | number \| null | Lấy từ PRIMARY route (nếu có) |
| `providers` | array | `provider` (`Provider`), `serviceType`, `assignedAt`, `note` |
| `assignedEmployees` | array | `EmployeeBrief` + `responsibility`, `isPrimary`, `assignedAt` |
| `quotation` | object \| null | Bản tóm tắt: `quotationId`, `status`, `currency`, `totalAmount`, `issuedAt` |
| `depositStatus` | string | `DepositStatus` (C06) |
| `routePlanningStatus` | string | `RoutePlanningStatus` |
| `approvedBy` / `approvedAt` | `EmployeeBrief` \| null / string \| null | |
| `createdAt`, `updatedAt` | string | |

---

## 4. Lookup: Location & Route master

Phục vụ màn hình Route Builder (SCR-F3-008, UC-33 bước 3 "danh sách chặng gợi ý"). Chỉ đọc; **không có UC quản lý (CRUD) Location/Route master** trong Flow 3 — dữ liệu cần được seed/nhập từ trước (C15).

| #  | API | Method & Endpoint | Role |
| -- | --- | ----------------- | ---- |
| L1 | Danh sách Location | `GET /locations` | RC, LM, TS |
| L2 | Danh sách Route master | `GET /routes` | RC, LM, TS |

### L1. Danh sách Location

`GET /api/v1/locations?pageIndex=1&pageSize=20&search=calais&country=FR&locationType=BORDER_GATE`

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `search` | string | No | Theo `locationName`, `city` |
| `country` | string | No | |
| `locationType` | string | No | `location_type` |
| `pageIndex`, `pageSize` | number | No | Mặc định `1`, `20` |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Locations retrieved successfully",
  "value": {
    "items": [
      { "locationId": 31, "locationName": "Calais BCP", "locationType": "BORDER_GATE", "city": "Calais", "country": "FR", "latitude": 50.9513, "longitude": 1.8587 }
    ],
    "pageIndex": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

### L2. Danh sách Route master

`GET /api/v1/routes?fromLocationId=1&toLocationId=31&transportMode=ROAD&pageIndex=1&pageSize=20`

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `fromLocationId`, `toLocationId` | number | No | |
| `transportMode` | string | No | `ROAD`, `SEA`, `AIR` |
| `search` | string | No | `routeCode`, `routeName` |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Routes retrieved successfully",
  "value": {
    "items": [
      {
        "routeId": 7001, "routeCode": "RT-PAR-CAL-ROAD", "routeName": "Paris - Calais",
        "transportMode": "ROAD", "distanceKm": 290.5, "estimatedDurationMinutes": 225,
        "fromLocation": { "locationId": 1, "locationName": "Paris Stable", "locationType": "STABLE", "city": "Paris", "country": "FR" },
        "toLocation": { "locationId": 31, "locationName": "Calais BCP", "locationType": "BORDER_GATE", "city": "Calais", "country": "FR" }
      }
    ],
    "pageIndex": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

> Lấy danh sách nhân sự để chọn (TS, RC, Driver, Escort) dùng lại `GET /employees?role=…` (A12 flow1, **chỉ LM** — đúng người phân công). Việc "rảnh/bận" được kiểm tra khi lưu (`409 SCHEDULE_CONFLICT`); chưa có API lịch nhân sự (SCR-F3-UX-002 là tùy chọn).

---

## 5. Booking đã duyệt (UC-32)

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| AB1 | Danh sách booking đã duyệt | `GET /approved-bookings` | RC, LM |
| AB2 | Chi tiết booking đã duyệt | `GET /approved-bookings/{bookingId}` | RC, LM |

> ⚠️ C14 — read-model riêng cho Flow 3, không thay đổi quyền của B7/B8 (flow1).

### AB1. Danh sách booking đã duyệt

`GET /api/v1/approved-bookings?pageIndex=1&pageSize=20&search=REQ-2026&transportScope=INTERNATIONAL&depositStatus=PAID&routePlanningStatus=NOT_STARTED&departureFrom=2026-10-20&departureTo=2026-11-30&sortBy=requestedDepartureDate:asc`

Chỉ trả Booking `status = APPROVED` (không cần truyền `status`).

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `search` | string | No | Mã booking hoặc tên khách hàng |
| `transportScope` | string | No | `DOMESTIC` \| `INTERNATIONAL` (C14) |
| `depositStatus` | string | No | `PENDING` \| `PAID` (UC-32 ALT-01) |
| `routePlanningStatus` | string | No | `NOT_STARTED` \| `IN_PROGRESS` \| `COMPLETED` |
| `departureFrom` / `departureTo` | date | No | Lọc `requestedDepartureDate` |
| `sortBy` | string | No | `requestedDepartureDate` hoặc `approvedAt`. Mặc định `requestedDepartureDate:asc` |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Approved bookings retrieved successfully",
  "value": {
    "items": [
      {
        "bookingId": 9001,
        "bookingCode": "REQ-20261001-0005",
        "status": "APPROVED",
        "customer": { "customerId": 11, "customerCode": "CUS-2026-892", "fullName": "Example Racing Club" },
        "originAddress": "Haras de Chantilly, Paris",
        "originCountry": "FR",
        "destinationAddress": "Newmarket Stables, London",
        "destinationCountry": "GB",
        "transportScope": "INTERNATIONAL",
        "totalHorses": 4,
        "requestedDepartureDate": "2026-10-27",
        "requestedArrivalDate": "2026-11-01",
        "specialRequirements": "Temperature monitoring",
        "approvedAt": "2026-10-01T03:00:00Z",
        "transport": { "transportId": 88, "transportCode": "TR-20261001-0005" },
        "transportPlanId": null,
        "depositStatus": "PENDING",
        "routePlanningStatus": "NOT_STARTED"
      }
    ],
    "pageIndex": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

Không có dữ liệu → `200`, `items: []` (FE hiển thị "Hiện chưa có yêu cầu vận chuyển nào ở trạng thái Đã duyệt cần lập lộ trình.", UC-32 EXC-01).

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400 | `INVALID_SORT_PARAMETER` | The sort parameter is invalid |

### AB2. Chi tiết booking đã duyệt

`GET /api/v1/approved-bookings/{bookingId}`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Approved booking retrieved successfully",
  "value": {
    "bookingId": 9001,
    "bookingCode": "REQ-20261001-0005",
    "status": "APPROVED",
    "customer": { "customerId": 11, "customerCode": "CUS-2026-892", "fullName": "Example Racing Club", "phone": "+33-000-000" },
    "originAddress": "Haras de Chantilly, Paris",
    "originCountry": "FR",
    "destinationAddress": "Newmarket Stables, London",
    "destinationCountry": "GB",
    "transportScope": "INTERNATIONAL",
    "requestedDepartureDate": "2026-10-27",
    "requestedArrivalDate": "2026-11-01",
    "specialRequirements": "Temperature monitoring",
    "customerNote": null,
    "totalHorses": 4,
    "horses": [
      { "horseId": 71, "horseName": "Golden Thunder", "sex": "MALE", "breed": "Thoroughbred", "microchipNumber": "985112003456781", "passportNumber": "FR-TB-2021-0457", "specialHandlingNotes": "Hay only" }
    ],
    "transport": { "transportId": 88, "transportCode": "TR-20261001-0005", "status": "CREATED" },
    "depositStatus": "PENDING",
    "routePlanningStatus": "NOT_STARTED",
    "transportPlan": null,
    "routePlans": []
  }
}
```

Khi đã có plan: `transportPlan` = `{ "transportPlanId": 101, "planCode": "TP-20261001-0001", "status": "PENDING" }`; `routePlans` = mảng `{ "routePlanId", "routePlanCode", "routeType", "status" }`.

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 404 | `BOOKING_NOT_FOUND` | Booking not found |
| 409 | `INVALID_BOOKING_STATUS` | This action cannot be performed while the booking is in {statusName} status (booking chưa `APPROVED`) |

---

## 6. Transport Plan (UC-34, UC-35)

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| TP1 | Tạo Transport Plan | `POST /bookings/{bookingId}/transport-plans` | LM |
| TP2 | Danh sách Transport Plan | `GET /transport-plans` | LM (tất cả), RC/TS (được phân công) |
| TP3 | Chi tiết Transport Plan | `GET /transport-plans/{transportPlanId}` | LM, RC, TS |
| TP4 | Sửa Transport Plan | `PUT /transport-plans/{transportPlanId}` | LM |

**Lỗi dùng chung:**

| HTTP | errorCode | Message | Dùng ở |
| ---- | --------- | ------- | ------ |
| 404 | `BOOKING_NOT_FOUND` | Booking not found | TP1 |
| 404 | `TRANSPORT_PLAN_NOT_FOUND` | Transport Plan not found | TP3, TP4 |
| 404 | `PROVIDER_NOT_FOUND` | Transport Provider not found | TP1, TP4 |
| 404 | `EMPLOYEE_NOT_FOUND` | Employee not found | TP1 |
| 409 | `INVALID_BOOKING_STATUS` | Booking must be APPROVED | TP1 |
| 409 | `TRANSPORT_PLAN_ALREADY_EXISTS` | Transport Plan already exists for this booking. Please edit the existing plan. | TP1 |
| 409 | `PLAN_LOCKED` | Cannot edit Transport Plan once the transport is in transit, completed or cancelled | TP4 |
| 409 | `TRANSPORT_PLAN_MODIFIED` | The transport plan was just modified. Please reload the page | TP4 |
| 409 | `PROVIDER_IN_USE_BY_SEGMENT` | The provider is assigned to a route segment of this plan | TP4 |
| 409 | `PROVIDER_INACTIVE` | Provider is not ACTIVE | TP1, TP4 |
| 422 | `INVALID_ROLE_ASSIGNMENT` | The selected employee does not have the required role | TP1 |

### TP1. Tạo Transport Plan

UC-34. Một transaction: tạo `TransportPlan`, sinh `planCode` (BR-016), upsert `TransportPlanProvider`, ghi `EmployeeTransportPlan` (TS + RC, đợt 1), lưu báo giá (nếu có), đặt `Transport.status = PLANNING` (C17) và gửi thông báo.

`POST /api/v1/bookings/{bookingId}/transport-plans`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `action` | string | Yes | `SAVE_DRAFT` (→ `DRAFT`, không gửi thông báo cho Customer) \| `ISSUE_QUOTE` (→ `PENDING`) |
| `plannedStartAt` | string | Có điều kiện | Bắt buộc khi `ISSUE_QUOTE` (→ `planned_start_at`) |
| `plannedEndAt` | string | Có điều kiện | Bắt buộc khi `ISSUE_QUOTE`; phải sau `plannedStartAt` |
| `transportModeOptions` | string[] | Có điều kiện | Bắt buộc ≥ 1 khi `ISSUE_QUOTE`. `ROAD`, `SEA`, `AIR` (C08) |
| `providers` | array | No | `{ transportProviderId, serviceType, note }` — provider phải `ACTIVE` |
| `planningNote` | string | No | |
| `transportSpecialistId` | number | Có điều kiện | Bắt buộc khi `ISSUE_QUOTE`. Employee role `TRANSPORT_SPECIALIST` |
| `routeCoordinatorId` | number | Có điều kiện | Bắt buộc khi `ISSUE_QUOTE`. Employee role `FLEET_ROUTE_COORDINATOR` |
| `quotation` | object | Có điều kiện | Bắt buộc khi `ISSUE_QUOTE`. Cấu trúc như [QT2](#qt2-lưu-báo-giá) (`currency`, `items[]`, `note`) |

```json
{
  "action": "ISSUE_QUOTE",
  "plannedStartAt": "2026-10-27T06:00:00Z",
  "plannedEndAt": "2026-11-01T18:00:00Z",
  "transportModeOptions": ["ROAD", "AIR"],
  "providers": [
    { "transportProviderId": 55, "serviceType": "AIR_CHARTER", "note": "Paris CDG - London LHR" }
  ],
  "planningNote": "Customer requests temperature monitoring",
  "transportSpecialistId": 21,
  "routeCoordinatorId": 35,
  "quotation": {
    "currency": "EUR",
    "items": [
      { "category": "TRANSPORT_FEE", "description": "Road + air charter", "amount": 11000.00 },
      { "category": "COMPLIANCE_FEE", "description": "Quarantine & permits", "amount": 2000.00 },
      { "category": "LABOR_FEE", "description": "Driver and escort", "amount": 1200.00 },
      { "category": "HORSE_CARE_FEE", "description": "Care during transit", "amount": 500.00 },
      { "category": "CONTINGENCY", "description": "Reserve", "amount": 300.00 }
    ],
    "note": "Valid for 14 days"
  }
}
```

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Transport plan created successfully",
  "value": {
    "transportPlanId": 101,
    "planCode": "TP-20261001-0001",
    "status": "PENDING",
    "booking": { "bookingId": 9001, "bookingCode": "REQ-20261001-0005", "status": "APPROVED", "transportScope": "INTERNATIONAL" },
    "transport": { "transportId": 88, "transportCode": "TR-20261001-0005", "status": "PLANNING" },
    "plannedStartAt": "2026-10-27T06:00:00Z",
    "plannedEndAt": "2026-11-01T18:00:00Z",
    "transportModeOptions": ["ROAD", "AIR"],
    "planningNote": "Customer requests temperature monitoring",
    "estimatedDistanceKm": null,
    "estimatedDurationMinutes": null,
    "providers": [
      {
        "provider": { "transportProviderId": 55, "providerCode": "PRV-LUFTHANSA-01", "providerName": "Lufthansa Cargo", "status": "ACTIVE", "supportedModes": ["AIR"] },
        "serviceType": "AIR_CHARTER", "assignedAt": "2026-10-06T08:00:00Z", "note": "Paris CDG - London LHR"
      }
    ],
    "assignedEmployees": [
      { "employeeId": 21, "employeeCode": "EMP-2026-021", "fullName": "Nguyen Van A", "role": "TRANSPORT_SPECIALIST", "responsibility": "TRANSPORT_SPECIALIST", "isPrimary": true, "assignedAt": "2026-10-06T08:00:00Z" },
      { "employeeId": 35, "employeeCode": "EMP-2026-035", "fullName": "Pham Hoang Nam", "role": "FLEET_ROUTE_COORDINATOR", "responsibility": "ROUTE_COORDINATOR", "isPrimary": true, "assignedAt": "2026-10-06T08:00:00Z" }
    ],
    "quotation": { "quotationId": 41, "status": "ISSUED", "currency": "EUR", "totalAmount": 15000.00, "issuedAt": "2026-10-06T08:00:00Z" },
    "depositStatus": "PENDING",
    "routePlanningStatus": "NOT_STARTED",
    "approvedBy": null,
    "approvedAt": null,
    "createdAt": "2026-10-06T08:00:00Z",
    "updatedAt": "2026-10-06T08:00:00Z"
  }
}
```

Khi `SAVE_DRAFT`: `status = "DRAFT"`, `quotation` có thể `null` hoặc `status: "DRAFT"`, `assignedEmployees` chỉ có dòng nào được gửi, và **không** gửi thông báo cho Customer.

Cùng các lỗi dùng chung ở đầu mục; thêm `400 VALIDATION_ERROR` khi `plannedEndAt ≤ plannedStartAt`, thiếu field bắt buộc khi `ISSUE_QUOTE`.

### TP2. Danh sách Transport Plan

`GET /api/v1/transport-plans?pageIndex=1&pageSize=20&status=PENDING&search=TP-2026&sortBy=createdAt:desc`

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `status` | string | No | `TransportPlanStatus` |
| `search` | string | No | `planCode`, `bookingCode`, tên khách hàng |
| `routePlanningStatus` | string | No | `NOT_STARTED/IN_PROGRESS/COMPLETED` |
| `sortBy` | string | No | `createdAt` hoặc `plannedStartAt`. Mặc định `createdAt:desc` |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Transport plans retrieved successfully",
  "value": {
    "items": [
      {
        "transportPlanId": 101,
        "planCode": "TP-20261001-0001",
        "status": "PENDING",
        "bookingId": 9001,
        "bookingCode": "REQ-20261001-0005",
        "customerName": "Example Racing Club",
        "plannedStartAt": "2026-10-27T06:00:00Z",
        "plannedEndAt": "2026-11-01T18:00:00Z",
        "transportModeOptions": ["ROAD", "AIR"],
        "totalAmount": 15000.00,
        "currency": "EUR",
        "depositStatus": "PENDING",
        "routePlanningStatus": "NOT_STARTED",
        "updatedAt": "2026-10-06T08:00:00Z"
      }
    ],
    "pageIndex": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

### TP3. Chi tiết Transport Plan

`GET /api/v1/transport-plans/{transportPlanId}`

**`200 OK`** — `value` là object [`TransportPlan`](#37-transportplan) đầy đủ (xem ví dụ ở TP1); dùng cho SCR-F3-005 (3 tab: General/Modes, Quotation, Personnel). Tab Quotation dùng thêm [QT1](#qt1-xem-báo-giá), tab Personnel dùng [PS2](#ps2-xem-phân-công).

### TP4. Sửa Transport Plan

UC-35. Sửa metadata, phương án vận tải, liên kết provider. **Không** sửa báo giá (dùng [QT2](#qt2-lưu-báo-giá)) và **không** đổi người phân công (dùng [PS1](#ps1-phân-công-đợt-1)).

`PUT /api/v1/transport-plans/{transportPlanId}`

Chỉ sửa khi `status ∈ {DRAFT, PENDING, APPROVED}` (trước `IN_PROGRESS`).

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | Chống ghi đè |
| `updateReason` | string | Yes | Lý do chỉnh sửa (UC-35 bước 4), ghi vào audit (C07) |
| `plannedStartAt` / `plannedEndAt` | string | No | |
| `transportModeOptions` | string[] | No | Ghi đè toàn bộ |
| `providers` | array | No | **Ghi đè toàn bộ** danh sách `TransportPlanProvider`: `{ transportProviderId, serviceType, note }`. Provider đang gán cho 1 chặng của plan mà bị bỏ khỏi danh sách → `409 PROVIDER_IN_USE_BY_SEGMENT` |
| `planningNote` | string | No | |

```json
{
  "lastUpdatedAt": "2026-10-06T08:00:00Z",
  "updateReason": "Customer moved departure by 2 days",
  "plannedStartAt": "2026-10-29T06:00:00Z",
  "plannedEndAt": "2026-11-03T18:00:00Z",
  "transportModeOptions": ["ROAD", "AIR"],
  "providers": [
    { "transportProviderId": 55, "serviceType": "AIR_CHARTER", "note": "Paris CDG - London LHR" },
    { "transportProviderId": 56, "serviceType": "ROAD_TRUCK", "note": "Last mile London" }
  ],
  "planningNote": "Updated schedule"
}
```

**`200 OK`** — trả `TransportPlan` đầy đủ (cùng cấu trúc TP3). Hệ thống gửi thông báo cập nhật cho Customer, TS, RC.

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Transport plan updated successfully",
  "value": {
    "transportPlanId": 101,
    "planCode": "TP-20261001-0001",
    "status": "PENDING",
    "plannedStartAt": "2026-10-29T06:00:00Z",
    "plannedEndAt": "2026-11-03T18:00:00Z",
    "transportModeOptions": ["ROAD", "AIR"],
    "providers": [
      { "provider": { "transportProviderId": 55, "providerCode": "PRV-LUFTHANSA-01", "providerName": "Lufthansa Cargo", "status": "ACTIVE", "supportedModes": ["AIR"] }, "serviceType": "AIR_CHARTER", "assignedAt": "2026-10-06T08:00:00Z", "note": "Paris CDG - London LHR" },
      { "provider": { "transportProviderId": 56, "providerCode": "PRV-EUR-002", "providerName": "Jan de Rijk Logistics", "status": "ACTIVE", "supportedModes": ["ROAD"] }, "serviceType": "ROAD_TRUCK", "assignedAt": "2026-10-07T09:00:00Z", "note": "Last mile London" }
    ],
    "updatedAt": "2026-10-07T09:00:00Z"
  }
}
```

> Ví dụ trên rút gọn các field không đổi; FE nên dùng `updatedAt` mới cho lần sửa kế tiếp. Response thực tế trả đủ các field của object `TransportPlan`.

---

## 7. Báo giá ước tính (UC-34, UC-35)

> ⚠️ C06 — cần bảng `TransportQuotation` / `TransportQuotationItem` (Phụ lục 16). Tách khỏi TP1/TP4 theo thiết kế màn hình (SCR-F3-004, SCR-F3-007 là biểu mẫu riêng, Tab 2 của SCR-F3-005).

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| QT1 | Xem báo giá | `GET /transport-plans/{transportPlanId}/quotation` | LM, RC, TS |
| QT2 | Lưu báo giá | `PUT /transport-plans/{transportPlanId}/quotation` | LM |
| QT3 | Phát hành báo giá | `POST /transport-plans/{transportPlanId}/quotation/issue` | LM |

**Lỗi dùng chung:**

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 404 | `TRANSPORT_PLAN_NOT_FOUND` | Transport Plan not found |
| 404 | `QUOTATION_NOT_FOUND` | No quotation exists for this plan |
| 409 | `PLAN_LOCKED` | Cannot edit the quotation once the transport is in transit, completed or cancelled |
| 409 | `TRANSPORT_PLAN_MODIFIED` | The transport plan was just modified. Please reload the page |
| 422 | `DEPOSIT_ALREADY_PAID` | The quotation cannot be changed after the deposit has been paid (đề xuất; xem ghi chú dưới QT2) |

### QT1. Xem báo giá

`GET /api/v1/transport-plans/{transportPlanId}/quotation`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Quotation retrieved successfully",
  "value": {
    "quotationId": 41,
    "transportPlanId": 101,
    "versionNo": 1,
    "status": "ISSUED",
    "currency": "EUR",
    "totalAmount": 15000.00,
    "items": [
      { "quotationItemId": 1, "category": "TRANSPORT_FEE", "description": "Road + air charter", "amount": 11000.00 },
      { "quotationItemId": 2, "category": "COMPLIANCE_FEE", "description": "Quarantine & permits", "amount": 2000.00 },
      { "quotationItemId": 3, "category": "LABOR_FEE", "description": "Driver and escort", "amount": 1200.00 },
      { "quotationItemId": 4, "category": "HORSE_CARE_FEE", "description": "Care during transit", "amount": 500.00 },
      { "quotationItemId": 5, "category": "CONTINGENCY", "description": "Reserve", "amount": 300.00 }
    ],
    "note": "Valid for 14 days",
    "issuedAt": "2026-10-06T08:00:00Z",
    "createdAt": "2026-10-06T08:00:00Z",
    "updatedAt": "2026-10-06T08:00:00Z"
  }
}
```

`status`: `DRAFT` \| `ISSUED`. `category`: `TRANSPORT_FEE`, `COMPLIANCE_FEE`, `LABOR_FEE`, `HORSE_CARE_FEE`, `CONTINGENCY`, `OTHER` (khớp nhóm chi phí UC-34 bước 4).

### QT2. Lưu báo giá

UC-34 (SCR-F3-004) và UC-35 (SCR-F3-007). Tạo mới nếu chưa có, ngược lại cập nhật (tăng `versionNo` nếu báo giá đã `ISSUED`). `totalAmount` do **server cộng từ `items`** (R15).

`PUT /api/v1/transport-plans/{transportPlanId}/quotation`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Có điều kiện | Bắt buộc khi báo giá đã tồn tại |
| `updateReason` | string | Có điều kiện | Bắt buộc khi sửa báo giá đã `ISSUED` (UC-35) |
| `currency` | string | Yes | ISO 4217, 3 ký tự (ví dụ `EUR`) |
| `items` | array | Yes | ≥ 1. Mỗi dòng: `category` (Yes), `description` (Yes), `amount` (Yes, > 0, tối đa 2 chữ số thập phân) |
| `note` | string | No | |

```json
{
  "lastUpdatedAt": "2026-10-06T08:00:00Z",
  "updateReason": "New agreement with customer after schedule change",
  "currency": "EUR",
  "items": [
    { "category": "TRANSPORT_FEE", "description": "Road + air charter", "amount": 11800.00 },
    { "category": "COMPLIANCE_FEE", "description": "Quarantine & permits", "amount": 2000.00 },
    { "category": "LABOR_FEE", "description": "Driver and escort", "amount": 1200.00 },
    { "category": "HORSE_CARE_FEE", "description": "Care during transit", "amount": 500.00 },
    { "category": "CONTINGENCY", "description": "Reserve", "amount": 700.00 }
  ],
  "note": "Revised quotation"
}
```

**`200 OK`** (`201` nếu tạo mới)

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Quotation saved successfully",
  "value": { "quotationId": 41, "versionNo": 2, "status": "ISSUED", "currency": "EUR", "totalAmount": 16200.00, "updatedAt": "2026-10-07T09:00:00Z" }
}
```

Báo giá đã `ISSUED` mà được sửa → vẫn `ISSUED` với `versionNo + 1` và gửi thông báo cập nhật cho Customer (UC-35 bước 7). Báo giá `DRAFT` được sửa giữ nguyên `DRAFT`. Không cho sửa khi `TransportPlan.status = IN_PROGRESS/COMPLETED/CANCELLED` (`409 PLAN_LOCKED`). Đề xuất: không cho đổi giá sau khi cọc đã `PAID` (`422 DEPOSIT_ALREADY_PAID`) — UC-35 nói "chưa chốt thanh toán cuối cùng"; team cần xác nhận cùng C06.

### QT3. Phát hành báo giá

Dùng khi plan đang `DRAFT` (tạo bằng `SAVE_DRAFT` ở TP1) và LM muốn "Lưu & Phát hành Báo giá". Điều kiện: có báo giá, đủ TS + RC (đợt 1), có `plannedStartAt/plannedEndAt`, ≥ 1 `transportModeOptions`.

`POST /api/v1/transport-plans/{transportPlanId}/quotation/issue`

Không cần body.

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Quotation issued successfully",
  "value": {
    "transportPlanId": 101,
    "status": "PENDING",
    "quotation": { "quotationId": 41, "versionNo": 1, "status": "ISSUED", "currency": "EUR", "totalAmount": 15000.00, "issuedAt": "2026-10-06T08:00:00Z" },
    "updatedAt": "2026-10-06T08:00:00Z"
  }
}
```

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 409 | `INVALID_TRANSPORT_PLAN_STATUS` | The quotation can only be issued while the plan is DRAFT |
| 422 | `PLAN_INCOMPLETE` | Quotation, dates, transport modes, Transport Specialist and Route Coordinator are required before issuing (`errors[]` liệt kê field thiếu) |

---

## 8. Transport Provider (UC-41) & thuê ngoài (UC-42)

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| PV1 | Danh sách provider | `GET /transport-providers` | LM; RC (chỉ đọc, để chọn khi lập route) |
| PV2 | Chi tiết provider | `GET /transport-providers/{providerId}` | LM, RC |
| PV3 | Thêm provider | `POST /transport-providers` | LM |
| PV4 | Sửa provider | `PUT /transport-providers/{providerId}` | LM |
| PV5 | Đổi trạng thái | `PATCH /transport-providers/{providerId}/status` | LM |
| PV6 | Xóa mềm | `DELETE /transport-providers/{providerId}` | LM |
| OS1 | Gán / gỡ thuê ngoài cho chặng | `PUT /route-plans/{routePlanId}/segments/{routePlanRouteId}/outsourcing` | LM |

**Lỗi dùng chung (PV):**

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 404 | `PROVIDER_NOT_FOUND` | Transport Provider not found |
| 409 | `PROVIDER_CODE_DUPLICATED` | Transport Provider with this Code / Tax ID already exists. (cho `providerCode`) |
| 409 | `TAX_CODE_DUPLICATED` | Transport Provider with this Code / Tax ID already exists. (cho `taxCode`) |
| 409 | `PROVIDER_MODIFIED` | The provider was just modified. Please reload the page |

> Hệ thống chỉ quản lý **master** của provider; không có API/field cho tài xế hay phương tiện nội bộ của bên thứ 3 (UC-41 AC-002).

### PV1. Danh sách provider

`GET /api/v1/transport-providers?pageIndex=1&pageSize=20&status=ACTIVE&supportedMode=AIR&search=lufthansa&sortBy=providerName:asc`

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `status` | string | No | `ACTIVE`, `INACTIVE`, `SUSPENDED`. RC chỉ nhận `ACTIVE` (bị ép) |
| `supportedMode` | string | No | `ROAD`, `SEA`, `AIR` — provider có chứa mode này |
| `search` | string | No | `providerCode`, `providerName`, `taxCode` |
| `sortBy` | string | No | `providerName`, `providerCode`, `createdAt`. Mặc định `providerName:asc` |

Chỉ trả bản ghi `is_deleted = false`.

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Transport providers retrieved successfully",
  "value": {
    "items": [
      {
        "transportProviderId": 55,
        "providerCode": "PRV-LUFTHANSA-01",
        "providerName": "Lufthansa Cargo",
        "status": "ACTIVE",
        "supportedModes": ["AIR"],
        "taxCode": "DE123456789",
        "contactName": "Operations",
        "phone": "+49-000-000",
        "email": "ops@example.com",
        "address": "Frankfurt",
        "country": "DE",
        "note": "IATA carrier",
        "createdAt": "2026-09-20T03:00:00Z",
        "updatedAt": "2026-09-20T03:00:00Z"
      }
    ],
    "pageIndex": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

### PV2. Chi tiết provider

`GET /api/v1/transport-providers/{providerId}`

**`200 OK`** — `value` là object [`Provider`](#33-provider) (cùng field như 1 phần tử `items` của PV1).

### PV3. Thêm provider

`POST /api/v1/transport-providers`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `providerCode` | string | Yes | ≤ 50, duy nhất trên bản chưa xóa |
| `providerName` | string | Yes | ≤ 200 |
| `supportedModes` | string[] | Yes | ≥ 1; `ROAD`, `SEA`, `AIR` |
| `taxCode` | string | Yes | ≤ 100, duy nhất trên bản chưa xóa (C20) |
| `contactName` / `phone` / `email` / `address` / `country` / `note` | string | No | `email` đúng định dạng |

```json
{
  "providerCode": "PRV-LUFTHANSA-01",
  "providerName": "Lufthansa Cargo",
  "supportedModes": ["AIR"],
  "taxCode": "DE123456789",
  "contactName": "Operations",
  "phone": "+49-000-000",
  "email": "ops@example.com",
  "address": "Frankfurt",
  "country": "DE",
  "note": "IATA carrier"
}
```

**`201 Created`** — mặc định `status = ACTIVE`, `is_deleted = false`.

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Transport provider created successfully",
  "value": {
    "transportProviderId": 55,
    "providerCode": "PRV-LUFTHANSA-01",
    "providerName": "Lufthansa Cargo",
    "status": "ACTIVE",
    "supportedModes": ["AIR"],
    "taxCode": "DE123456789",
    "contactName": "Operations",
    "phone": "+49-000-000",
    "email": "ops@example.com",
    "address": "Frankfurt",
    "country": "DE",
    "note": "IATA carrier",
    "createdAt": "2026-09-20T03:00:00Z",
    "updatedAt": "2026-09-20T03:00:00Z"
  }
}
```

Lỗi riêng: `409 PROVIDER_CODE_DUPLICATED`, `409 TAX_CODE_DUPLICATED`.

### PV4. Sửa provider

`PUT /api/v1/transport-providers/{providerId}` — `providerCode` **bất biến** (gửi giá trị khác → `400 VALIDATION_ERROR`). Không đổi `status` ở đây (dùng PV5).

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | |
| `providerName` | string | Yes | |
| `supportedModes` | string[] | Yes | ≥ 1 |
| `taxCode` | string | Yes | Kiểm tra unique nếu đổi |
| `contactName` / `phone` / `email` / `address` / `country` / `note` | string | No | |

```json
{
  "lastUpdatedAt": "2026-09-20T03:00:00Z",
  "providerName": "Lufthansa Cargo AG",
  "supportedModes": ["AIR", "ROAD"],
  "taxCode": "DE123456789",
  "contactName": "Operations Desk",
  "phone": "+49-000-111",
  "email": "ops@example.com",
  "address": "Frankfurt Airport",
  "country": "DE",
  "note": "IATA carrier, road feeder added"
}
```

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "Transport provider updated successfully", "value": { "transportProviderId": 55, "updatedAt": "2026-09-25T04:00:00Z" } }
```

### PV5. Đổi trạng thái provider

`PATCH /api/v1/transport-providers/{providerId}/status`

```json
{ "status": "INACTIVE", "reason": "Contract ended" }
```

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `status` | string | Yes | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `reason` | string | Yes khi `INACTIVE/SUSPENDED` | |

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "Provider status updated successfully", "value": { "transportProviderId": 55, "status": "INACTIVE", "updatedAt": "2026-09-26T04:00:00Z" } }
```

Provider `INACTIVE/SUSPENDED` bị ẩn khỏi danh sách chọn mới (PV1 cho RC, OS1, TP1/TP4) nhưng tham chiếu cũ giữ nguyên.

### PV6. Xóa mềm provider

`DELETE /api/v1/transport-providers/{providerId}` — đặt `is_deleted = true`, `deleted_at`, `deleted_by_account_id`. Không xóa tham chiếu lịch sử (UC-41 ALT-02). Provider đang gán cho chặng của route **chưa `COMPLETED/CANCELLED`** → `409 PROVIDER_IN_USE`.

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "Transport provider deleted successfully", "value": null }
```

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 409 | `PROVIDER_IN_USE` | The provider is assigned to route segments that are not completed or cancelled |

### OS1. Gán / gỡ thuê ngoài cho chặng

UC-42. ⚠️ C03. Đồng thời upsert `TransportPlanProvider` `(transport_plan_id, transport_provider_id)` (`service_type`, `assigned_at`, `note`); khi gỡ và provider không còn chặng nào dùng trong plan thì **xóa** dòng `TransportPlanProvider` tương ứng. Chặng thuê ngoài **không** có Driver/Escort/Vehicle: nếu chặng đang có sẽ bị **gỡ** (response trả `clearedPersonnel`/`clearedVehicles`).

`PUT /api/v1/route-plans/{routePlanId}/segments/{routePlanRouteId}/outsourcing`

Chỉ khi RoutePlan `status ∈ {DRAFT, PENDING_LEGAL_REVIEW, PENDING_MANAGER_APPROVAL, REJECTED_BY_MANAGER, APPROVED}`. Đổi chặng thuộc route đã `PENDING_*`/`APPROVED` → route quay về `PENDING_LEGAL_REVIEW` (đổi provider ảnh hưởng thẩm định); `ACTIVE` trở đi → `409 ROUTE_LOCKED` (dùng UC-48).

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `outsourced` | boolean | Yes | `true` = thuê ngoài; `false` = chuyển về nội bộ |
| `transportProviderId` | number | Khi `outsourced = true` | Provider `ACTIVE`, `supportedModes` chứa `transportMode` của chặng |
| `serviceType` | string | Khi `outsourced = true` | Ví dụ `AIR_CHARTER`, `AIR_STALL_CHARTER`, `FERRY_SEA_CROSSING` |
| `providerReference` | string | No | Số chuyến bay / AWB / mã booking dịch vụ (UC-42 bước 6) |
| `note` | string | No | |

```json
{
  "outsourced": true,
  "transportProviderId": 55,
  "serviceType": "AIR_CHARTER",
  "providerReference": "AWB-123456",
  "note": "Lufthansa Cargo CDG-LHR"
}
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Outsourcing assigned successfully",
  "value": {
    "routePlanId": 301,
    "routePlanStatus": "DRAFT",
    "segment": {
      "routePlanRouteId": 8002,
      "sequenceNo": 2,
      "executionType": "OUTSOURCED",
      "vehicles": [],
      "outsourcing": {
        "provider": { "transportProviderId": 55, "providerCode": "PRV-LUFTHANSA-01", "providerName": "Lufthansa Cargo", "status": "ACTIVE", "supportedModes": ["AIR"] },
        "serviceType": "AIR_CHARTER",
        "providerReference": "AWB-123456"
      },
      "driver": null,
      "escort": null,
      "note": "Lufthansa Cargo CDG-LHR"
    },
    "clearedPersonnel": false,
    "clearedVehicles": false,
    "updatedAt": "2026-10-08T09:00:00Z"
  }
}
```

Gỡ về nội bộ: body `{ "outsourced": false }` → `executionType: "INTERNAL"`, `outsourcing: null`; hệ thống bật lại yêu cầu gán Driver/Escort ở [PS3](#ps3-giao-nhiệm-vụ-đợt-2-theo-route).

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400 | `PROVIDER_REQUIRED` | Please select a valid Transport Provider for this outsourced segment. |
| 404 | `ROUTE_PLAN_NOT_FOUND` / `SEGMENT_NOT_FOUND` | Route Plan / Segment not found |
| 409 | `ROUTE_LOCKED` | The route plan can no longer be modified (use emergency change) |
| 409 | `PROVIDER_INACTIVE` | Provider is not ACTIVE |
| 422 | `PROVIDER_MODE_MISMATCH` | The provider does not support the transport mode of this segment |

---

## 9. Vehicle (UC-43 → UC-46)

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| VH1 | Danh sách phương tiện | `GET /vehicles` | RC, LM |
| VH2 | Chi tiết phương tiện | `GET /vehicles/{vehicleId}` | RC, LM |
| VH3 | Thêm phương tiện | `POST /vehicles` | RC, LM |
| VH4 | Sửa thông tin | `PUT /vehicles/{vehicleId}` | RC, LM |
| VH5 | Đổi trạng thái thủ công | `PATCH /vehicles/{vehicleId}/status` | RC, LM |

**Lỗi dùng chung:**

| HTTP | errorCode | Message | Dùng ở |
| ---- | --------- | ------- | ------ |
| 404 | `VEHICLE_NOT_FOUND` | Vehicle not found | VH2, VH4, VH5 |
| 409 | `VEHICLE_CODE_DUPLICATED` | Vehicle Code or License Plate already exists in the system. | VH3 |
| 409 | `LICENSE_PLATE_DUPLICATED` | License plate is already assigned to another vehicle. | VH3, VH4 |
| 409 | `VEHICLE_MODIFIED` | The vehicle was just modified. Please reload the page | VH4, VH5 |
| 409 | `VEHICLE_IN_USE` | The transport mode cannot be changed while the vehicle is assigned to unfinished route segments | VH4 |
| 409 | `VEHICLE_STATUS_LOCKED` | Vehicle is currently assigned/IN_USE on an active trip. Status is managed automatically by the trip execution system. (C25) | VH5 |

### VH1. Danh sách phương tiện

`GET /api/v1/vehicles?pageIndex=1&pageSize=20&transportMode=ROAD&status=AVAILABLE&vehicleType=HORSE_TRUCK&minCapacity=4&availableFrom=2026-10-27&availableTo=2026-11-01&search=VEH-ROAD&sortBy=vehicleCode:asc`

Chỉ trả `is_deleted = false`.

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `transportMode` | string | No | `ROAD`, `SEA`, `AIR` (C09) |
| `status` | string | No | `VehicleStatus` |
| `vehicleType` | string | No | |
| `minCapacity` | number | No | `capacityHorses ≥` giá trị này (route builder truyền số ngựa của Booking) |
| `availableFrom` / `availableTo` | string (date) | Cả hai hoặc không | Bật chế độ **sẵn sàng theo lịch**: trả xe `AVAILABLE` hoặc `ASSIGNED`, **không chồng lịch** chặng nào trong khoảng này và chưa hết đăng kiểm/bảo hiểm (C10). Khi bật, mỗi item có `isAvailable` |
| `search` | string | No | `vehicleCode`, `licensePlate`, `vehicleName` |
| `sortBy` | string | No | `vehicleCode`, `capacityHorses`, `updatedAt`. Mặc định `vehicleCode:asc` |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Vehicles retrieved successfully",
  "value": {
    "items": [
      {
        "vehicleId": 501,
        "vehicleCode": "VEH-ROAD-005",
        "vehicleName": "Horse Truck 05",
        "transportMode": "ROAD",
        "licensePlate": "29C-99988",
        "vehicleType": "HORSE_TRUCK",
        "manufacturer": "MAN",
        "model": "TGX",
        "capacityHorses": 6,
        "status": "AVAILABLE",
        "registrationNumber": "REG-005",
        "registrationExpiryDate": "2027-10-01",
        "registrationStatus": "VALID",
        "insuranceNumber": "INS-005",
        "insuranceExpiryDate": "2027-10-01",
        "insuranceStatus": "VALID",
        "specialEquipment": "Ventilation, partitions",
        "warnings": [],
        "isAvailable": true,
        "createdAt": "2026-09-10T03:00:00Z",
        "updatedAt": "2026-09-10T03:00:00Z"
      }
    ],
    "pageIndex": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

Không có xe phù hợp → `200`, `items: []` (FE hiển thị "No available vehicles matching the search criteria.", UC-43 EXC-02).

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400 | `INVALID_DATE_RANGE` | `availableTo` must not be earlier than `availableFrom`, and both are required together |
| 400 | `INVALID_SORT_PARAMETER` | The sort parameter is invalid |

### VH2. Chi tiết phương tiện

`GET /api/v1/vehicles/{vehicleId}`

**`200 OK`** — object [`Vehicle`](#34-vehicle) + `upcomingAssignments` (lịch các chặng đã gán, UC-43 bước 5).

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Vehicle retrieved successfully",
  "value": {
    "vehicleId": 501,
    "vehicleCode": "VEH-ROAD-005",
    "vehicleName": "Horse Truck 05",
    "transportMode": "ROAD",
    "licensePlate": "29C-99988",
    "vehicleType": "HORSE_TRUCK",
    "manufacturer": "MAN",
    "model": "TGX",
    "capacityHorses": 6,
    "status": "ASSIGNED",
    "registrationNumber": "REG-005",
    "registrationExpiryDate": "2026-10-10",
    "registrationStatus": "EXPIRING_SOON",
    "insuranceNumber": "INS-005",
    "insuranceExpiryDate": "2027-10-01",
    "insuranceStatus": "VALID",
    "specialEquipment": "Ventilation, partitions",
    "warnings": ["REGISTRATION_EXPIRING_SOON"],
    "upcomingAssignments": [
      {
        "routePlanRouteId": 8001,
        "routePlanId": 301,
        "routePlanCode": "RP-20261001-0001",
        "transportPlanId": 101,
        "planCode": "TP-20261001-0001",
        "sequenceNo": 1,
        "fromLocationName": "Paris Stable",
        "toLocationName": "Paris CDG Airport",
        "plannedDepartureAt": "2026-10-27T06:00:00Z",
        "plannedArrivalAt": "2026-10-27T08:00:00Z"
      }
    ],
    "createdAt": "2026-09-10T03:00:00Z",
    "updatedAt": "2026-10-06T08:00:00Z"
  }
}
```

`warnings` có thể gồm: `REGISTRATION_EXPIRED`, `REGISTRATION_EXPIRING_SOON`, `INSURANCE_EXPIRED`, `INSURANCE_EXPIRING_SOON` (UC-43 EXC-01).

### VH3. Thêm phương tiện

UC-44.

`POST /api/v1/vehicles`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `vehicleCode` | string | Yes | ≤ 50, duy nhất trên bản chưa xóa |
| `vehicleName` | string | No | ≤ 200 |
| `transportMode` | string | Yes | `ROAD`, `SEA`, `AIR` (C09) |
| `licensePlate` | string | Có điều kiện | **Bắt buộc khi `ROAD`**; duy nhất |
| `vehicleType` | string | No | |
| `manufacturer` / `model` | string | No | |
| `capacityHorses` | number | Yes | Số nguyên **2–9** (BR-BOOKING-02) |
| `registrationNumber` | string | No | |
| `registrationExpiryDate` | string (date) | No | Nếu có phải **sau hôm nay** |
| `insuranceNumber` | string | No | |
| `insuranceExpiryDate` | string (date) | No | Nếu có phải **sau hôm nay** |
| `specialEquipment` | string | No | |

Không nhận `status` (luôn `AVAILABLE`), `isDeleted`.

```json
{
  "vehicleCode": "VEH-ROAD-005",
  "vehicleName": "Horse Truck 05",
  "transportMode": "ROAD",
  "licensePlate": "29C-99988",
  "vehicleType": "HORSE_TRUCK",
  "manufacturer": "MAN",
  "model": "TGX",
  "capacityHorses": 6,
  "registrationNumber": "REG-005",
  "registrationExpiryDate": "2027-10-01",
  "insuranceNumber": "INS-005",
  "insuranceExpiryDate": "2027-10-01",
  "specialEquipment": "Ventilation, partitions"
}
```

**`201 Created`** — `value` là object `Vehicle` vừa tạo (cùng field như VH1, `status: "AVAILABLE"`, `isAvailable` không có).

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Vehicle VEH-ROAD-005 (29C-99988) created successfully",
  "value": {
    "vehicleId": 501,
    "vehicleCode": "VEH-ROAD-005",
    "vehicleName": "Horse Truck 05",
    "transportMode": "ROAD",
    "licensePlate": "29C-99988",
    "vehicleType": "HORSE_TRUCK",
    "manufacturer": "MAN",
    "model": "TGX",
    "capacityHorses": 6,
    "status": "AVAILABLE",
    "registrationNumber": "REG-005",
    "registrationExpiryDate": "2027-10-01",
    "registrationStatus": "VALID",
    "insuranceNumber": "INS-005",
    "insuranceExpiryDate": "2027-10-01",
    "insuranceStatus": "VALID",
    "specialEquipment": "Ventilation, partitions",
    "warnings": [],
    "createdAt": "2026-10-06T08:00:00Z",
    "updatedAt": "2026-10-06T08:00:00Z"
  }
}
```

Lỗi `400 VALIDATION_ERROR` có `errors[]` theo từng field, ví dụ:

```json
{
  "isSuccess": false, "code": 400, "errorCode": "VALIDATION_ERROR", "message": "The input data is invalid",
  "errors": [
    { "field": "capacityHorses", "message": "Vehicle capacity must be between 2 and 9 racehorses (BR-BOOKING-02)." },
    { "field": "insuranceExpiryDate", "message": "Expiry date must be in the future." }
  ],
  "value": null
}
```

### VH4. Sửa thông tin phương tiện

UC-45. Gửi đủ các field cho phép sửa. **Không sửa** `vehicleId`, `vehicleCode`, `status` (gửi giá trị khác → `400 VALIDATION_ERROR`; đổi status dùng VH5). Đổi `transportMode` khi xe đang gán cho chặng chưa hoàn thành → `409 VEHICLE_IN_USE`.

`PUT /api/v1/vehicles/{vehicleId}`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | |
| `vehicleName`, `vehicleType`, `manufacturer`, `model`, `specialEquipment` | string | No | |
| `transportMode` | string | Yes | |
| `licensePlate` | string | Có điều kiện | Bắt buộc khi `ROAD`; kiểm tra unique nếu đổi |
| `capacityHorses` | number | Yes | 2–9 |
| `registrationNumber` / `registrationExpiryDate` | string / date | No | Hạn phải ở tương lai |
| `insuranceNumber` / `insuranceExpiryDate` | string / date | No | Hạn phải ở tương lai |

```json
{
  "lastUpdatedAt": "2026-09-10T03:00:00Z",
  "vehicleName": "Horse Truck 05",
  "transportMode": "ROAD",
  "licensePlate": "29C-99988",
  "vehicleType": "HORSE_TRUCK",
  "manufacturer": "MAN",
  "model": "TGX",
  "capacityHorses": 6,
  "registrationNumber": "REG-005-R",
  "registrationExpiryDate": "2027-10-01",
  "insuranceNumber": "INS-005-R",
  "insuranceExpiryDate": "2027-10-01",
  "specialEquipment": "Ventilation, partitions, CCTV"
}
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Vehicle VEH-ROAD-005 (29C-99988) updated successfully",
  "value": { "vehicleId": 501, "registrationStatus": "VALID", "insuranceStatus": "VALID", "warnings": [], "updatedAt": "2026-10-06T09:00:00Z" }
}
```

### VH5. Đổi trạng thái thủ công

UC-46. ⚠️ C10, C25.

`PATCH /api/v1/vehicles/{vehicleId}/status`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | |
| `status` | string | Yes | **Chỉ** `AVAILABLE`, `MAINTENANCE`, `SUSPENDED`, `OUT_OF_SERVICE`. `ASSIGNED`/`IN_USE` → `400` |
| `reason` | string | Yes | Ghi chú / lý do (ghi audit — C07) |

```json
{
  "lastUpdatedAt": "2026-10-06T09:00:00Z",
  "status": "MAINTENANCE",
  "reason": "Scheduled air-conditioning maintenance"
}
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Vehicle status updated successfully",
  "value": { "vehicleId": 501, "previousStatus": "AVAILABLE", "status": "MAINTENANCE", "updatedAt": "2026-10-06T10:00:00Z" }
}
```

Xe sang trạng thái khác `AVAILABLE` tự động bị ẩn khỏi danh sách gợi ý khi lập route/phân công (UC-46 ALT-01). Xe đang `ASSIGNED` hoặc `IN_USE` → `409 VEHICLE_STATUS_LOCKED`.

---

## 10. Route Plan (UC-33, UC-37 → UC-40)

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| RP1 | Tạo Route Plan (chính / dự phòng) | `POST /transport-plans/{transportPlanId}/route-plans` | RC (PRIMARY, BACKUP); LM (BACKUP) |
| RP2 | Danh sách Route Plan của plan | `GET /transport-plans/{transportPlanId}/route-plans` | RC, LM, TS |
| RP3 | Chi tiết Route Plan | `GET /route-plans/{routePlanId}` | RC, LM, TS |
| RP4 | Sửa Route Plan | `PUT /route-plans/{routePlanId}` | RC (PRIMARY, BACKUP); LM (BACKUP) |
| RP5 | Hủy Route Plan | `POST /route-plans/{routePlanId}/cancel` | RC; LM (BACKUP) |
| RP6 | Xuất PDF | `GET /route-plans/{routePlanId}/export` | RC, LM |

> RP7 (TS thẩm định) và RP8 (LM duyệt) ở [Mục 11](#11-thẩm-định-pháp-lý--phê-duyệt-uc-47).

**Lỗi dùng chung:**

| HTTP | errorCode | Message | Dùng ở |
| ---- | --------- | ------- | ------ |
| 404 | `TRANSPORT_PLAN_NOT_FOUND` | Transport Plan not found | RP1, RP2 |
| 404 | `ROUTE_PLAN_NOT_FOUND` | Route Plan not found | RP3 → RP6 |
| 404 | `ROUTE_NOT_FOUND` / `LOCATION_NOT_FOUND` / `VEHICLE_NOT_FOUND` | Route / Location / Vehicle not found | RP1, RP4 |
| 409 | `PRIMARY_ROUTE_PLAN_EXISTS` | A primary route plan already exists for this transport plan | RP1 |
| 409 | `PRIMARY_ROUTE_PLAN_REQUIRED` | A backup route plan requires an existing primary route plan | RP1 |
| 409 | `IDENTICAL_CONTINGENCY_ROUTE` | Contingency route cannot be identical to the primary route. Please select alternative waypoints or border checkpoints. | RP1, RP4 |
| 409 | `INVALID_ROUTE_PLAN_STATUS` | This action cannot be performed while the route plan is in {status} status | RP4, RP5 |
| 409 | `ROUTE_LOCKED` | Transport is currently in transit. Please use Emergency Route Change (UC-48) for in-transit modifications. | RP4 |
| 409 | `ROUTE_PLAN_MODIFIED` | The route plan was just modified. Please reload the page | RP4, RP5 |
| 409 | `SCHEDULE_CONFLICT` | A selected vehicle is already assigned during this time slot | RP1, RP4 |
| 422 | `DEPOSIT_REQUIRED` | The deposit must be paid before a route plan can be created | RP1 |
| 422 | `REST_RULE_VIOLATION` | Violation of mandatory rest rules (BR-033/BR-034). Maximum continuous driving time is 8 hours and mandatory 24h rest for trips over 24 hours. | RP1, RP4 |
| 422 | `BCP_REQUIRED` | A cross-border transport requires at least one Border Control Post | RP1, RP4 |
| 422 | `SEGMENT_NOT_CONTINUOUS` | Segments must be continuous: each segment must start where the previous one ends | RP1, RP4 |
| 422 | `VEHICLE_MODE_MISMATCH` | The vehicle transport mode does not match the segment | RP1, RP4 |
| 422 | `VEHICLE_UNAVAILABLE` | The vehicle is not available (status / expired registration or insurance) | RP1, RP4 |
| 422 | `VEHICLE_CAPACITY_EXCEEDED` | Total vehicle capacity is lower than the number of horses in the booking | RP1, RP4 |
| 422 | `OUTSOURCED_SEGMENT` | An outsourced segment cannot have vehicles, driver or escort | RP1, RP4 |
| 422 | `PROVIDER_MODE_MISMATCH` | The provider does not support the transport mode of this segment | RP1, RP4 |

### 10.1. Cấu trúc `segments[]` khi tạo/sửa

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `sequenceNo` | number | Yes | Liền từ 1 |
| `routeId` | number | Có điều kiện | Route master có sẵn. **Hoặc** dùng 3 field dưới (R13) |
| `fromLocationId` / `toLocationId` | number | Có điều kiện | Khi không gửi `routeId` |
| `transportMode` | string | Có điều kiện | Khi không gửi `routeId` |
| `plannedDepartureAt` | string | Yes | |
| `plannedArrivalAt` | string | Yes | Sau `plannedDepartureAt` |
| `vehicleIds` | number[] | No | Chỉ chặng nội bộ; ≥ 1 khi `SUBMIT_FOR_LEGAL_REVIEW` |
| `outsourcing` | object | No | Chặng thuê ngoài: `{ transportProviderId, serviceType, providerReference, note }` (UC-33 bước 4). Có field này ⇒ chặng thuê ngoài |
| `note` | string | No | Ví dụ "BCP Calais" |

> Trạm dừng nghỉ/BCP **không** là mảng riêng: chúng là `Location` nối giữa 2 chặng liên tiếp, thời gian dừng = khoảng cách giữa `plannedArrivalAt` chặng trước và `plannedDepartureAt` chặng sau (C15).

### RP1. Tạo Route Plan (chính / dự phòng)

UC-33 (PRIMARY) và UC-37 (BACKUP). ⚠️ C01, C02, C19.

`POST /api/v1/transport-plans/{transportPlanId}/route-plans`

Điều kiện: Booking `APPROVED`; `TransportPlan.status = APPROVED` (đã cọc, R3). BACKUP yêu cầu đã có PRIMARY chưa hủy.

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `routeType` | string | Yes | `PRIMARY` \| `BACKUP` |
| `reason` | string | Khi `BACKUP` | Lý do lập dự phòng (≥ 10 ký tự) |
| `replacesRoutePlanRouteId` | number | No | Chỉ BACKUP: chặng PRIMARY mà backup thay thế; bỏ trống = toàn tuyến (UC-37 bước 3) |
| `segments` | array | Yes | ≥ 1 chặng, [10.1](#101-cấu-trúc-segments-khi-tạosửa) |
| `routeNote` | string | No | |
| `action` | string | Yes | `SAVE_DRAFT` (→ `DRAFT`) \| `SUBMIT_FOR_LEGAL_REVIEW` (→ `PENDING_LEGAL_REVIEW`, notify TS) |

```json
{
  "routeType": "PRIMARY",
  "reason": null,
  "replacesRoutePlanRouteId": null,
  "segments": [
    {
      "sequenceNo": 1,
      "routeId": 7001,
      "plannedDepartureAt": "2026-10-27T06:00:00Z",
      "plannedArrivalAt": "2026-10-27T08:00:00Z",
      "vehicleIds": [501],
      "note": "Stable to CDG cargo"
    },
    {
      "sequenceNo": 2,
      "fromLocationId": 2,
      "toLocationId": 3,
      "transportMode": "AIR",
      "plannedDepartureAt": "2026-10-27T14:00:00Z",
      "plannedArrivalAt": "2026-10-27T15:30:00Z",
      "outsourcing": { "transportProviderId": 55, "serviceType": "AIR_CHARTER", "providerReference": "AWB-123456", "note": "Lufthansa Cargo" },
      "note": "Air leg CDG-LHR"
    },
    {
      "sequenceNo": 3,
      "routeId": 7003,
      "plannedDepartureAt": "2026-10-27T17:00:00Z",
      "plannedArrivalAt": "2026-10-27T19:30:00Z",
      "vehicleIds": [502],
      "note": "LHR to Newmarket Stables"
    }
  ],
  "routeNote": "Direct air route",
  "action": "SUBMIT_FOR_LEGAL_REVIEW"
}
```

**`201 Created`** — `value` là object [`RoutePlan`](#36-routeplan) đầy đủ:

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Route plan created successfully",
  "value": {
    "routePlanId": 301,
    "routePlanCode": "RP-20261001-0001",
    "transportPlanId": 101,
    "bookingId": 9001,
    "bookingCode": "REQ-20261001-0005",
    "routeType": "PRIMARY",
    "primaryRoutePlanId": null,
    "replacesRoutePlanRouteId": null,
    "reason": null,
    "status": "PENDING_LEGAL_REVIEW",
    "isCrossBorder": true,
    "totalDistanceKm": 612.4,
    "estimatedDurationMinutes": 750,
    "plannedDepartureAt": "2026-10-27T06:00:00Z",
    "plannedArrivalAt": "2026-10-27T19:30:00Z",
    "segments": [
      {
        "routePlanRouteId": 8001,
        "sequenceNo": 1,
        "routeType": "PRIMARY",
        "route": { "routeId": 7001, "routeCode": "RT-STB-CDG-ROAD", "routeName": "Paris Stable - CDG Cargo", "transportMode": "ROAD", "distanceKm": 48.2, "estimatedDurationMinutes": 110 },
        "fromLocation": { "locationId": 1, "locationName": "Paris Stable", "locationType": "STABLE", "city": "Paris", "country": "FR" },
        "toLocation": { "locationId": 2, "locationName": "Paris CDG Airport", "locationType": "AIRPORT", "city": "Paris", "country": "FR" },
        "plannedDepartureAt": "2026-10-27T06:00:00Z",
        "plannedArrivalAt": "2026-10-27T08:00:00Z",
        "actualDepartureAt": null,
        "actualArrivalAt": null,
        "status": "PENDING",
        "dwellAfterMinutes": 360,
        "executionType": "INTERNAL",
        "vehicles": [{ "vehicleId": 501, "vehicleCode": "VEH-ROAD-005", "vehicleName": "Horse Truck 05", "licensePlate": "29C-99988", "transportMode": "ROAD", "capacityHorses": 6 }],
        "outsourcing": null,
        "driver": null,
        "escort": null,
        "note": "Stable to CDG cargo"
      },
      {
        "routePlanRouteId": 8002,
        "sequenceNo": 2,
        "routeType": "PRIMARY",
        "route": { "routeId": 7002, "routeCode": "RT-CDG-LHR-AIR", "routeName": "CDG - LHR", "transportMode": "AIR", "distanceKm": 350.0, "estimatedDurationMinutes": 90 },
        "fromLocation": { "locationId": 2, "locationName": "Paris CDG Airport", "locationType": "AIRPORT", "city": "Paris", "country": "FR" },
        "toLocation": { "locationId": 3, "locationName": "London Heathrow", "locationType": "AIRPORT", "city": "London", "country": "GB" },
        "plannedDepartureAt": "2026-10-27T14:00:00Z",
        "plannedArrivalAt": "2026-10-27T15:30:00Z",
        "actualDepartureAt": null,
        "actualArrivalAt": null,
        "status": "PENDING",
        "dwellAfterMinutes": 90,
        "executionType": "OUTSOURCED",
        "vehicles": [],
        "outsourcing": {
          "provider": { "transportProviderId": 55, "providerCode": "PRV-LUFTHANSA-01", "providerName": "Lufthansa Cargo", "status": "ACTIVE", "supportedModes": ["AIR"] },
          "serviceType": "AIR_CHARTER",
          "providerReference": "AWB-123456"
        },
        "driver": null,
        "escort": null,
        "note": "Air leg CDG-LHR"
      },
      {
        "routePlanRouteId": 8003,
        "sequenceNo": 3,
        "routeType": "PRIMARY",
        "route": { "routeId": 7003, "routeCode": "RT-LHR-NMK-ROAD", "routeName": "LHR - Newmarket", "transportMode": "ROAD", "distanceKm": 214.2, "estimatedDurationMinutes": 150 },
        "fromLocation": { "locationId": 3, "locationName": "London Heathrow", "locationType": "AIRPORT", "city": "London", "country": "GB" },
        "toLocation": { "locationId": 4, "locationName": "Newmarket Stables", "locationType": "STABLE", "city": "Newmarket", "country": "GB" },
        "plannedDepartureAt": "2026-10-27T17:00:00Z",
        "plannedArrivalAt": "2026-10-27T19:30:00Z",
        "actualDepartureAt": null,
        "actualArrivalAt": null,
        "status": "PENDING",
        "dwellAfterMinutes": null,
        "executionType": "INTERNAL",
        "vehicles": [{ "vehicleId": 502, "vehicleCode": "VEH-ROAD-006", "vehicleName": "Horse Truck 06", "licensePlate": "GB-HT-0006", "transportMode": "ROAD", "capacityHorses": 6 }],
        "outsourcing": null,
        "driver": null,
        "escort": null,
        "note": "LHR to Newmarket Stables"
      }
    ],
    "personnelStatus": "NOT_ASSIGNED",
    "legalReview": null,
    "approval": null,
    "routeNote": "Direct air route",
    "createdAt": "2026-10-08T08:00:00Z",
    "updatedAt": "2026-10-08T08:00:00Z"
  }
}
```

**Backup (UC-37).** Ví dụ request thay toàn tuyến (qua Dunkirk):

```json
{
  "routeType": "BACKUP",
  "reason": "Backup in case Heathrow cargo apron is congested",
  "replacesRoutePlanRouteId": null,
  "segments": [
    { "sequenceNo": 1, "routeId": 7010, "plannedDepartureAt": "2026-10-27T06:00:00Z", "plannedArrivalAt": "2026-10-27T11:00:00Z", "vehicleIds": [503], "note": "BCP Dunkirk" },
    {
      "sequenceNo": 2, "fromLocationId": 33, "toLocationId": 4, "transportMode": "SEA",
      "plannedDepartureAt": "2026-10-27T12:00:00Z", "plannedArrivalAt": "2026-10-27T18:00:00Z",
      "outsourcing": { "transportProviderId": 56, "serviceType": "FERRY_SEA_CROSSING", "providerReference": "FERRY-9981", "note": "Dunkirk to UK" }
    }
  ],
  "routeNote": "Contingency via Dunkirk",
  "action": "SAVE_DRAFT"
}
```

Response `201` cùng cấu trúc, `routeType: "BACKUP"`, `primaryRoutePlanId: 301`, `status: "DRAFT"`. Khi `SUBMIT_FOR_LEGAL_REVIEW` hệ thống notify TS để chuẩn bị giấy tờ cho tuyến dự phòng (UC-37 bước 7, AC-002).

### RP2. Danh sách Route Plan của Transport Plan

UC-38 (chuyển tab tuyến chính / dự phòng), UC-37 (danh sách dự phòng, SCR-F3-013).

`GET /api/v1/transport-plans/{transportPlanId}/route-plans?routeType=BACKUP&includeCancelled=false`

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `routeType` | string | No | `PRIMARY` \| `BACKUP`; bỏ trống = tất cả |
| `status` | string | No | `RoutePlanStatus` |
| `includeCancelled` | boolean | No | Mặc định `false` |

**`200 OK`** — không phân trang (một plan chỉ có vài phương án).

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plans retrieved successfully",
  "value": {
    "items": [
      {
        "routePlanId": 301,
        "routePlanCode": "RP-20261001-0001",
        "routeType": "PRIMARY",
        "primaryRoutePlanId": null,
        "status": "PENDING_LEGAL_REVIEW",
        "totalDistanceKm": 612.4,
        "estimatedDurationMinutes": 750,
        "segmentCount": 3,
        "personnelStatus": "NOT_ASSIGNED",
        "updatedAt": "2026-10-08T08:00:00Z"
      },
      {
        "routePlanId": 302,
        "routePlanCode": "RP-20261001-0002",
        "routeType": "BACKUP",
        "primaryRoutePlanId": 301,
        "reason": "Backup in case Heathrow cargo apron is congested",
        "replacesRoutePlanRouteId": null,
        "status": "DRAFT",
        "totalDistanceKm": 340.0,
        "estimatedDurationMinutes": 720,
        "segmentCount": 2,
        "personnelStatus": "NOT_ASSIGNED",
        "updatedAt": "2026-10-08T09:00:00Z"
      }
    ]
  }
}
```

Chưa có route nào → `200`, `items: []` (FE hiển thị "This booking does not have a Route Plan created yet. Please create a Route Plan first.", UC-38 EXC-01).

### RP3. Chi tiết Route Plan

UC-38. Dữ liệu cho bản đồ + timeline (SCR-F3-009, SCR-F3-032).

`GET /api/v1/route-plans/{routePlanId}`

**`200 OK`** — `value` là object [`RoutePlan`](#36-routeplan) đầy đủ như response `201` của RP1, bổ sung `legalReview` và `approval` khi đã có:

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plan retrieved successfully",
  "value": {
    "routePlanId": 301,
    "routePlanCode": "RP-20261001-0001",
    "transportPlanId": 101,
    "routeType": "PRIMARY",
    "status": "APPROVED",
    "isCrossBorder": true,
    "totalDistanceKm": 612.4,
    "estimatedDurationMinutes": 750,
    "segments": [ "…cùng cấu trúc Segment như RP1…" ],
    "personnelStatus": "PARTIALLY_ASSIGNED",
    "legalReview": {
      "result": "FEASIBLE",
      "note": "All required permits are obtainable",
      "reviewedBy": { "employeeId": 21, "employeeCode": "EMP-2026-021", "fullName": "Nguyen Van A", "role": "TRANSPORT_SPECIALIST" },
      "reviewedAt": "2026-10-09T08:00:00Z"
    },
    "approval": {
      "decision": "APPROVED",
      "note": "Approved for departure",
      "decidedBy": { "employeeId": 5, "employeeCode": "EMP-2026-005", "fullName": "Tran Anh Tuan", "role": "LOGISTICS_MANAGER" },
      "decidedAt": "2026-10-09T10:00:00Z"
    },
    "createdAt": "2026-10-08T08:00:00Z",
    "updatedAt": "2026-10-09T10:00:00Z"
  }
}
```

> `"…cùng cấu trúc Segment như RP1…"` chỉ là chú thích rút gọn trong tài liệu; response thật trả mảng `Segment` đầy đủ.

### RP4. Sửa Route Plan

UC-39 (PRIMARY) và UC-37 (BACKUP). Ghi đè toàn bộ `segments` (thêm/sửa/xóa chặng). Chỉ khi `status ∈ {DRAFT, REJECTED_BY_MANAGER, PENDING_MANAGER_APPROVAL}`; sửa khi `PENDING_MANAGER_APPROVAL` đưa route về `DRAFT`/`PENDING_LEGAL_REVIEW` (hủy kết quả thẩm định cũ). `PENDING_LEGAL_REVIEW` (TS đang xem) và `APPROVED` trở đi → `409 INVALID_ROUTE_PLAN_STATUS` / `ROUTE_LOCKED` (C25). Chặng cũ bị xóa trong lần sửa được ghi audit (AC-002 UC-33).

`PUT /api/v1/route-plans/{routePlanId}`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | Optimistic locking (UC-39 Non-Functional) |
| `updateReason` | string | Yes | Lý do cập nhật lộ trình (UC-39 bước 4) |
| `reason` | string | Khi `BACKUP` | |
| `replacesRoutePlanRouteId` | number | No | Chỉ BACKUP |
| `segments` | array | Yes | Toàn bộ chặng mới, [10.1](#101-cấu-trúc-segments-khi-tạosửa) |
| `routeNote` | string | No | |
| `action` | string | Yes | `SAVE_DRAFT` \| `SUBMIT_FOR_LEGAL_REVIEW` ("Lưu & Gửi Thẩm định Pháp lý") |

```json
{
  "lastUpdatedAt": "2026-10-08T08:00:00Z",
  "updateReason": "TS reported the original BCP cannot be permitted",
  "segments": [
    { "sequenceNo": 1, "routeId": 7010, "plannedDepartureAt": "2026-10-27T06:00:00Z", "plannedArrivalAt": "2026-10-27T11:00:00Z", "vehicleIds": [501], "note": "BCP Dunkirk" },
    {
      "sequenceNo": 2, "fromLocationId": 33, "toLocationId": 4, "transportMode": "SEA",
      "plannedDepartureAt": "2026-10-27T12:00:00Z", "plannedArrivalAt": "2026-10-27T18:00:00Z",
      "outsourcing": { "transportProviderId": 56, "serviceType": "FERRY_SEA_CROSSING", "providerReference": "FERRY-9981" }
    }
  ],
  "routeNote": "Re-routed via Dunkirk",
  "action": "SUBMIT_FOR_LEGAL_REVIEW"
}
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plan updated successfully",
  "value": {
    "routePlanId": 301,
    "status": "PENDING_LEGAL_REVIEW",
    "totalDistanceKm": 340.0,
    "estimatedDurationMinutes": 720,
    "segmentCount": 2,
    "personnelStatus": "NOT_ASSIGNED",
    "updatedAt": "2026-10-08T12:00:00Z"
  }
}
```

> Response thu gọn để FE cập nhật nhanh; cần dữ liệu đầy đủ thì gọi lại RP3. Khi `SUBMIT_FOR_LEGAL_REVIEW` hệ thống notify TS (UC-39 bước 6).

### RP5. Hủy Route Plan

UC-40 (PRIMARY, RC) và UC-37 (BACKUP, soft-cancel). Chỉ khi `DRAFT` hoặc `REJECTED_BY_MANAGER`; `APPROVED` → `409 INVALID_ROUTE_PLAN_STATUS` (message "Cannot cancel an Approved Route Plan. Please contact Logistics Manager if a route change is required."). Giải phóng xe đã giữ chỗ. Không đổi trạng thái Booking hay TransportPlan.

`POST /api/v1/route-plans/{routePlanId}/cancel`

```json
{ "lastUpdatedAt": "2026-10-08T08:00:00Z", "reason": "Created by mistake" }
```

`reason` bắt buộc.

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plan cancelled successfully",
  "value": {
    "routePlanId": 301,
    "status": "CANCELLED",
    "cancelledAt": "2026-10-08T12:30:00Z",
    "bookingStatus": "APPROVED",
    "routePlanningStatus": "NOT_STARTED"
  }
}
```

### RP6. Xuất PDF

UC-38 ALT-01 (SCR-F3-033).

`GET /api/v1/route-plans/{routePlanId}/export?format=pdf`

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `format` | string | No | Hiện chỉ `pdf` (mặc định) |

**`200 OK`** — **không** dùng envelope JSON:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="RP-20261001-0001.pdf"
```

Lỗi (`404 ROUTE_PLAN_NOT_FOUND`, `400 VALIDATION_ERROR` khi `format` khác `pdf`) vẫn trả JSON theo envelope lỗi.

---

## 11. Thẩm định pháp lý & phê duyệt (UC-47)

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| RP7 | TS thẩm định pháp lý | `POST /route-plans/{routePlanId}/legal-review` | TS (được phân công) |
| RP8 | Manager duyệt / từ chối | `POST /route-plans/{routePlanId}/approval` | LM |

**Lỗi dùng chung:**

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 404 | `ROUTE_PLAN_NOT_FOUND` | Route Plan not found |
| 409 | `INVALID_ROUTE_PLAN_STATUS` | This action cannot be performed while the route plan is in {status} status |
| 409 | `ROUTE_PLAN_MODIFIED` | The route plan was just modified. Please reload the page |

### RP7. TS thẩm định pháp lý

UC-33 bước 7, ALT-01; UC-39 bước 7. ⚠️ C02, C07, C19. Chỉ khi `PENDING_LEGAL_REVIEW`.

`POST /api/v1/route-plans/{routePlanId}/legal-review`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | |
| `isFeasible` | boolean | Yes | `true` = "xin được hết" |
| `note` | string | Khi `isFeasible = false` | Lý do cụ thể (quốc gia/cửa khẩu không xin được giấy phép) |
| `blockedSegments` | number[] | No | `sequenceNo` các chặng có vấn đề (hiển thị ở SCR-F3-012) |

```json
{ "lastUpdatedAt": "2026-10-08T12:00:00Z", "isFeasible": true, "note": "All required permits are obtainable" }
```

```json
{ "lastUpdatedAt": "2026-10-08T12:00:00Z", "isFeasible": false, "note": "Calais BCP cannot be permitted due to local disease restriction", "blockedSegments": [1] }
```

**`200 OK`** — `isFeasible = true`:

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Legal review recorded successfully",
  "value": {
    "routePlanId": 301,
    "status": "PENDING_MANAGER_APPROVAL",
    "legalReview": {
      "result": "FEASIBLE",
      "note": "All required permits are obtainable",
      "blockedSegments": [],
      "reviewedBy": { "employeeId": 21, "employeeCode": "EMP-2026-021", "fullName": "Nguyen Van A", "role": "TRANSPORT_SPECIALIST" },
      "reviewedAt": "2026-10-09T08:00:00Z"
    },
    "updatedAt": "2026-10-09T08:00:00Z"
  }
}
```

`isFeasible = false` → `status: "DRAFT"`, `legalReview.result: "NOT_FEASIBLE"`, notify RC để chỉnh lộ trình (RP4). Hệ thống notify LM khi chuyển sang `PENDING_MANAGER_APPROVAL`.

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400 | `VALIDATION_ERROR` | `note` là bắt buộc khi `isFeasible = false` |
| 403 | `FORBIDDEN` | Chỉ TS được phân công vào Transport Plan này |

### RP8. Manager duyệt / từ chối

UC-47. ⚠️ C12, C18. Atomic (R14).

`POST /api/v1/route-plans/{routePlanId}/approval`

Điều kiện: `status = PENDING_MANAGER_APPROVAL`, `legalReview.result = FEASIBLE` (nếu không → `422 LEGAL_REVIEW_REQUIRED`: "Route Plan must be verified for legal feasibility by Transport Specialist before Manager approval."), `TransportPlan.status = APPROVED` (đã cọc; nếu không → `422 DEPOSIT_REQUIRED`).

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | |
| `decision` | string | Yes | `APPROVE` \| `REJECT` |
| `note` | string | No | Ghi chú chỉ đạo khi `APPROVE` |
| `reason` | string | Khi `REJECT` | **≥ 10 ký tự** |

Approve:

```json
{ "lastUpdatedAt": "2026-10-09T08:00:00Z", "decision": "APPROVE", "note": "Approved for departure" }
```

Reject:

```json
{ "lastUpdatedAt": "2026-10-09T08:00:00Z", "decision": "REJECT", "reason": "Add a 24-hour rest stop at an approved control post" }
```

**`200 OK`** — approve:

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plan approved successfully",
  "value": {
    "routePlanId": 301,
    "status": "APPROVED",
    "approval": {
      "decision": "APPROVED",
      "note": "Approved for departure",
      "decidedBy": { "employeeId": 5, "employeeCode": "EMP-2026-005", "fullName": "Tran Anh Tuan", "role": "LOGISTICS_MANAGER" },
      "decidedAt": "2026-10-09T10:00:00Z"
    },
    "approvedBackupRoutePlanIds": [302],
    "customerUploadEnabled": true,
    "personnelAssignmentPhase2Enabled": true,
    "updatedAt": "2026-10-09T10:00:00Z"
  }
}
```

Side effect trong cùng transaction khi approve: `RoutePlan → APPROVED` (+ mọi BACKUP đang `PENDING_MANAGER_APPROVAL`, C18); ghi `approved_at/approved_by` (C07); mở quyền Customer upload giấy tờ (Flow 2 — C12); mở phân công đợt 2 (PS3); gán xe `ASSIGNED` (R10); `Transport.status → PLANNING/READY` (C17); notify Customer ("Lộ trình di chuyển đã được phê duyệt. Vui lòng tải lên các giấy tờ pháp lý theo yêu cầu.") + RC + TS.

Reject:

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plan rejected successfully",
  "value": {
    "routePlanId": 301,
    "status": "REJECTED_BY_MANAGER",
    "approval": {
      "decision": "REJECTED",
      "reason": "Add a 24-hour rest stop at an approved control post",
      "decidedBy": { "employeeId": 5, "employeeCode": "EMP-2026-005", "fullName": "Tran Anh Tuan", "role": "LOGISTICS_MANAGER" },
      "decidedAt": "2026-10-09T10:00:00Z"
    },
    "customerUploadEnabled": false,
    "personnelAssignmentPhase2Enabled": false,
    "updatedAt": "2026-10-09T10:00:00Z"
  }
}
```

Notify RC để chỉnh sửa (RP4 → `DRAFT`); chặn phân công đợt 2.

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400 | `VALIDATION_ERROR` | `reason` tối thiểu 10 ký tự khi `REJECT` |
| 422 | `LEGAL_REVIEW_REQUIRED` | Route Plan must be verified for legal feasibility by Transport Specialist before Manager approval. |
| 422 | `DEPOSIT_REQUIRED` | The deposit must be paid before the route plan can be approved |

---

## 12. Phân công nhân sự (UC-36)

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| PS1 | Phân công đợt 1 (TS + RC) | `PUT /transport-plans/{transportPlanId}/assignments/phase-1` | LM |
| PS2 | Xem phân công | `GET /transport-plans/{transportPlanId}/assignments` | LM, RC, TS |
| PS3 | Giao nhiệm vụ đợt 2 (cả route) | `PUT /route-plans/{routePlanId}/personnel` | LM |
| PS4 | Đổi nhân sự một chặng | `PATCH /route-plans/{routePlanId}/segments/{routePlanRouteId}/personnel` | LM |

> ⚠️ C04, C05, C12, C16, C17.

**Lỗi dùng chung:**

| HTTP | errorCode | Message | Dùng ở |
| ---- | --------- | ------- | ------ |
| 404 | `TRANSPORT_PLAN_NOT_FOUND` / `ROUTE_PLAN_NOT_FOUND` / `SEGMENT_NOT_FOUND` / `EMPLOYEE_NOT_FOUND` | Not found | tất cả |
| 409 | `PLAN_LOCKED` | Cannot change assignments once the transport is completed or cancelled | PS1 |
| 409 | `SCHEDULE_CONFLICT` | Driver EMP-XXXX-XXX is already assigned to Transport TP-YYYYMMDD-XXXX during this time slot. | PS3, PS4 |
| 422 | `INVALID_ROLE_ASSIGNMENT` | The selected employee does not have the required role | PS1, PS3, PS4 |
| 422 | `ROUTE_NOT_APPROVED` | Cannot assign Driver and Escort until the Route Plan is approved. | PS3, PS4 |
| 422 | `OUTSOURCED_SEGMENT` | An outsourced segment cannot have a driver or escort | PS3, PS4 |

### PS1. Phân công đợt 1

UC-34 bước 5, UC-36 luồng đợt 1. Upsert 2 dòng `EmployeeTransportPlan` (`responsibility = TRANSPORT_SPECIALIST` / `ROUTE_COORDINATOR`, `is_primary = true`); **idempotent**: gửi lại đúng cặp cũ → `200` không đổi. Gửi người khác → thay thế dòng cũ (bản ghi cũ chuyển vào audit — C05/C07) và notify cả người cũ lẫn người mới.

`PUT /api/v1/transport-plans/{transportPlanId}/assignments/phase-1`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `transportSpecialistId` | number | Yes | Role `TRANSPORT_SPECIALIST`, `is_active = true` |
| `routeCoordinatorId` | number | Yes | Role `FLEET_ROUTE_COORDINATOR`, `is_active = true` |
| `reason` | string | Khi thay người | |

```json
{ "transportSpecialistId": 21, "routeCoordinatorId": 35, "reason": null }
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Phase 1 personnel assigned successfully",
  "value": {
    "transportPlanId": 101,
    "assignedEmployees": [
      { "employeeId": 21, "employeeCode": "EMP-2026-021", "fullName": "Nguyen Van A", "role": "TRANSPORT_SPECIALIST", "responsibility": "TRANSPORT_SPECIALIST", "isPrimary": true, "assignedAt": "2026-10-06T08:00:00Z" },
      { "employeeId": 35, "employeeCode": "EMP-2026-035", "fullName": "Pham Hoang Nam", "role": "FLEET_ROUTE_COORDINATOR", "responsibility": "ROUTE_COORDINATOR", "isPrimary": true, "assignedAt": "2026-10-06T08:00:00Z" }
    ],
    "updatedAt": "2026-10-06T08:00:00Z"
  }
}
```

### PS2. Xem phân công

SCR-F3-015 (2 tab Phase 1 / Phase 2).

`GET /api/v1/transport-plans/{transportPlanId}/assignments`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Assignments retrieved successfully",
  "value": {
    "transportPlanId": 101,
    "phase1": {
      "transportSpecialist": { "employeeId": 21, "employeeCode": "EMP-2026-021", "fullName": "Nguyen Van A", "role": "TRANSPORT_SPECIALIST" },
      "routeCoordinator": { "employeeId": 35, "employeeCode": "EMP-2026-035", "fullName": "Pham Hoang Nam", "role": "FLEET_ROUTE_COORDINATOR" }
    },
    "phase2": {
      "enabled": true,
      "routePlanId": 301,
      "personnelStatus": "PARTIALLY_ASSIGNED",
      "segments": [
        { "routePlanRouteId": 8001, "sequenceNo": 1, "executionType": "INTERNAL", "plannedDepartureAt": "2026-10-27T06:00:00Z", "plannedArrivalAt": "2026-10-27T08:00:00Z", "driver": { "employeeId": 81, "employeeCode": "EMP-2026-081", "fullName": "Tran Van Nam", "role": "DRIVER" }, "escort": null, "provider": null, "isComplete": false },
        { "routePlanRouteId": 8002, "sequenceNo": 2, "executionType": "OUTSOURCED", "plannedDepartureAt": "2026-10-27T14:00:00Z", "plannedArrivalAt": "2026-10-27T15:30:00Z", "driver": null, "escort": null, "provider": { "transportProviderId": 55, "providerCode": "PRV-LUFTHANSA-01", "providerName": "Lufthansa Cargo" }, "isComplete": true }
      ]
    }
  }
}
```

`phase2.enabled = false` (và `routePlanId = null`, `segments = []`) khi PRIMARY chưa `APPROVED` — FE khóa giao diện chọn Driver/Escort (UC-36 AC-001).

### PS3. Giao nhiệm vụ đợt 2 (cả route)

UC-36 luồng đợt 2 ("Xác nhận & Giao nhiệm vụ Chuyến đi"). Atomic: kiểm tra từng chặng, ghi `driver_employee_id`/`escort_employee_id`, upsert `EmployeeTransportPlan` (`responsibility = DRIVER/ESCORT`, C04c), thông báo Driver/Escort (SignalR + email theo C26) và provider xác nhận (chặng thuê ngoài).

`PUT /api/v1/route-plans/{routePlanId}/personnel`

Điều kiện: RoutePlan `routeType = PRIMARY` và `status = APPROVED`. Mỗi chặng **nội bộ** phải gửi `driverEmployeeId` **và** `escortEmployeeId`; chặng thuê ngoài **không** gửi (UC-36 AC-002).

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | |
| `segments` | array | Yes | `{ routePlanRouteId, driverEmployeeId, escortEmployeeId }` cho từng chặng nội bộ |

```json
{
  "lastUpdatedAt": "2026-10-09T10:00:00Z",
  "segments": [
    { "routePlanRouteId": 8001, "driverEmployeeId": 81, "escortEmployeeId": 92 },
    { "routePlanRouteId": 8003, "driverEmployeeId": 82, "escortEmployeeId": 92 }
  ]
}
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Personnel assigned successfully",
  "value": {
    "routePlanId": 301,
    "personnelStatus": "FULLY_ASSIGNED",
    "segments": [
      { "routePlanRouteId": 8001, "sequenceNo": 1, "executionType": "INTERNAL", "driver": { "employeeId": 81, "employeeCode": "EMP-2026-081", "fullName": "Tran Van Nam", "role": "DRIVER" }, "escort": { "employeeId": 92, "employeeCode": "EMP-2026-092", "fullName": "Le Thi B", "role": "ESCORT" } },
      { "routePlanRouteId": 8002, "sequenceNo": 2, "executionType": "OUTSOURCED", "driver": null, "escort": null },
      { "routePlanRouteId": 8003, "sequenceNo": 3, "executionType": "INTERNAL", "driver": { "employeeId": 82, "employeeCode": "EMP-2026-082", "fullName": "Nguyen Van C", "role": "DRIVER" }, "escort": { "employeeId": 92, "employeeCode": "EMP-2026-092", "fullName": "Le Thi B", "role": "ESCORT" } }
    ],
    "updatedAt": "2026-10-09T11:00:00Z"
  }
}
```

Chỉ gán được một phần (ví dụ bỏ trống chặng 8003) → vẫn `200` nhưng `personnelStatus: "PARTIALLY_ASSIGNED"` (chỉ validate các chặng được gửi).

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400 | `VALIDATION_ERROR` | Chặng nội bộ gửi thiếu `driverEmployeeId` hoặc `escortEmployeeId` |
| 409 | `SCHEDULE_CONFLICT` | Driver/Escort trùng khoảng `[plannedDepartureAt, plannedArrivalAt]` với chặng khác của Transport khác (kể cả Escort đi nhiều chặng trong **cùng** plan thì **không** phải xung đột nếu các chặng không chồng giờ) |

### PS4. Đổi nhân sự một chặng

UC-36 ALT-01 ("Thay đổi / Điều động nhân sự bổ sung"). Dùng cho Driver/Escort ốm/bận trước khi khởi hành; hoạt động cả khi route đã `APPROVED`. Không cho sửa khi chặng đã `IN_PROGRESS/COMPLETED` (`409 SEGMENT_LOCKED`).

`PATCH /api/v1/route-plans/{routePlanId}/segments/{routePlanRouteId}/personnel`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `driverEmployeeId` | number | No | Bỏ trống = giữ nguyên |
| `escortEmployeeId` | number | No | Bỏ trống = giữ nguyên |
| `reason` | string | Yes | Lý do điều động |

```json
{ "driverEmployeeId": 83, "reason": "Previous driver is sick" }
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Segment personnel updated successfully",
  "value": {
    "routePlanId": 301,
    "segment": {
      "routePlanRouteId": 8001,
      "sequenceNo": 1,
      "executionType": "INTERNAL",
      "driver": { "employeeId": 83, "employeeCode": "EMP-2026-083", "fullName": "Hoang Van D", "role": "DRIVER" },
      "escort": { "employeeId": 92, "employeeCode": "EMP-2026-092", "fullName": "Le Thi B", "role": "ESCORT" }
    },
    "personnelStatus": "FULLY_ASSIGNED",
    "updatedAt": "2026-10-10T07:00:00Z"
  }
}
```

Notify Driver mới (và Driver cũ). Thêm lỗi `409 SEGMENT_LOCKED`.

---

## 13. Thay đổi lộ trình khẩn cấp (UC-48)

> ⚠️ C11, C24. Áp dụng khi `Transport.status = IN_TRANSIT` và RoutePlan PRIMARY `ACTIVE`. Thay đổi lệch **< 50 km và < 1 giờ** do Driver tự chọn được ghi nhận tự động ở Flow 4, **không** đi qua các API này (BR-036, C24). Thay đổi **thêm trạm nghỉ 24h** hoặc **đổi BCP** là bắt buộc phải duyệt.

| #   | API | Method & Endpoint | Role |
| --- | --- | ----------------- | ---- |
| EC1 | RC gửi đề xuất thay đổi | `POST /route-plans/{routePlanId}/change-requests` | RC |
| EC2 | Danh sách đề xuất | `GET /route-change-requests` | LM, RC |
| EC3 | Chi tiết đề xuất | `GET /route-change-requests/{changeRequestId}` | LM, RC |
| EC4 | Manager quyết định | `POST /route-change-requests/{changeRequestId}/decision` | LM |

**Lỗi dùng chung:**

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 404 | `ROUTE_PLAN_NOT_FOUND` / `CHANGE_REQUEST_NOT_FOUND` | Not found |
| 409 | `TRANSPORT_NOT_IN_TRANSIT` | Emergency route change is only available while the transport is IN_TRANSIT |
| 409 | `CHANGE_REQUEST_ALREADY_DECIDED` | This change request has already been decided |
| 409 | `CHANGE_REQUEST_PENDING_EXISTS` | There is already a pending change request for this route plan |
| 409 | `CHANGE_REQUEST_MODIFIED` | The change request was just modified. Please reload the page |

### EC1. RC gửi đề xuất thay đổi

Không có UC riêng cho bước này nhưng UC-48 precondition cần (C11). Đề xuất chọn **một** trong hai: dùng backup `APPROVED` hoặc gửi chặng thay thế (không cho cả hai).

`POST /api/v1/route-plans/{routePlanId}/change-requests`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `reason` | string | Yes | Ví dụ "Calais BCP blocked by strike" |
| `backupRoutePlanId` | number | Một trong hai | Backup `APPROVED` của cùng PRIMARY |
| `replacementSegments` | array | Một trong hai | Chặng thay thế cho phần **chưa đi** của hành trình, [10.1](#101-cấu-trúc-segments-khi-tạosửa); chặng đầu phải bắt đầu tại vị trí kết thúc của chặng đã hoàn thành |
| `newEstimatedArrivalAt` | string | Yes | ETA mới |
| `estimatedExtraCost` | number | No | Chi phí phát sinh ước tính (đường vòng, lưu chuồng thêm ngày) |
| `currency` | string | Khi có `estimatedExtraCost` | ISO 4217 |
| `note` | string | No | |

```json
{
  "reason": "Calais BCP blocked by strike",
  "backupRoutePlanId": 302,
  "replacementSegments": null,
  "newEstimatedArrivalAt": "2026-10-28T20:00:00Z",
  "estimatedExtraCost": 1800.00,
  "currency": "EUR",
  "note": "Dunkirk BCP pre-notified by TS"
}
```

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Route change request submitted successfully",
  "value": {
    "changeRequestId": 61,
    "routePlanId": 301,
    "status": "PENDING",
    "requiresApproval": true,
    "approvalReasons": ["BCP_CHANGED", "ADDITIONAL_24H_REST"],
    "createdAt": "2026-10-28T09:00:00Z"
  }
}
```

`requiresApproval` do server tính theo BR-036 từ so sánh tuyến cũ/mới: `approvalReasons` ⊆ `BCP_CHANGED`, `ADDITIONAL_24H_REST`, `DEVIATION_OVER_50KM`, `DELAY_OVER_1H`. Nếu tất cả đều không thỏa → `422 APPROVAL_NOT_REQUIRED` (chuyển sang ghi nhận tự động ở Flow 4). Notify LM (mức `URGENT`).

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400 | `VALIDATION_ERROR` | Chỉ được gửi **một** trong `backupRoutePlanId` / `replacementSegments` |
| 409 | `BACKUP_NOT_APPROVED` | Backup route plan is not APPROVED |
| 422 | `APPROVAL_NOT_REQUIRED` | The change is below the BR-036 thresholds and does not require approval |

### EC2. Danh sách đề xuất

`GET /api/v1/route-change-requests?pageIndex=1&pageSize=20&status=PENDING&transportPlanId=101&sortBy=createdAt:desc`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route change requests retrieved successfully",
  "value": {
    "items": [
      {
        "changeRequestId": 61,
        "routePlanId": 301,
        "transportPlanId": 101,
        "planCode": "TP-20261001-0001",
        "bookingCode": "REQ-20261001-0005",
        "status": "PENDING",
        "reason": "Calais BCP blocked by strike",
        "approvalReasons": ["BCP_CHANGED", "ADDITIONAL_24H_REST"],
        "newEstimatedArrivalAt": "2026-10-28T20:00:00Z",
        "createdAt": "2026-10-28T09:00:00Z"
      }
    ],
    "pageIndex": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1
  }
}
```

### EC3. Chi tiết đề xuất

UC-48 bước 2 (SCR-F3-030, side-by-side SCR-F3-UX-004).

`GET /api/v1/route-change-requests/{changeRequestId}`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route change request retrieved successfully",
  "value": {
    "changeRequestId": 61,
    "routePlanId": 301,
    "transportPlanId": 101,
    "status": "PENDING",
    "reason": "Calais BCP blocked by strike",
    "requestedBy": { "employeeId": 35, "employeeCode": "EMP-2026-035", "fullName": "Pham Hoang Nam", "role": "FLEET_ROUTE_COORDINATOR" },
    "currentSegments": [ "…mảng Segment còn lại của tuyến hiện tại…" ],
    "proposedSegments": [ "…mảng Segment đề xuất (từ backup hoặc replacementSegments)…" ],
    "backupRoutePlanId": 302,
    "comparison": {
      "distanceDeltaKm": 42.5,
      "delayMinutes": 480,
      "bcpChanged": true,
      "additional24hRest": true,
      "previousBcp": { "locationId": 31, "locationName": "Calais BCP" },
      "newBcp": { "locationId": 33, "locationName": "Dunkirk BCP" },
      "previousEta": "2026-10-28T12:00:00Z",
      "newEta": "2026-10-28T20:00:00Z"
    },
    "approvalReasons": ["BCP_CHANGED", "ADDITIONAL_24H_REST"],
    "estimatedExtraCost": 1800.00,
    "currency": "EUR",
    "note": "Dunkirk BCP pre-notified by TS",
    "decision": null,
    "createdAt": "2026-10-28T09:00:00Z",
    "updatedAt": "2026-10-28T09:00:00Z"
  }
}
```

> `"…mảng Segment …"` là chú thích rút gọn trong tài liệu; response thật trả mảng `Segment` đầy đủ.

### EC4. Manager quyết định

UC-48 bước 4–6, ALT-01, EXC-01. Atomic (R14).

`POST /api/v1/route-change-requests/{changeRequestId}/decision`

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `lastUpdatedAt` | string | Yes | |
| `decision` | string | Yes | `APPROVE` \| `REJECT` \| `EMERGENCY_RETURN` |
| `note` | string | Khi `REJECT` và `EMERGENCY_RETURN` | Chỉ đạo / lý do (≥ 10 ký tự) |

```json
{ "lastUpdatedAt": "2026-10-28T09:00:00Z", "decision": "APPROVE", "note": "Switch to Dunkirk BCP" }
```

**`200 OK`** — `APPROVE`:

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route change approved successfully",
  "value": {
    "changeRequestId": 61,
    "status": "APPROVED",
    "routePlanId": 301,
    "newEstimatedArrivalAt": "2026-10-28T20:00:00Z",
    "supersededSegmentIds": [8004, 8005],
    "newSegmentIds": [8010, 8011],
    "notified": ["TRANSPORT_SPECIALIST", "CUSTOMER", "DRIVER"],
    "extraCostRecordedForIncident": true,
    "updatedAt": "2026-10-28T09:30:00Z"
  }
}
```

Side effect khi `APPROVE`: các chặng chưa đi bị `superseded` (không xóa — C11), thêm chặng mới vào RoutePlan `ACTIVE`; cập nhật ETA; notify TS cập nhật chứng từ kiểm dịch BCP mới, Customer (lịch + vị trí mới), Driver (route mới qua SignalR/Responsive Web, có cơ chế gửi lại khi mất kết nối); ghi chi phí chênh lệch vào Incident Report (Flow 5).

`REJECT` → `status: "REJECTED"`, giữ nguyên tuyến hiện tại, notify RC để lập phương án khác.

`EMERGENCY_RETURN` (UC-48 EXC-01, Sub-incident I7): không còn tuyến hợp pháp → hệ thống tạo chặng `RETURN` về điểm xuất phát an toàn, hủy các chặng chưa đi, notify (mức `URGENT`) LM/Customer/Driver và chuyển sang quy trình incident/quyết toán tài chính khẩn cấp (Flow 5):

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Emergency return approved",
  "value": {
    "changeRequestId": 61,
    "status": "EMERGENCY_RETURN",
    "routePlanId": 301,
    "returnSegmentIds": [8020],
    "cancelledSegmentIds": [8004, 8005],
    "incidentSettlementTriggered": true,
    "updatedAt": "2026-10-28T09:30:00Z"
  }
}
```

---

## 14. Sự kiện Notification (không có endpoint)

> Xử lý ghi chú **"Thiếu nợ notification"** ở đầu file (C26). Flow 3 **không** có API inbox (thuộc Flow 8). Mỗi sự kiện dưới đây tạo `Notification` (`transport_id` = Transport của booking, `notification_type`, `priority`, `reference_type/reference_id`, `action_url`) + `AccountNotification` cho từng người nhận, và `OutboxMessage` (`EMAIL` / `SIGNALR_ACCOUNT`) — **cùng transaction** với thay đổi nghiệp vụ (R14).

| Sự kiện | Kích hoạt bởi | Người nhận | `notification_type` | Priority |
| ------- | ------------- | ---------- | ------------------- | -------- |
| `TRANSPORT_PLAN_QUOTE_ISSUED` | TP1 (`ISSUE_QUOTE`), QT3 | Customer | `TRANSPORT` | NORMAL |
| `TRANSPORT_PLAN_UPDATED` | TP4, QT2 (báo giá đã phát hành) | Customer, TS, RC | `TRANSPORT` | NORMAL |
| `PHASE1_ASSIGNED` | TP1, PS1 | TS, RC (người mới và người bị thay) | `TRANSPORT` | NORMAL |
| `ROUTE_LEGAL_REVIEW_REQUESTED` | RP1/RP4 (`SUBMIT_FOR_LEGAL_REVIEW`) | TS được phân công | `ROUTE` | HIGH |
| `ROUTE_LEGAL_REJECTED` | RP7 (`isFeasible = false`) | RC | `ROUTE` | HIGH |
| `ROUTE_PENDING_MANAGER_APPROVAL` | RP7 (`isFeasible = true`) | LM | `ROUTE` | HIGH |
| `ROUTE_APPROVED` | RP8 (`APPROVE`) | Customer ("tải lên giấy tờ pháp lý"), RC, TS, LM (mở phân công đợt 2) | `ROUTE` | HIGH |
| `ROUTE_REJECTED` | RP8 (`REJECT`) | RC | `ROUTE` | HIGH |
| `OUTSOURCING_CONFIRMED` | OS1 | RC | `ROUTE` | NORMAL |
| `PERSONNEL_ASSIGNED` / `PERSONNEL_REPLACED` | PS3 / PS4 | Driver, Escort mới/cũ; xác nhận cho Provider (email) | `ROUTE` | HIGH |
| `ROUTE_CHANGE_REQUESTED` | EC1 | LM | `ROUTE` | URGENT |
| `ROUTE_CHANGE_APPROVED` | EC4 (`APPROVE`) | TS (cập nhật chứng từ BCP), Customer, Driver | `ROUTE` | URGENT |
| `ROUTE_CHANGE_REJECTED` | EC4 (`REJECT`) | RC | `ROUTE` | HIGH |
| `EMERGENCY_RETURN` | EC4 (`EMERGENCY_RETURN`) | LM, Customer, Driver | `INCIDENT` | URGENT |

---

## 15. Mapping UC → API

| UC | API |
| -- | --- |
| UC-32 | AB1, AB2 |
| UC-33 | L1, L2, VH1, RP1, RP4, RP7 |
| UC-34 | TP1, QT2, QT3, PS1 |
| UC-35 | TP3, TP4, QT1, QT2 |
| UC-36 | PS1 (đợt 1), PS2, PS3, PS4 (đợt 2) |
| UC-37 | RP1, RP2, RP3, RP4, RP5 (CRUD route dự phòng, `routeType = BACKUP`) |
| UC-38 | RP2, RP3, RP6 |
| UC-39 | RP4 |
| UC-40 | RP5 |
| UC-41 | PV1 → PV6 |
| UC-42 | OS1 (+ `outsourcing` trong RP1/RP4) |
| UC-43 | VH1, VH2 |
| UC-44 | VH3 |
| UC-45 | VH4 |
| UC-46 | VH5 |
| UC-47 | RP7, RP8 |
| UC-48 | EC1 → EC4 |

**Tổng:** 2 lookup + 2 booking + 4 TransportPlan + 3 quotation + 4 personnel + 6 provider + 1 outsourcing + 5 vehicle + 8 route plan + 4 emergency = **39 endpoint**.

**Đối chiếu bản contract trước (đã bỏ/đổi):**

- `GET /bookings?status=APPROVED` → `GET /approved-bookings` (C14).
- `POST /transport-plans/{id}/initial-assignments` → `PUT /transport-plans/{id}/assignments/phase-1` (idempotent, giải quyết "idempotent hoặc 409").
- Provider chỉ có list/create/status → bổ sung detail, update, soft delete (UC-41 yêu cầu).
- `PATCH /route-plans/{id}/segments/{id}/personnel` đơn lẻ → thêm API giao nhiệm vụ cả route (PS3); PS4 giữ cho ALT-01.
- `restStops[]` trong segment bỏ (không lưu được trong V7, C15); thay bằng `dwellAfterMinutes` suy ra.
- Quotation: `estimatedQuotationPrice` đơn → `quotation.items[]` có tổng do server tính (C06).
- Pagination đổi sang `pageIndex/totalItems/totalPages`; `errorCode`/`errors` đưa ra ngoài `value` (đúng flow1).
- Response emergency: bỏ hai nhánh `backupRoutePlanId`/`replacementSegments` trong approval; tách thành đề xuất (EC1) và quyết định (EC4) theo UC-48 (C11).

---

## 16. Phụ lục — Đề xuất bổ sung ERD

Đề xuất tối thiểu để API ở trên implement được (đối chiếu với các conflict ở Mục 1). **Chỉ là đề xuất**, chờ team confirm.

```dbml
// C01, C02 — RoutePlan nhiều bản ghi / transport plan, thêm trạng thái
Enum route_plan_status {
  DRAFT
  PENDING_LEGAL_REVIEW
  PENDING_MANAGER_APPROVAL
  REJECTED_BY_MANAGER
  APPROVED          // = CONFIRMED hiện tại
  ACTIVE
  COMPLETED
  CANCELLED
}

Table RoutePlan {
  // route_plan_id, route_plan_code, status, total_distance_km, ...  (như V7)
  transport_plan_id bigint [not null]          // BỎ [unique]
  route_type route_type [not null, default: 'PRIMARY']    // PRIMARY | BACKUP
  primary_route_plan_id bigint                 // self FK, null với PRIMARY
  replaces_route_plan_route_id bigint          // BACKUP cho 1 chặng; null = toàn tuyến
  reason text                                  // bắt buộc với BACKUP
  approved_by_employee_id bigint               // C07
  approved_at timestamp                        // C07
  indexes { (transport_plan_id, route_type) }
}

// C03, C04, C11 — RoutePlanRoute
Table RoutePlanRoute {
  // như V7 ...
  transport_provider_id bigint                 // C03: not null ⇒ chặng thuê ngoài
  service_type varchar(100)                    // C03
  provider_reference varchar(150)              // C03 (AWB, booking ref)
  escort_employee_id bigint                    // C04: Employee role ESCORT
  superseded_at timestamp                      // C11
  superseded_by_change_request_id bigint       // C11
}

// C07 — thẩm định & phê duyệt
Table RoutePlanReview {
  route_plan_review_id bigint [pk, increment]
  route_plan_id bigint [not null]
  review_type varchar(20) [not null]           // LEGAL | MANAGER
  result varchar(20) [not null]                // FEASIBLE | NOT_FEASIBLE | APPROVED | REJECTED
  note text
  blocked_sequence_nos int[]
  reviewed_by_employee_id bigint [not null]
  reviewed_at timestamp [not null]
}

// C07 — audit append-only dùng chung (TransportPlan / RoutePlan / Vehicle / Quotation)
Table PlanAuditLog {
  plan_audit_log_id bigint [pk, increment]
  entity_type varchar(50) [not null]
  entity_id bigint [not null]
  action_type varchar(100) [not null]
  actor_account_id bigint [not null]
  reason text
  before_data jsonb
  after_data jsonb
  created_at timestamp [not null]
}

// C06 — báo giá
Table TransportQuotation {
  transport_quotation_id bigint [pk, increment]
  transport_plan_id bigint [not null, unique]
  version_no int [not null, default: 1]
  status varchar(20) [not null, default: 'DRAFT']   // DRAFT | ISSUED
  currency varchar(3) [not null]
  total_amount decimal(18,2) [not null, default: 0]
  note text
  issued_at timestamp
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table TransportQuotationItem {
  transport_quotation_item_id bigint [pk, increment]
  transport_quotation_id bigint [not null]
  category varchar(30) [not null]
  description varchar(500) [not null]
  amount decimal(18,2) [not null]
}

// C06 — đặt cọc (hoặc Booking.deposit_status)
// Invoice.invoice_type = DEPOSIT | FINAL | EMERGENCY ...

// C08 — phương án vận tải của plan
Table TransportPlanMode {
  transport_plan_id bigint [not null]
  transport_mode transport_mode [not null]
  indexes { (transport_plan_id, transport_mode) [pk] }
}

// C10 — vehicle_status
Enum vehicle_status { AVAILABLE ASSIGNED IN_USE MAINTENANCE SUSPENDED OUT_OF_SERVICE }

// C11 — đề xuất thay đổi khẩn cấp
Table RouteChangeRequest {
  route_change_request_id bigint [pk, increment]
  route_plan_id bigint [not null]
  backup_route_plan_id bigint
  status varchar(30) [not null, default: 'PENDING']   // PENDING | APPROVED | REJECTED | EMERGENCY_RETURN
  reason text [not null]
  new_estimated_arrival_at timestamp [not null]
  estimated_extra_cost decimal(18,2)
  currency varchar(3)
  proposed_segments jsonb                              // khi dùng replacementSegments
  approval_reasons varchar(200)
  requested_by_employee_id bigint [not null]
  decided_by_employee_id bigint
  decision_note text
  decided_at timestamp
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

// C13 — mỗi Transport một TransportPlan (chưa hủy)
// TransportPlan.transport_id: unique partial WHERE status <> 'CANCELLED'

// C15 — location_type thêm CONTROL_POST
// C05 — BookingEmployeeAssignment: sửa kiểu uuid → bigint hoặc loại bỏ

// C20 — partial unique index (WHERE is_deleted = false)
// TransportProvider.provider_code, tax_code; Vehicle.vehicle_code, license_plate
```

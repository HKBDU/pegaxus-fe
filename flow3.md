# API Contract — Flow 3: Lập kế hoạch lộ trình & Điều phối phương tiện

> **Căn cứ:** Physical ERD **V7** (`dbdiagram/racehorse_transport_physical_erd_final_v7.dbml`: `Transport`, `TransportPlan`, `RoutePlan`, `RoutePlanRoute`, `RoutePlanRouteVehicle`, `Location`, `Route`, `Vehicle`, `TransportProvider`, `EmployeeTransportPlan`, `Notification`, `AccountNotification`) + UC-32 → UC-48 (`use-case/use-case-details/flow3/`) + `screen/flow3-screen-inventory.md` + quy ước của `api-contract/flow1.md` và `flow2.md`.
>
> **Nguyên tắc khi UC và ERD V7 lệch nhau:** **DB V7 là nguồn chuẩn**, contract bám DB; không yêu cầu BE sửa DB trừ khi không có cách nào làm được. Chỉ các điểm còn mở mới nằm ở [Mục 1](#1-️-conflict-còn-mở-cần-team-confirm); các điểm đã chốt đã được áp dụng thẳng vào contract.
>
> **Thông báo:** Flow 3 không có endpoint thông báo. Các API ghi (PS1, PS3, PS4, PS5, RP1, RP4, RP7, OS1, TP4, EC1–EC4…) phải tự gọi `NotificationService.Queue` cho từng người nhận, `SaveChanges` cùng transaction, rồi `FlushAsync` (đẩy SignalR) sau khi commit; cơ chế đầy đủ, người nhận, loại và mức ưu tiên xem [bảng Thông báo](#thông-báo-mà-be-tự-ghi-trong-các-api-không-có-endpoint--be-đọc-trước) ngay bên dưới.

## Field BE tính khi trả response (không lưu DB) — BE đọc trước

Các field dưới đây **không có cột trong DB V7**; BE tính từ các bảng có sẵn mỗi lần trả response. Cột "Công thức" là đề xuất, BE xác nhận trước khi implement. Nếu BE không muốn tính field nào thì báo lại để contract bỏ field đó và FE tự suy ra.

| Field (API)                                                                  | Công thức                                                                                                                                                                                                     | Bảng nguồn                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `isInternational` (AB1, AB2, TP3)                                            | `Booking.origin_country ≠ Booking.destination_country`                                                                                                                                                        | `Booking`                                                                        |
| `transportId`, `transportPlan`, `routePlan`, `complianceDossier` (AB1, AB2)  | Nối `Booking → Transport → TransportPlan → RoutePlan`, `ComplianceDossier` theo `transport_id`. `routePlan` là RoutePlan **chính** chưa hủy (mọi chặng `PRIMARY`, `status ≠ CANCELLED`); `null` nếu chưa có   | `Transport`, `TransportPlan`, `RoutePlan`, `RoutePlanRoute`, `ComplianceDossier` |
| `hasTransportPlan`, `hasRoutePlan`, `hasComplianceDossier` (bộ lọc AB1)      | `true` nếu bản ghi tương ứng tồn tại (RoutePlan: chính chưa hủy)                                                                                                                                              | như trên                                                                         |
| `assignedEmployees` (TP3)                                                    | Các dòng `EmployeeTransportPlan` của plan nối `Employee`; `responsibility` = `employee_role`                                                                                                                  | `EmployeeTransportPlan`, `Employee`                                              |
| `routeType` (RoutePlan, RP2, RP3)                                            | Mọi chặng `PRIMARY` → `PRIMARY`; có chặng `BACKUP` → `BACKUP`; có chặng `RETURN` → `RETURN`                                                                                                                   | `RoutePlanRoute.route_type`                                                      |
| `isCrossBorder` (RoutePlan)                                                  | Có ít nhất một chặng mà `fromLocation.country ≠ toLocation.country`                                                                                                                                           | `RoutePlanRoute`, `Route`, `Location`                                            |
| `totalDistanceKm`, `estimatedDurationMinutes` (RoutePlan)                    | `totalDistanceKm` = tổng `Route.distance_km` các chặng; `estimatedDurationMinutes` = `planned_arrival_at` chặng cuối − `planned_departure_at` chặng đầu (phút). Ghi vào cột có sẵn của `RoutePlan` khi lưu    | `Route`, `RoutePlanRoute`, `RoutePlan`                                           |
| `plannedDepartureAt`, `plannedArrivalAt` (RoutePlan)                         | `planned_departure_at` chặng đầu / `planned_arrival_at` chặng cuối                                                                                                                                            | `RoutePlanRoute`                                                                 |
| `replacesSequenceNo` (RoutePlan BACKUP) | Tìm chặng primary có `fromLocation` = `fromLocation` của chặng đầu backup (→ `from`) và chặng primary có `toLocation` = `toLocation` của chặng cuối backup, ở sau hoặc cùng chặng đó (→ `to`); không khớp thì từ chối ngay khi lưu (R16) | `RoutePlanRoute`, `Location` |
| `segment.status` (Segment)                                                   | `actual_departure_at` null → `PENDING`; có `actual_departure_at`, chưa có `actual_arrival_at` → `IN_PROGRESS`; có `actual_arrival_at` → `COMPLETED`                                                           | `RoutePlanRoute`                                                                 |
| `segment.dwellAfterMinutes`                                                  | `planned_departure_at` chặng kế − `planned_arrival_at` chặng này (phút); `null` ở chặng cuối                                                                                                                  | `RoutePlanRoute`                                                                 |
| `segment.isOutsourced`                                                       | `transport_provider_id IS NOT NULL`                                                                                                                                                                           | `RoutePlanRoute`                                                                 |
| `segment.vehicles`                                                           | Các `Vehicle` gán cho chặng                                                                                                                                                                                   | `RoutePlanRouteVehicle`, `Vehicle`                                               |
| `isPersonnelComplete` (RoutePlan)                                            | Mọi chặng **nội bộ** (`transport_provider_id IS NULL`) có cả `driver_employee_id` và `escort_employee_id`                                                                                                     | `RoutePlanRoute`                                                                 |
| `phase2.enabled`, `personnelAssignmentPhase2Enabled` (PS2, RP7)              | RoutePlan chính (`routeType = PRIMARY`) có `status ∈ {CONFIRMED, ACTIVE}`                                                                                                                                     | `RoutePlan`                                                                      |
| `customerUploadEnabled` (RP7)                                                | `ComplianceDossier.status ≠ DRAFT` (sau RP7 khả thi là `IN_PREPARATION`); luôn `false` với RoutePlan `RETURN` (Customer không nộp thêm)                                                                       | `ComplianceDossier`                                                              |
| `phase1.isAssigned`, `phase1.isLocked`, `phase2.segments[].isComplete` (PS2) | `isAssigned`: plan có dòng `EmployeeTransportPlan` cho cả TS và RC. `isLocked` = `phase2.enabled`. `isComplete`: chặng thuê ngoài, hoặc đã có Driver và Escort                                                | `EmployeeTransportPlan`, `RoutePlanRoute`                                        |
| `legalReview` (RP3, RP7)                                                     | Lấy từ dòng `AuditDossier` mới nhất của CDos có `action_type` là thẩm định lộ trình: `reviewedBy`/`reviewedAt` = `actor_account_id`/`created_at`; `isFeasible`, `note`, `blockedSegments` ở `details` (jsonb) | `AuditDossier`                                                                   |
| `registrationStatus`, `insuranceStatus` (Vehicle)                            | Ngày hết hạn `≤` hôm nay → `EXPIRED`; còn `< 7` ngày → `EXPIRING_SOON`; còn lại `VALID`; ngày hết hạn `null` → `VALID`                                                                                        | `Vehicle.registration_expiry_date`, `insurance_expiry_date`                      |
| `warnings` (Vehicle)                                                         | Từ hai trạng thái trên: `REGISTRATION_EXPIRED`, `REGISTRATION_EXPIRING_SOON`, `INSURANCE_EXPIRED`, `INSURANCE_EXPIRING_SOON`                                                                                  | như trên                                                                         |
| `isAvailable` (Vehicle, VH1 khi có `availableFrom/To`)                       | `status ∈ {AVAILABLE, ASSIGNED}`, không chồng lịch với chặng khác trong khoảng, đăng kiểm/bảo hiểm chưa hết hạn                                                                                               | `Vehicle`, `RoutePlanRouteVehicle`, `RoutePlanRoute`                             |
| `upcomingAssignments` (VH2)                                                  | Các chặng gán cho xe thuộc RoutePlan `status ∉ {CANCELLED, COMPLETED}` và `planned_arrival_at ≥` hôm nay                                                                                                      | `RoutePlanRouteVehicle`, `RoutePlanRoute`, `RoutePlan`, `TransportPlan`          |
| `supportedModes` (Provider)                                                  | Mảng ↔ chuỗi CSV `supported_modes` (`"AIR,ROAD"`)                                                                                                                                                             | `TransportProvider`                                                              |
| Danh sách PS6 (Driver/Escort chỉ trả người rảnh)                             | Loại nhân viên có chặng `RoutePlanRoute` (RoutePlan `CONFIRMED`/`ACTIVE`) giao với khoảng `availableFrom`–`availableTo` (theo `driver_employee_id` hoặc `escort_employee_id`)                                 | `Employee`, `RoutePlanRoute`, `RoutePlan`                                        |

## Thông báo mà BE tự ghi trong các API (không có endpoint) — BE đọc trước

Theo cơ chế SignalR của BE (`SIGNALR_NOTIFICATION.md`): mọi thông báo của Flow 3 là **persistent notification** (người dùng xem lại được trong inbox kể cả khi offline). Flow 3 không có endpoint thông báo; các API ghi dưới đây tự phát thông báo như sau:

1. Xác định `AccountId` của từng người nhận (`Employee.account_id`, `Customer.account_id`); **mỗi người nhận một lần** gọi `NotificationService.Queue(...)`.
2. Truyền đủ `Type`, `Priority`, `Title`, `Message`, `ReferenceType`, `ReferenceId`, `ActionUrl`.
3. `SaveChangesAsync` lưu cùng lúc dữ liệu nghiệp vụ, `Notification` và `AccountNotification` (cùng transaction, R14).
4. **Chỉ sau khi commit thành công** mới gọi `FlushAsync` để đẩy SignalR (`ReceiveNotification`). Lỗi nghiệp vụ/`SaveChanges` thất bại thì không đẩy. Người nhận offline thì bản ghi vẫn ở `PENDING`.
5. Không gọi `IHubContext` trực tiếp trong business service; không dùng `Clients.All`.

Phía FE (Flow 8, không thuộc Flow 3): giữ một kết nối SignalR `/hubs/notifications`, nhận `ReceiveNotification`, gửi `AcknowledgeDelivered`, và dùng REST `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`. Flow 3 chỉ cần `ActionUrl` mở đúng trang.

Bảng chỉ dùng enum có sẵn của DB (`notification_type`, `priority`), không có tên sự kiện riêng. `Title`/`Message` do BE viết (cột "Title gợi ý" chỉ là ví dụ). `ReferenceType` dùng tên entity (như ví dụ `ComplianceDossier` của BE): `TransportPlan` hoặc `RoutePlan`; `ReferenceId` là uuid của entity đó. Cột "Nguồn": UC nào nêu thông báo này; "Ngoài UC" là phần UC không nói rõ nhưng đã được thống nhất.

| API gây ra | Người nhận | `Type` | `Priority` | Title gợi ý | `ReferenceType` | `ActionUrl` | Nguồn |
| ---------- | ---------- | ------ | ---------- | ----------- | --------------- | ----------- | ----- |
| TP4 (sửa TransportPlan) | TS, RC (nếu đã được phân công) | `TRANSPORT` | `NORMAL` | Transport plan updated | `TransportPlan` | `/admin/transport-plans/{transportPlanId}` | UC-35 bước 7 |
| TP4 | Customer | `TRANSPORT` | `NORMAL` | Transport plan updated | `TransportPlan` | trang của Flow 1 | UC-35 bước 7 |
| PS1 (phân công đợt 1) | TS, RC | `TRANSPORT` | `NORMAL` | You have been assigned to a transport | `TransportPlan` | `/admin/approved-bookings/{bookingId}` | UC-36 bước 4 |
| PS5 (đổi TS/RC đợt 1) | TS, RC (người mới và người bị thay) | `TRANSPORT` | `NORMAL` | Transport assignment changed | `TransportPlan` | `/admin/approved-bookings/{bookingId}` | Ngoài UC (UC-36 ALT-01 chỉ nêu đổi tài xế) |
| RP1 / RP4 với `SUBMIT_FOR_LEGAL_REVIEW` | TS được phân công | `ROUTE` | `HIGH` | Route plan waiting for legal review | `RoutePlan` | `/admin/route-plans/{routePlanId}` | UC-33 bước 6, UC-39 bước 6, UC-37 bước 7. RETURN: chỉ sau khi LM duyệt ở EC2 |
| RP7 với `isFeasible = false` | RC | `ROUTE` | `HIGH` | Route plan rejected by Transport Specialist | `RoutePlan` | `/admin/route-plans/{routePlanId}` | UC-33 ALT-01 bước 2 |
| RP7 với `isFeasible = true` (PRIMARY, BACKUP) | Customer | `ROUTE` | `HIGH` | Route confirmed, please upload legal documents | `RoutePlan` | trang của Flow 2 | UC-47 bước 6 (UC-47 đã bỏ, chuyển hiệu ứng sang RP7). RETURN: không gửi (Customer không nộp thêm) |
| RP7 với `isFeasible = true` | RC | `ROUTE` | `HIGH` | Route confirmed | `RoutePlan` | `/admin/route-plans/{routePlanId}` | Ngoài UC |
| RP7 với `isFeasible = true` (PRIMARY, BACKUP) | LM | `ROUTE` | `HIGH` | Route confirmed, ready for driver and escort assignment | `RoutePlan` | `/admin/personnel-assignment/{transportPlanId}` | Ngoài UC (UC-33 bước 8 nói mở phân công đợt 2, không nói thông báo) |
| RP7 với `isFeasible = true` (RETURN) | LM | `ROUTE` | `HIGH` | Return route confirmed, please assign vehicles and activate | `RoutePlan` | `/admin/route-plans/{routePlanId}` | Luồng RETURN (mục 12.2 bước 4) |
| OS1 (gán thuê ngoài) | RC | `ROUTE` | `NORMAL` | Segment outsourced to a transport provider | `RoutePlan` | `/admin/route-plans/{routePlanId}` | UC-42 bước 9 |
| PS3 (phân công đợt 2) | Driver, Escort | `ROUTE` | `HIGH` | You have been assigned to a route | `RoutePlan` | trang của Flow 4 | UC-36 bước 9 |
| PS4 (đổi Driver/Escort một chặng) | Driver/Escort mới | `ROUTE` | `HIGH` | You have been assigned to a route | `RoutePlan` | trang của Flow 4 | UC-36 ALT-01 bước 4 |
| PS4 | Driver/Escort cũ | `ROUTE` | `NORMAL` | You have been removed from a route | `RoutePlan` | trang của Flow 4 | Ngoài UC |
| RP1 với `routeType = RETURN` | LM | `ROUTE` | `URGENT` | Emergency return request | `RoutePlan` | `/admin/route-plans/{routePlanId}` | Luồng RETURN (mục 12.2 bước 1) |
| EC1 (RC gửi yêu cầu bật BACKUP) | LM | `ROUTE` | `URGENT` | Route change request | `RoutePlan` | `/admin/route-plans/{routePlanId}` | Ngoài UC (UC-48 chỉ nói LM nhận cảnh báo sự cố UC-57) |
| EC2 `APPROVE` (BACKUP) | RC | `ROUTE` | `HIGH` | Route change approved | `RoutePlan` | `/admin/route-plans/{routePlanId}` | Ngoài UC (UC-48 bước 5 liệt kê TS; bỏ vì giấy tờ BACKUP đã soạn từ đầu) |
| EC2 `APPROVE` (RETURN) | TS | `ROUTE` | `HIGH` | Return route approved, please supplement the compliance dossier | `RoutePlan` | `/admin/route-plans/{routePlanId}` | Luồng RETURN (mục 12.2 bước 2) |
| EC2 `APPROVE` (RETURN) | RC | `ROUTE` | `HIGH` | Return route approved, please finalize the route | `RoutePlan` | `/admin/route-plans/{routePlanId}` | Luồng RETURN (mục 12.2 bước 2) |
| EC2 `APPROVE` (BACKUP) | Customer, Driver | `ROUTE` | `URGENT` | Route changed during transit | `RoutePlan` | trang của Flow 1 / Flow 4 | UC-48 bước 5 |
| EC2 `REJECT` (BACKUP, RETURN) | RC | `ROUTE` | `HIGH` | Route change request rejected | `RoutePlan` | `/admin/route-plans/{routePlanId}` | UC-48 ALT-01 bước 3 |
| EC3 | Customer | `ROUTE` | `URGENT` | Return route applied | `RoutePlan` | trang của Flow 1 | Luồng RETURN (mục 12.2 bước 5) |
| EC3 | RC | `ROUTE` | `HIGH` | Return route activated | `RoutePlan` | `/admin/route-plans/{routePlanId}` | Luồng RETURN (mục 12.2 bước 5) |
| EC4 | Driver | `ROUTE` | `URGENT` | Return route is ready, start returning | `RoutePlan` | trang của Flow 4 | Luồng RETURN (mục 12.2 bước 6) |

**Provider thuê ngoài không nhận thông báo:** hệ thống không quản lý bên thứ 3 (ngoài phạm vi), nên không gửi gì cho Provider dù UC-36 bước 9 và UC-42 bước 9 có nhắc "xác nhận cho Provider".

---
## ⚠️ Thay đổi ở Flow 2 mà BE Flow 3 cần biết (đọc trước)

Apply Template giờ áp dụng cho **Transport / TransportPlan** do LM đã lập, không áp dụng theo Booking nữa. **D1 vẫn nhận `bookingId`; chỉ D2 đổi sang `transportId`** (DB: `ComplianceDossier.transport_id` unique, 1-1 với `Transport`; `TransportPlan.transport_id` trỏ về `Transport`). Body, response và quy tắc khác của D1/D2 giữ nguyên. Đã sửa tương ứng trong `flow2.md`.

| #   | Trước                                           | Sau                                                 | Role |
| --- | ----------------------------------------------- | --------------------------------------------------- | ---- |
| D2  | `POST /bookings/{bookingId}/compliance-dossier` | `POST /transports/{transportId}/compliance-dossier` | TS   |

- **Lấy `transportId` ở đâu cho D2:** `GET /bookings/approved` (AB1), `GET /bookings/approved/{bookingId}` (AB2) và `GET /transport-plans/{id}` (TP3) đều trả `transportId`.
- **D2 (Apply Template, tạo CDos `DRAFT`):** chỉ khi `TransportPlan` của Transport đó `APPROVED` (khách đã đồng ý/cọc) và TS đang gọi là người được LM phân công đợt 1; chưa cọc → `422 DEPOSIT_REQUIRED`, không được phân công → `403 FORBIDDEN`.
- **D1:** trả `404` khi Transport chưa có CDos. Customer chỉ thấy CDos khi `status ≠ DRAFT` (CDos `DRAFT` ẩn với Customer).
- **D1 không cần `transportId`:** Customer/TS/LM dùng `bookingId` để xem CDos; Flow 3 chỉ cung cấp `transportId` cho D2 và các tác vụ TransportPlan.
- API Flow 2 khác nhận `bookingId` (ví dụ `bookingId` làm query gợi ý template ở T1, đồng bộ nội bộ D2I) giữ nguyên.

## Mục lục

- [Field BE tính khi trả response (không lưu DB)](#field-be-tính-khi-trả-response-không-lưu-db--be-đọc-trước)
- [Thông báo mà BE tự ghi trong các API](#thông-báo-mà-be-tự-ghi-trong-các-api-không-có-endpoint--be-đọc-trước)
- [0. Quy ước chung](#0-quy-ước-chung)
- [1. ⚠️ Conflict còn mở](#1-️-conflict-còn-mở-cần-team-confirm)
- [2. Quy tắc nghiệp vụ & state machine](#2-quy-tắc-nghiệp-vụ--state-machine)
- [3. Object dùng chung](#3-object-dùng-chung)
- [4. Location & Route master, Map](#4-location--route-master-map)
- [5. Booking đã duyệt (UC-32)](#5-booking-đã-duyệt-uc-32)
- [6. Transport Plan (UC-34, UC-35)](#6-transport-plan-uc-34-uc-35)
- [7. Transport Provider (UC-41) & thuê ngoài (UC-42)](#7-transport-provider-uc-41--thuê-ngoài-uc-42)
- [8. Vehicle (UC-43 → UC-46)](#8-vehicle-uc-43--uc-46)
- [9. Route Plan (UC-33, UC-37 → UC-40)](#9-route-plan-uc-33-uc-37--uc-40)
- [10. Xác nhận pháp lý của TS (UC-33, UC-39)](#10-xác-nhận-pháp-lý-của-ts-uc-33-uc-39)
- [11. Phân công nhân sự (UC-36)](#11-phân-công-nhân-sự-uc-36)
- [12. Thay đổi lộ trình khẩn cấp (UC-48)](#12-thay-đổi-lộ-trình-khẩn-cấp-uc-48)
- [13. Mapping UC → API](#13-mapping-uc--api)

---

## 0. Quy ước chung

Kế thừa `api-contract/flow1.md` và `flow2.md`: Base URL `/api/v1`, ID `uuid` (toàn bộ ID là uuid; cột `bigint` trong file `.dbml` V7 là sót, BE sẽ đổi), timestamp ISO 8601 UTC, ngày `YYYY-MM-DD`, field camelCase bám tên cột ERD, tất cả endpoint 🔒 `Authorization: Bearer <accessToken>`.

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
  "errors": [
    {
      "field": "segments[1]",
      "message": "Driving time 5h 20m exceeds 4.5h without a rest stop of at least 45 minutes"
    }
  ],
  "value": null
}
```

**Phân trang:** query `pageIndex`, `pageSize`, `sortBy` (dạng `createdAt:desc`); response `items`, `pageIndex`, `pageSize`, `totalItems`, `totalPages`. Danh sách rỗng trả `200` với `items: []`, không trả `404`.

**Chống ghi đè (optimistic locking):** API sửa gửi `lastUpdatedAt` (giá trị `updatedAt` FE đang giữ), giống B5 của flow1. Lệch → `409 *_MODIFIED`. Response ghi trả `updatedAt` mới.

**Lỗi chung** (không lặp lại ở từng API):

| HTTP | errorCode          | Khi nào                                                                                       |
| ---- | ------------------ | --------------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR` | Thiếu field bắt buộc / sai kiểu / sai khoảng giá trị; `errors[]` liệt kê `{ field, message }` |
| 401  | `UNAUTHORIZED`     | Token sai hoặc hết hạn                                                                        |
| 403  | `FORBIDDEN`        | Sai role, hoặc RC/TS/Driver/Escort không được phân công vào Transport Plan đó                 |
| 500  | `SYSTEM_ERROR`     | Lỗi hệ thống                                                                                  |

**Quy ước HTTP cho lỗi nghiệp vụ** (theo tiền lệ flow1: `422 BOOKING_HAS_NO_HORSE`): `404` không tìm thấy · `409` xung đột trạng thái / trùng dữ liệu / bị khóa / bị sửa trước · `422` vi phạm quy tắc nghiệp vụ (đặt cọc, nghỉ ngơi, sức chứa, pháp lý…).

**Actor viết tắt:** `LM` = Logistics Manager, `RC` = Fleet & Route Coordinator, `TS` = Transport Specialist, `DRV` = Driver, `ESC` = Escort, `CUS` = Customer.

**Mã tự sinh (BR-016):** `planCode = TP-YYYYMMDD-XXXX`; `routePlanCode = RP-YYYYMMDD-XXXX` (C21: BR-016 chưa quy định mã RoutePlan, đây là đề xuất); `XXXX` 4 chữ số, unique, retry tối đa 20 lần. Mã do server sinh, client không gửi.

**Bỏ qua trong contract này:** không trả `statusName` (FE tự map nhãn hiển thị); không có API/bảng audit cho TransportPlan, RoutePlan, Vehicle (DB V7 chưa có, xem cuối Mục 1).

---

## 1. ⚠️ Conflict còn mở cần team confirm

> **Nguyên tắc:** DB V7 (`dbdiagram/racehorse_transport_physical_erd_final_v7.dbml`) là nguồn chuẩn; contract bám DB và chỉ ghi vào đây những điểm **thật sự không làm được** nếu giữ nguyên DB, hoặc còn chưa thống nhất. Các điểm đã chốt đã được xóa khỏi bảng và áp dụng thẳng vào contract. ID của toàn bộ bảng là `uuid` (cột `bigint` trong file `.dbml` là sót, BE sẽ đổi).
>
> **Ngoài phạm vi Flow 3:** luồng này chưa có việc Customer đồng ý báo giá và đặt cọc (thuộc Flow 6). Flow 3 chỉ giả định `TransportPlan.status = APPROVED`; khi dev/test thì **mock hoặc seed** giá trị này để đi tiếp các bước sau (tạo RoutePlan, phân công đợt 1). Không có API nào ở Flow 3 đặt giá trị này.

| ID         | Vấn đề                                                                                                                                                                                                                                                                                    | Ảnh hưởng                                                           | Đề xuất (contract đang dùng)                                                                                                                                                                                                         | Xác nhận |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 🔴 **C05** | **Hai nơi lưu phân công đợt 1.** V7 có `BookingEmployeeAssignment` (giao TS/RC theo Booking, có `status ACTIVE/REVOKED`) và `EmployeeTransportPlan` (UC-34/36, Flow 2 R13). Unique `(booking_id, assignment_role)` không lọc `status = ACTIVE` nên không giữ được lịch sử khi thay người. | PS1, PS5, PS2                                                       | Contract chỉ ghi `EmployeeTransportPlan`. Cần BE chốt bỏ hay dùng `BookingEmployeeAssignment` làm lịch sử (partial unique `WHERE status = 'ACTIVE'`).                                                                                | ☐        |
| 🟡 **C29** | **Ai chuyển `Transport` sang `READY`.** V7 có `transport_status = CREATED/PLANNING/READY`, UC không nói ai chuyển.                                                                                                                                                                        | TP1, PS3                                                            | `CREATED → PLANNING` khi tạo TransportPlan; `→ READY` do BE tự chuyển khi RoutePlan `PRIMARY` `CONFIRMED` và mọi chặng nội bộ đã có Driver + Escort. `IN_TRANSIT/COMPLETED` do Flow 4.                                               | ☐        |
| ⚪ **C25** | **Đổi trạng thái xe đang `ASSIGNED`.** `ASSIGNED` là giá trị toàn cục nhưng gán xe theo khoảng thời gian; UC-46 chỉ chặn xe đang chạy.                                                                                                                                                    | VH5                                                                 | Chặn cả `ASSIGNED` và `IN_USE` bằng `409 VEHICLE_STATUS_LOCKED`.                                                                                                                                                                     | ☐        |
| ⚪ **C20** | `TransportProvider.tax_code` chưa unique; `provider_code`, `vehicle_code`, `license_plate` unique cả bản đã xóa mềm (UC chỉ cần unique trên bản chưa xóa); `supported_modes varchar(100)` là chuỗi CSV.                                                                                   | PV3, PV4, VH3, VH4                                                  | Kiểm tra unique trên bản chưa xóa; `supportedModes` là mảng, lưu CSV `"AIR,ROAD"`. Đề xuất partial unique index.                                                                                                                     | ☐        |
| ⚪ **C21** | RoutePlan chưa có quy ước mã; flow1 ví dụ booking `BK-…` còn BR-016 dùng `REQ-…`; flow1 B9 ví dụ `transportCode` dùng tiền tố `TP-` trùng `TP-` của TransportPlan.                                                                                                                        | RP1, AB1                                                            | Dùng `RP-…`, `REQ-…`, và `TR-…` cho `transportCode`.                                                                                                                                                                                 | ☐        |
| ⚪ **C22** | UC-35 AC-002 yêu cầu `400` khi sửa plan đang `IN_TRANSIT`.                                                                                                                                                                                                                                | TP4                                                                 | Dùng `409 PLAN_LOCKED` cho nhất quán quy ước mục 0.                                                                                                                                                                                  | ☐        |

### Conflict còn mở: API, use case và FE owner liên quan

Cột FE owner là người làm màn hình liên quan.

| ID | API bị ảnh hưởng | Use case | FE owner (màn hình) | Có chặn code không |
| -- | ---------------- | -------- | ------------------- | ------------------ |
| **C05** | PS1, PS5, PS2 | UC-36 (đợt 1) | Uyên (`SCR-F3-015`, `016`) | Không. Contract chỉ ghi `EmployeeTransportPlan` |
| **C29** | TP1, PS3 | UC-34, UC-36 | Chỉ BE (không có màn hình) | Không. BE tự chuyển `Transport` sang `READY` |
| **C25** | VH5 | UC-46 | Uyên (`SCR-F3-027`) | Không. Mặc định chặn xe `ASSIGNED`/`IN_USE` bằng `409 VEHICLE_STATUS_LOCKED` |
| **C20** | PV3, PV4, VH3, VH4 | UC-41, UC-44, UC-45 | Uyên (`SCR-F3-021`, `025`, `026`) | Không. Chỉ là cách BE kiểm tra trùng mã (unique trên bản ghi chưa xóa) |
| **C21** | RP1, AB1 | UC-33, UC-32 | — | Không. Chỉ là quy ước đặt mã `RP-`, `TR-` |
| **C22** | TP4 | UC-35 | Dương (`SCR-F3-006`) | Không. FE rẽ nhánh theo `errorCode` nên `409` hay `400` không ảnh hưởng |

### Tài liệu khác cần cập nhật theo DB (không phải conflict của contract)

| Tài liệu                                                 | Nội dung cũ cần sửa                                                                                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UC-34, UC-35, screen `SCR-F3-004/007`                    | UC đã bỏ báo giá, nhưng screen còn biểu mẫu báo giá và `QUOTED_PENDING_DEPOSIT`. Contract không có API báo giá.                                                    |
| UC-42                                                    | Còn `service_type`; DB chỉ có `transport_provider_id` và `note` trên `RoutePlanRoute`. Contract chỉ dùng `note` (ghi số chuyến bay/AWB vào `note`). |
| UC-37, UC-38, screen `SCR-F3-013/014`                    | Còn `is_contingency`, `CONTINGENCY`, phạm vi "1 chặng cụ thể". DB chỉ có `RoutePlanRoute.route_type = PRIMARY/BACKUP/RETURN`.                                      |
| UC-47, `SCR-F3-028/029`, mục #49, menu "Route Approvals" | Đã bỏ: `CONFIRMED` do TS xác nhận thay cho bước Manager duyệt. UC-39 bước 7 còn nhắc "trình LM (UC-47)".                                                           |
| UC-43/46 và screen xe                                    | Còn `IN_TRANSIT`, `SUSPENDED`, `OUT_OF_SERVICE`; DB là `IN_USE`, `INACTIVE`.                                                                                       |
| UC-35/40/46 (audit)                                      | UC yêu cầu ghi audit nhưng DB chưa có bảng audit cho TransportPlan/RoutePlan/Vehicle; contract **không** có API/ghi audit cho các thực thể này (chỉ `updated_at`). |

---

## 2. Quy tắc nghiệp vụ & state machine

### 2.0. Luồng tổng thể (đã chốt)

```text
Booking APPROVED → sinh Transport
  ↓
LM tạo TransportPlan                                              [TP1]            → TransportPlan DRAFT
  ↓
Customer đồng ý và đặt cọc                                        [ngoài Flow 3]   → TransportPlan APPROVED (giả định, xem Mục 1)
  ↓
LM phân công đợt 1: TS + RC                                       [PS1]            (chỉ sau khi APPROVED)
  ├─ TS: Apply Dossier Template cho TransportPlan → tạo CDos thật  [Flow 2 D2]      → CDos DRAFT
  └─ RC: lập RoutePlan PRIMARY (và BACKUP nếu cần)                [RP1]            → RoutePlan DRAFT
  ↓
TS thẩm định rồi chuyển CDos sang IN_PREPARATION                  [RP7]
  ├─ khả thi:   CDos DRAFT → IN_PREPARATION (CDos chuyển trước), kéo theo RoutePlan tự DRAFT → CONFIRMED
  └─ không khả thi: CDos và RoutePlan giữ DRAFT, RC sửa lộ trình
  ↓
LM phân công đợt 2: Driver + Escort theo chặng                    [PS3, PS4]       (chỉ khi RoutePlan PRIMARY CONFIRMED)
```

LM không duyệt RoutePlan. TS và RC chỉ được phân công **sau khi** `TransportPlan.status = APPROVED`, nên TS Apply Template và RC lập RoutePlan đều cần trạng thái này. Flow 3 chỉ **đọc** `PENDING/APPROVED`; không có API báo giá, đặt cọc hay đồng ý của Customer.

### 2.1. Enum

Mọi enum dùng **đúng giá trị V7**. Các giá trị chỉ suy ra (chặng thuê ngoài hay nội bộ, đã đủ nhân sự chưa, chuyến quốc tế hay nội địa, hết hạn đăng kiểm hay chưa, loại RoutePlan, trạng thái chặng) được trả bằng boolean/timestamp hoặc giá trị suy ra, không lưu thêm cột.

| Enum                  | Giá trị                                                       | Ghi chú                                                                                                             |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `TransportPlanStatus` | `DRAFT, PENDING, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED` | Flow 3 chỉ tạo `DRAFT`. `PENDING → APPROVED` do luồng đặt cọc (ngoài Flow 3)                                        |
| `RoutePlanStatus`     | `DRAFT, CONFIRMED, ACTIVE, COMPLETED, CANCELLED`              | `CONFIRMED` = TS xác nhận khả thi pháp lý; từ đây mở upload giấy tờ cho Customer và phân công đợt 2                 |
| `RouteType`           | `PRIMARY, BACKUP, RETURN`                                     | Chỉ lưu ở `RoutePlanRoute.route_type` (cấp chặng). `RoutePlan` **không có** cột loại: suy ra từ các chặng (xem R11) |
| `TransportMode`       | `ROAD, SEA, AIR`                                              |                                                                                                                     |
| `VehicleStatus`       | `AVAILABLE, ASSIGNED, IN_USE, MAINTENANCE, INACTIVE`          | Đổi thủ công chỉ `AVAILABLE`, `MAINTENANCE`, `INACTIVE`; `ASSIGNED`, `IN_USE` do hệ thống                           |
| `ProviderStatus`      | `ACTIVE, INACTIVE, SUSPENDED`                                 |                                                                                                                     |

### 2.2. State machine RoutePlan

```text
          SAVE_DRAFT (không báo TS) / SUBMIT_FOR_LEGAL_REVIEW (route vẫn DRAFT, notify TS)
   (tạo) ─────────────────────────────────────────────► DRAFT ◄───────────┐
                                                           │               │ RC sửa & lưu (RP4)
                                                           │ TS: FEASIBLE  │ TS: NOT_FEASIBLE
                                                           ▼               │ (kèm lý do, notify RC; route giữ DRAFT)
                                                       CONFIRMED ──(Flow 4 khởi hành)──► ACTIVE ──► COMPLETED

   Hủy (UC-40): chỉ từ DRAFT ─► CANCELLED
```

`CONFIRMED` = TS xác nhận "xin được hết" (kèm chuyển `ComplianceDossier` `DRAFT → IN_PREPARATION`). Từ `CONFIRMED`: mở upload giấy tờ cho Customer, mở phân công đợt 2 (Driver + Escort), notify LM. **Sau `CONFIRMED` không có API nào sửa chặng, provider hay xe của RoutePlan đó** (đổi khi đang chạy: UC-48, mục 12). Không còn trạng thái chờ Manager duyệt.

Khi RC **tạo mới một RoutePlan `BACKUP`** (RP1), `ComplianceDossier` đang `IN_PREPARATION` được đưa **về `DRAFT`** trong cùng transaction để TS thẩm định lại (RP7). RP7 khả thi sẽ đưa CDos `DRAFT → IN_PREPARATION` và RoutePlan được thẩm định `DRAFT → CONFIRMED`. Customer chỉ thấy CDos khi `status ≠ DRAFT` (Flow 2). Nếu CDos đã qua `IN_PREPARATION` (`READY_FOR_SUBMISSION`, `SUBMITTED`…) thì không tạo thêm backup được → `409 DOSSIER_LOCKED`.

**RETURN** (giữa đường, CDos đã `APPROVED`) đi theo luồng riêng ở [mục 12.2](#122-return-quay-đầu-khẩn-cấp-uc-48-exc-01): RP1 **không** đổi CDos; LM duyệt ở EC2 mới đưa CDos `APPROVED → DRAFT`; RP7 (khả thi) đưa CDos `DRAFT → IN_PREPARATION` rồi tự chạy tới `APPROVED` (Customer không nộp thêm) và RoutePlan `→ CONFIRMED`; EC3 kích hoạt `CONFIRMED → ACTIVE`.

### 2.3. Quy tắc

| #   | Quy tắc                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | **Phân quyền:** LM: UC-32, 34, 35, 36, 41, 42, 43–46, 48 và UC-37 (backup), EC3. RC: UC-32, 33, 37–40, 43–46, RETURN (RP1), EC1, EC4 và CRUD Location/Route master (LOC3–5, ROT3–5). TS: xem Route Plan + RP7. Server luôn kiểm tra role; RC/TS chỉ truy cập Transport Plan mình được phân công (`EmployeeTransportPlan`), LM xem tất cả.                                                                          |
| R2  | **Điều kiện lập plan:** `Booking.status = APPROVED` và đã có `Transport` (R12 flow1). Mỗi Booking chỉ có **1 TransportPlan chưa hủy** (UC-34 EXC-01).                                                                                                                                                                                                                                      |
| R3  | **Cổng đặt cọc (UC-33):** tạo RoutePlan chỉ khi `TransportPlan.status = APPROVED`. Chưa đạt → `422 DEPOSIT_REQUIRED`.                                                                                                                                                                                                                                                                      |
| R4  | **Phân công 2 đợt (UC-36):** Đợt 1 (TS + RC) chỉ gán khi `TransportPlan.status = APPROVED`; không gán lúc tạo TransportPlan. Đợt 2 (Driver + Escort theo chặng) chỉ khi RoutePlan **PRIMARY** `CONFIRMED`. Chặng thuê ngoài **không** nhận Driver/Escort.                                                                                                                                  |
| R5  | **Chặng liên tục:** chặng `i+1` phải bắt đầu tại nơi chặng `i` kết thúc (`fromLocationId[i+1] = toLocationId[i]`), `plannedDepartureAt[i+1] ≥ plannedArrivalAt[i]`, `sequenceNo` liền từ 1 (mỗi RoutePlan có `sequence_no` riêng).                                                                                                                                                         |
| R6  | **BR-033 (ROAD):** thời gian lái liên tục ≤ 8 giờ; sau mỗi 4–4,5 giờ lái bắt buộc có điểm dừng ≥ 45 phút (dwell). Server tính trên mỗi chặng `ROAD`: `estimatedDurationMinutes` của chặng > 270 phút mà dwell trước chặng kế < 45 phút → vi phạm.                                                                                                                                          |
| R7  | **BR-034:** tổng hành trình (chặng đầu khởi hành → chặng cuối đến, tính cả dwell/phà/BCP) > 24 giờ ⇒ phải có **ít nhất 1 điểm dừng ≥ 24 giờ liên tục** tại `Location.location_type = REST_STOP`. Vi phạm R6/R7 → `422 REST_RULE_VIOLATION` (message theo UC-33 EXC-01).                                                                                                                    |
| R8  | **BCP bắt buộc xuyên biên giới:** Booking quốc tế phải có ≥ 1 điểm dừng/điểm nối thuộc `location_type ∈ {BORDER_GATE, AIRPORT, SEAPORT}`; thiếu → `422 BCP_REQUIRED`. Trạm dừng/BCP không có bảng riêng: là `Location` nối hai chặng, thời gian dừng suy ra từ `dwellAfterMinutes`.                                                                                                        |
| R9  | **Vehicle trên chặng:** `vehicle.transportMode = route.transportMode`; xe `AVAILABLE` hoặc `ASSIGNED` nhưng **không chồng lịch** với chặng khác (so khoảng `[plannedDepartureAt, plannedArrivalAt]` trên `RoutePlanRouteVehicle`); đăng kiểm/bảo hiểm chưa hết hạn tại ngày chặng; tổng `capacityHorses` ≥ số ngựa của Booking. Chặng thuê ngoài **không** nhận `vehicleIds`.              |
| R10 | **Trạng thái xe tự động:** `AVAILABLE → ASSIGNED` khi gán vào chặng thuộc RoutePlan `CONFIRMED`; `ASSIGNED → IN_USE` khi chuyến khởi hành (Flow 4); trả về `AVAILABLE` khi không còn chặng nào chưa hoàn thành. Không có API đổi thủ công sang `ASSIGNED/IN_USE`.                                                                                                                          |
| R11 | **Loại RoutePlan suy ra từ `RoutePlanRoute.route_type`:** mọi chặng `PRIMARY` ⇒ lộ trình chính; có chặng `BACKUP` ⇒ lộ trình dự phòng; `RETURN` ⇒ phương án quay đầu. Mỗi TransportPlan tối đa **1 PRIMARY chưa hủy**; BACKUP cần đã có PRIMARY chưa hủy. Lý do lập backup/RETURN lưu ở `RoutePlan.route_note`. Backup chỉ thay một đoạn của primary: xem R16. |
| R12 | **Hủy RoutePlan (UC-40):** chỉ `DRAFT`, có lý do (gửi trong request, ghi vào `route_note`); không đổi trạng thái Booking/TransportPlan; bản ghi giữ lại (`status = CANCELLED`). Sau khi hủy PRIMARY, `hasRoutePlan` về `false`.                                                                                                                                                            |
| R13 | **Route master tái sử dụng:** chặng gửi `routeId` có sẵn, hoặc `fromLocationId + toLocationId + transportMode` để BE tìm/tạo `Route` (distance/duration lấy từ Map service).                                                                                                                                                                                                               |
| R14 | **Atomic:** các side effect của một API ghi (đổi status + gán nhân sự/xe + đổi status CDos + `Queue` thông báo) được lưu bằng một lần `SaveChanges`/transaction; `FlushAsync` đẩy SignalR chỉ chạy **sau khi commit thành công**. Chi tiết ở bảng Thông báo đầu file. |
| R15 | **Server tính toán:** `totalDistanceKm`, `estimatedDurationMinutes`, `dwellAfterMinutes`, các giá trị suy ra đều do server tính, không tin giá trị client gửi (V7 ghi chú 9).                                                                                                                                                                                                              |
| R16 | **Backup thay một đoạn của primary.** RoutePlan `BACKUP` chỉ chứa phần thay thế, không phải cả tuyến. Ví dụ primary `A→B→C→D→E`, backup `C→D'→E`. Chặng đầu của backup phải bắt đầu tại `fromLocation` của một chặng primary, chặng cuối phải kết thúc tại `toLocation` của chặng primary đó hoặc chặng đứng sau; các chặng primary nằm giữa hai điểm này là **đoạn bị thay**. Khi backup được bật (UC-48), lộ trình hiệu lực = chặng primary trước đoạn bị thay + chặng backup + chặng primary sau đoạn bị thay (`A→B→C→D'→E`). DB không có cột "đoạn bị thay": BE suy ra bằng cách khớp `fromLocation` đầu và `toLocation` cuối của backup với chuỗi primary. R5–R8 (liên tục, nghỉ, 24h, BCP) tính trên **lộ trình hiệu lực đã ghép**, không tính riêng backup. Hai điểm đầu/cuối này lấy từ primary và **không đổi được** sau khi tạo (RP4 không cho đổi hai đầu). Hai đầu không khớp primary → `422 BACKUP_NOT_ANCHORED`; backup trùng hệt đoạn primary bị thay (cùng chuỗi `routeId`) → `409 IDENTICAL_CONTINGENCY_ROUTE`. |
| R17 | **RETURN: quay đầu khẩn cấp giữa đường.** RETURN không lập sẵn: RC tạo RoutePlan `RETURN` (RP1) khi `Transport` đang `IN_TRANSIT`, kèm lý do ở `routeNote`. Chặng đầu của RETURN bắt đầu tại vị trí hiện tại (một `Location`, RC có thể tạo bằng LOC3/ROT3), chặng cuối kết thúc tại điểm xuất phát. CDos lúc này `APPROVED` bị khóa nên RETURN đi qua cổng LM: LM duyệt (EC2) thì CDos `APPROVED → DRAFT` để TS bổ sung giấy tờ; TS xác nhận ở RP7 thì CDos tự chạy `IN_PREPARATION → READY_FOR_SUBMISSION → SUBMITTED → APPROVED` và RoutePlan `CONFIRMED`; LM kích hoạt (EC3) và RC báo Driver (EC4). Customer **không** nộp thêm giấy tờ. Mỗi Transport tối đa **1 RETURN chưa hủy**. Thứ tự sự cố: primary gặp sự cố → bật backup; backup cũng gặp sự cố → RETURN (không giao hàng nữa). Khi bật RETURN, lộ trình hiệu lực = các chặng đã đi + chặng `RETURN`, các chặng chưa đi bị bỏ. **Driver/Escort giữ nguyên người đang phụ trách chuyến**, không dùng PS3. **Xe:** RETURN thường dùng chính xe đang chở ngựa (`IN_USE`) và lịch chồng với các chặng chưa đi của primary; R9 và `SCHEDULE_CONFLICT` bỏ qua hai trường hợp này khi xe đã gán cho PRIMARY của cùng Transport. |

---

## 3. Object dùng chung

Mọi `...Id` là `uuid` (string).

### 3.1. `EmployeeBrief`

```json
{
  "employeeId": "uuid",
  "employeeCode": "EMP-2026-021",
  "fullName": "Nguyen Van A",
  "role": "TRANSPORT_SPECIALIST"
}
```

### 3.2. `LocationBrief`

| Field                    | Type           | Mô tả                                                           |
| ------------------------ | -------------- | --------------------------------------------------------------- |
| `locationId`             | uuid           |                                                                 |
| `locationName`           | string         |                                                                 |
| `locationType`           | string \| null | `CITY, BORDER_GATE, AIRPORT, SEAPORT, STABLE, REST_STOP, OTHER` |
| `city` / `country`       | string         |                                                                 |
| `latitude` / `longitude` | number \| null | FE dùng để gọi Geoapify vẽ đường (không lưu geometry)           |

### 3.3. `Provider`

| Field                                                                    | Type           | Mô tả                      |
| ------------------------------------------------------------------------ | -------------- | -------------------------- |
| `transportProviderId`                                                    | uuid           |                            |
| `providerCode`                                                           | string         | Duy nhất trên bản chưa xóa |
| `providerName`                                                           | string         |                            |
| `status`                                                                 | string         | `ProviderStatus`           |
| `supportedModes`                                                         | string[]       | `ROAD`, `SEA`, `AIR`       |
| `taxCode`, `contactName`, `phone`, `email`, `address`, `country`, `note` | string \| null |                            |
| `createdAt`, `updatedAt`                                                 | string         |                            |

### 3.4. `Vehicle`

| Field                                                                  | Type                   | Mô tả                                                                                    |
| ---------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| `vehicleId`, `vehicleCode`, `vehicleName`                              |                        |                                                                                          |
| `transportMode`                                                        | string                 | `ROAD, SEA, AIR`                                                                         |
| `licensePlate`, `vehicleType`, `manufacturer`, `model`                 | string \| null         |                                                                                          |
| `capacityHorses`                                                       | number                 | 2–9 (BR-BOOKING-02)                                                                      |
| `status`                                                               | string                 | `VehicleStatus`                                                                          |
| `registrationNumber` / `registrationExpiryDate` / `registrationStatus` | string / date / string | `registrationStatus`: `VALID`, `EXPIRING_SOON`, `EXPIRED` (suy ra)                       |
| `insuranceNumber` / `insuranceExpiryDate` / `insuranceStatus`          | string / date / string | Như trên                                                                                 |
| `specialEquipment`                                                     | string \| null         |                                                                                          |
| `warnings`                                                             | string[]               | Ví dụ `["REGISTRATION_EXPIRED"]`, `["INSURANCE_EXPIRING_SOON"]`                          |
| `isAvailable`                                                          | boolean                | Chỉ có khi list gọi kèm `availableFrom/availableTo`: không chồng lịch và status cho phép |
| `createdAt`, `updatedAt`                                               | string                 |                                                                                          |

### 3.5. `Segment` (một `RoutePlanRoute`)

| Field                                     | Type                    | Mô tả                                                                                                                        |
| ----------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| `routePlanRouteId`                        | uuid                    |                                                                                                                              |
| `sequenceNo`                              | number                  | 1…n (mỗi RoutePlan có dãy riêng)                                                                                             |
| `routeType`                               | string                  | `PRIMARY` / `BACKUP` / `RETURN` (`route_type` của chặng)                                                                |
| `route`                                   | object                  | `routeId`, `routeCode`, `routeName`, `transportMode`, `distanceKm`, `estimatedDurationMinutes`                               |
| `fromLocation` / `toLocation`             | `LocationBrief`         | Có `latitude`/`longitude`                                                                                                    |
| `plannedDepartureAt` / `plannedArrivalAt` | string                  |                                                                                                                              |
| `actualDepartureAt` / `actualArrivalAt`   | string \| null          | Flow 4 ghi                                                                                                                   |
| `status`                                  | string                  | **Suy ra, không lưu**: `PENDING` (chưa có `actualDepartureAt`), `IN_PROGRESS` (đã khởi hành, chưa đến), `COMPLETED` (đã đến) |
| `dwellAfterMinutes`                       | number \| null          | Thời gian dừng sau chặng này; `null` ở chặng cuối                                                                            |
| `isOutsourced`                            | boolean                 | `true` khi `transport_provider_id` có giá trị (suy ra)                                                                       |
| `vehicles`                                | array                   | `vehicleId`, `vehicleCode`, `vehicleName`, `licensePlate`, `transportMode`, `capacityHorses`. Rỗng với chặng thuê ngoài      |
| `outsourcing`                             | object \| null          | `provider` (`Provider`). `null` với chặng nội bộ. Số chuyến bay/AWB/ghi chú dịch vụ nằm ở `note` của chặng                   |
| `driver` / `escort`                       | `EmployeeBrief` \| null | `null` nếu chưa gán hoặc chặng thuê ngoài                                                                                    |
| `note`                                    | string \| null          |                                                                                                                              |

### 3.6. `RoutePlan`

| Field                                          | Type           | Mô tả                                                                                                                                     |
| ---------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `routePlanId`, `routePlanCode`                 |                |                                                                                                                                           |
| `transportPlanId`                              | uuid           |                                                                                                                                           |
| `bookingId`, `bookingCode`                     |                |                                                                                                                                           |
| `routeType`                                    | string         | **Suy ra** từ `route_type` các chặng (R11): `PRIMARY` / `BACKUP` / `RETURN`                                                               |
| `status`                                       | string         | `RoutePlanStatus`                                                                                                                         |
| `isCrossBorder`                                | boolean        |                                                                                                                                           |
| `totalDistanceKm` / `estimatedDurationMinutes` | number         | Server tính                                                                                                                               |
| `plannedDepartureAt` / `plannedArrivalAt`      | string         | Chặng đầu / chặng cuối                                                                                                                    |
| `segments`                                     | `Segment[]`    | Theo `sequenceNo`                                                                                                                         |
| `isPersonnelComplete`                          | boolean        | `true` khi mọi chặng nội bộ đã có Driver và Escort (chặng thuê ngoài không cần)                                                           |
| `legalReview`                                  | object \| null | Suy ra từ `ComplianceDossier`, không có bảng riêng: `isFeasible`, `note`, `blockedSegments`, `reviewedBy` (`EmployeeBrief`), `reviewedAt` |
| `replacesSequenceNo`                           | object \| null | Chỉ BACKUP: `{ from, to }` = `sequenceNo` các chặng primary bị thay (suy ra, R16)                                          |
| `routeNote`                                    | string \| null | `route_note`; với BACKUP là lý do lập dự phòng, với RETURN là lý do quay đầu khẩn cấp                                                                                            |
| `createdAt`, `updatedAt`                       | string         | `updatedAt` dùng cho `lastUpdatedAt`                                                                                                      |

### 3.7. `TransportPlan`

| Field                                              | Type                                     | Mô tả                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transportPlanId`, `planCode`                      |                                          |                                                                                                                                                                                                                                                  |
| `status`                                           | string                                   | `TransportPlanStatus`                                                                                                                                                                                                                            |
| `booking`                                          | object                                   | `bookingId`, `bookingCode`, `status`, `isInternational`, `customerName`, `originAddress`/`originCountry`, `destinationAddress`/`destinationCountry`, `totalHorses`, `requestedDepartureDate`/`requestedArrivalDate`, `specialRequirements` (TP3) |
| `transport`                                        | object                                   | `transportId`, `transportCode`, `status`                                                                                                                                                                                                         |
| `plannedStartAt` / `plannedEndAt`                  | string \| null                           |                                                                                                                                                                                                                                                  |
| `planningNote`                                     | string \| null                           |                                                                                                                                                                                                                                                  |
| `estimatedDistanceKm` / `estimatedDurationMinutes` | number \| null                           | LM nhập ở TP1/TP4 (UC-34/35)                                                                                                                                                                                                                     |
| `assignedEmployees`                                | array                                    | `EmployeeBrief` + `responsibility`, `isPrimary`, `assignedAt`                                                                                                                                                                                    |
| `approvedBy` / `approvedAt`                        | `EmployeeBrief` \| null / string \| null |                                                                                                                                                                                                                                                  |
| `createdAt`, `updatedAt`                           | string                                   |                                                                                                                                                                                                                                                  |

---

## 4. Location & Route master, Map

Dữ liệu master dùng cho Route Builder (SCR-F3-008, UC-33 bước 3) và bản đồ lộ trình (SCR-F3-032). Thuộc **Flow 3**: RC (`FLEET_ROUTE_COORDINATOR`) tạo/sửa/xóa trực tiếp trên bản đồ (không có UC/screen riêng); RC, LM, TS đọc để lập/xem RoutePlan.

| #    | API                | Method & Endpoint                | Role       |
| ---- | ------------------ | -------------------------------- | ---------- |
| LOC1 | Danh sách Location | `GET /locations`                 | RC, LM, TS |
| LOC2 | Chi tiết Location  | `GET /locations/{locationId}`    | RC, LM, TS |
| LOC3 | Tạo Location       | `POST /locations`                | RC         |
| LOC4 | Sửa Location       | `PUT /locations/{locationId}`    | RC         |
| LOC5 | Xóa mềm Location   | `DELETE /locations/{locationId}` | RC         |
| ROT1 | Danh sách Route    | `GET /routes`                    | RC, LM, TS |
| ROT2 | Chi tiết Route     | `GET /routes/{routeId}`          | RC, LM, TS |
| ROT3 | Tạo Route          | `POST /routes`                   | RC         |
| ROT4 | Sửa Route          | `PUT /routes/{routeId}`          | RC         |
| ROT5 | Xóa mềm Route      | `DELETE /routes/{routeId}`       | RC         |

**Nguyên tắc:**

- Mỗi Route có đúng **1 điểm đầu** (`fromLocation`) và **1 điểm đến** (`toLocation`), không có điểm giữa. Trạm dừng/BCP là `Location` nối giữa hai chặng của RoutePlan (R8).
- BE **không lưu và không trả geometry**. BE chỉ trả tọa độ của hai điểm; FE tự gọi Geoapify để vẽ đường nối (MAP3).
- `distanceKm` và `estimatedDurationMinutes` của Route do BE tính khi tạo/sửa (gọi Geoapify Routing, chỉ với `ROAD`; `SEA/AIR` lấy theo quy tắc BE). FE không gửi tọa độ, `distanceKm`, `estimatedDurationMinutes`.
- Chỉ `FLEET_ROUTE_COORDINATOR` được ghi (LOC3–LOC5, ROT3–ROT5). Không mở quyền ghi cho LM/TS.
- Danh sách rỗng trả `200` với `items: []`. API sửa gửi `lastUpdatedAt` (lệch → `409 LOCATION_MODIFIED` / `409 ROUTE_MODIFIED`).
- Khả năng tiếp cận (pan/zoom bằng bàn phím, ARIA, popup) do FE xử lý; FE tự dựng text summary từ Location/Route response và dùng `GET /locations`, `GET /routes` làm danh sách dự phòng. Không có endpoint `accessible-summary`.

**Lỗi dùng chung của mục này:**

| HTTP | errorCode                    | Khi nào                                                         |
| ---- | ---------------------------- | --------------------------------------------------------------- |
| 400  | `INVALID_COORDINATES`        | Latitude/longitude không hợp lệ                                 |
| 404  | `LOCATION_NOT_FOUND`         | Không tìm thấy Location (hoặc đã xóa mềm)                       |
| 404  | `ROUTE_NOT_FOUND`            | Không tìm thấy Route                                            |
| 409  | `LOCATION_MODIFIED`          | Location đã bị sửa trước đó                                     |
| 409  | `ROUTE_MODIFIED`             | Route đã bị sửa trước đó                                        |
| 409  | `LOCATION_NAME_DUPLICATED`   | Location trùng theo rule BE                                     |
| 409  | `ROUTE_DUPLICATED`           | Route trùng `fromLocationId` + `toLocationId` + `transportMode` |
| 409  | `LOCATION_IN_USE`            | Location đang được Route sử dụng                                |
| 409  | `ROUTE_IN_USE`               | Route đang được RoutePlan sử dụng                               |
| 422  | `UNSUPPORTED_TRANSPORT_MODE` | Geoapify không hỗ trợ mode                                      |
| 422  | `ROUTING_FAILED`             | Không tính được distance/duration từ Geoapify                   |
| 429  | `MAP_PROVIDER_RATE_LIMITED`  | Geoapify rate limit                                             |
| 500  | `MAP_PROVIDER_ERROR`         | Geoapify/backend provider lỗi                                   |

### LOC1. Danh sách Location

`GET /api/v1/locations?pageIndex=1&pageSize=20&search=calais&country=FR&locationType=BORDER_GATE`

| Query                   | Type   | Bắt buộc | Mô tả                       |
| ----------------------- | ------ | -------- | --------------------------- |
| `search`                | string | No       | Theo `locationName`, `city` |
| `country`               | string | No       |                             |
| `locationType`          | string | No       | `location_type`             |
| `pageIndex`, `pageSize` | number | No       | Mặc định `1`, `20`          |

**`200 OK`** — chỉ trả `is_deleted = false`.

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Locations retrieved successfully",
  "value": {
    "items": [
      {
        "locationId": "uuid",
        "locationName": "Calais BCP",
        "locationType": "BORDER_GATE",
        "address": "Calais",
        "city": "Calais",
        "stateProvince": "Hauts-de-France",
        "country": "FR",
        "latitude": 50.9513,
        "longitude": 1.8587,
        "locationNote": "Main border control point",
        "updatedAt": "2026-10-08T09:00:00Z"
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### LOC2. Chi tiết Location

`GET /api/v1/locations/{locationId}` — `value` cùng cấu trúc một phần tử `items` của LOC1.

### LOC3. Tạo Location

`POST /api/v1/locations` — role `FLEET_ROUTE_COORDINATOR`.

```json
{
  "locationName": "Calais BCP",
  "locationType": "BORDER_GATE",
  "address": "Calais",
  "city": "Calais",
  "stateProvince": "Hauts-de-France",
  "country": "FR",
  "latitude": 50.9513,
  "longitude": 1.8587,
  "locationNote": "Main border control point"
}
```

**`201 Created`** — `value` cùng cấu trúc LOC2.

Validation: `locationName` bắt buộc (≤ 200); `country` bắt buộc; `latitude` bắt buộc (-90…90); `longitude` bắt buộc (-180…180); `locationType` nếu có thuộc `CITY, BORDER_GATE, AIRPORT, SEAPORT, STABLE, REST_STOP, OTHER`; trùng theo rule BE → `409 LOCATION_NAME_DUPLICATED`.

### LOC4. Sửa Location

`PUT /api/v1/locations/{locationId}` — role `FLEET_ROUTE_COORDINATOR`. Body như LOC3 kèm `lastUpdatedAt` (bắt buộc).

**`200 OK`** — `value`: `{ "locationId": "uuid", "updatedAt": "2026-10-08T10:00:00Z" }`.

### LOC5. Xóa mềm Location

`DELETE /api/v1/locations/{locationId}` — role `FLEET_ROUTE_COORDINATOR`. Location đang được Route sử dụng → `409 LOCATION_IN_USE`.

**`200 OK`** — `value`: `{ "locationId": "uuid", "deletedAt": "2026-10-08T10:00:00Z" }`.

### ROT1. Danh sách Route

`GET /api/v1/routes?fromLocationId={uuid}&toLocationId={uuid}&transportMode=ROAD&pageIndex=1&pageSize=20&search=Paris`

| Query                            | Type   | Bắt buộc | Mô tả                    |
| -------------------------------- | ------ | -------- | ------------------------ |
| `fromLocationId`, `toLocationId` | uuid   | No       |                          |
| `transportMode`                  | string | No       | `ROAD`, `SEA`, `AIR`     |
| `search`                         | string | No       | `routeCode`, `routeName` |
| `pageIndex`, `pageSize`          | number | No       | Mặc định `1`, `20`       |

**`200 OK`** — chỉ trả `is_deleted = false`.

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Routes retrieved successfully",
  "value": {
    "items": [
      {
        "routeId": "uuid",
        "routeCode": "RT-PAR-CAL-ROAD",
        "routeName": "Paris - Calais",
        "transportMode": "ROAD",
        "fromLocation": {
          "locationId": "uuid",
          "locationName": "Paris Stable",
          "locationType": "STABLE",
          "city": "Paris",
          "country": "FR",
          "latitude": 48.8566,
          "longitude": 2.3522
        },
        "toLocation": {
          "locationId": "uuid",
          "locationName": "Calais BCP",
          "locationType": "BORDER_GATE",
          "city": "Calais",
          "country": "FR",
          "latitude": 50.9513,
          "longitude": 1.8587
        },
        "distanceKm": 290.5,
        "estimatedDurationMinutes": 225,
        "routeNote": "Primary road route",
        "updatedAt": "2026-10-08T09:00:00Z"
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### ROT2. Chi tiết Route

`GET /api/v1/routes/{routeId}` — `value` cùng cấu trúc một phần tử `items` của ROT1.

### ROT3. Tạo Route

`POST /api/v1/routes` — role `FLEET_ROUTE_COORDINATOR`.

```json
{
  "fromLocationId": "uuid",
  "toLocationId": "uuid",
  "routeName": "Paris - Calais",
  "transportMode": "ROAD",
  "routeNote": "Primary road route"
}
```

BE xử lý: (1) kiểm tra trùng `fromLocationId + toLocationId + transportMode` → `409 ROUTE_DUPLICATED`; (2) lấy hai Location trong DB (không tồn tại/đã xóa mềm → `404 LOCATION_NOT_FOUND`) và lấy tọa độ từ DB, không nhận tọa độ từ FE; (3) gọi Geoapify Routing (chỉ `ROAD`) để lấy `distanceKm`, `estimatedDurationMinutes`; (4) lưu Route, không lưu geometry.

Validation: `fromLocationId`, `toLocationId` bắt buộc và khác nhau; `transportMode` bắt buộc (`ROAD`, `SEA`, `AIR`).

**`201 Created`** — `value` cùng cấu trúc ROT2.

### ROT4. Sửa Route

`PUT /api/v1/routes/{routeId}` — role `FLEET_ROUTE_COORDINATOR`.

```json
{
  "lastUpdatedAt": "2026-10-08T09:00:00Z",
  "fromLocationId": "uuid",
  "toLocationId": "uuid",
  "routeName": "Lyon - Calais Main Route",
  "transportMode": "ROAD",
  "routeNote": "Updated note"
}
```

`fromLocationId`, `toLocationId`, `routeName`, `transportMode`, `routeNote` đều optional (chỉ cập nhật field có trong request); nếu gửi location, BE lấy lại tọa độ và tính lại `distanceKm`, `estimatedDurationMinutes`; hai ID phải khác nhau.

**`200 OK`** — `value`: `{ "routeId": "uuid", "updatedAt": "2026-10-08T10:00:00Z" }`.

### ROT5. Xóa mềm Route

`DELETE /api/v1/routes/{routeId}` — role `FLEET_ROUTE_COORDINATOR`. Route đang được RoutePlan sử dụng → `409 ROUTE_IN_USE`.

**`200 OK`** — `value`: `{ "routeId": "uuid", "deletedAt": "2026-10-08T10:00:00Z" }`.

### Geoapify (FE gọi trực tiếp, không phải API của BE)

FE dùng Geoapify public key đã giới hạn domain/quota; BE không proxy, không trả secret. Dùng trong Route Builder và `SCR-F3-032`.

| #    | Việc                        | Gọi                                                    | Ghi chú                                                                                                                                                                                                 |
| ---- | --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MAP1 | Tìm địa điểm (autocomplete) | `GET https://api.geoapify.com/v1/geocode/autocomplete` | Gửi `text`, `filter`, `limit`, `lang`, `apiKey`. FE chuẩn hóa thành `{ label, address, city, stateProvince, country, countryCode, latitude, longitude }`; dùng khi nhập Location mới (LOC3)             |
| MAP2 | Reverse geocoding           | `GET https://api.geoapify.com/v1/geocode/reverse`      | Gửi `lat`, `lon`, `lang`, `apiKey`; dùng khi chấm điểm trên bản đồ để tạo Location                                                                                                                      |
| MAP3 | Vẽ đường nối giữa hai điểm  | `GET https://api.geoapify.com/v1/routing`              | `waypoints=lat1,lon1\|lat2,lon2&mode=drive&format=geojson`. Lấy `fromLocation`/`toLocation` (đã có tọa độ) từ segment hoặc Route. `ROAD` → `drive`; `SEA`, `AIR` → FE vẽ đường thẳng, không gọi routing |

**Checklist BE xác nhận:** `GET /locations`, `/routes`, `/route-plans/{id}` trả `latitude`/`longitude` của hai điểm (không có `geometry`); DB Route không có cột geometry; `POST /routes` chỉ lấy distance/duration từ Geoapify; Geoapify private key không xuất hiện trong response; role `FLEET_ROUTE_COORDINATOR` được enforce cho LOC3–5 và ROT3–5.

---

## 5. Booking đã duyệt (UC-32)

| #   | API                        | Method & Endpoint                    | Role       |
| --- | -------------------------- | ------------------------------------ | ---------- |
| AB1 | Danh sách booking đã duyệt | `GET /bookings/approved`             | LM, RC, TS |
| AB2 | Chi tiết booking đã duyệt  | `GET /bookings/approved/{bookingId}` | LM, RC, TS |

> **Endpoint riêng, B7/B8 của Flow 1 không đổi** (LM và Customer vẫn dùng `/bookings`). AB1/AB2 là danh sách công việc của LM, RC, TS và gắn thêm `transportPlan`, `complianceDossier`, `routePlan`.
>
> **Phạm vi dữ liệu theo role (UC-32):**
>
> - **LM:** mọi Booking `APPROVED` (để lập TransportPlan, phân công TS/RC).
> - **RC, TS:** chỉ Booking có `TransportPlan.status = APPROVED` (khách đã đồng ý/cọc) **và** người dùng đang đăng nhập đã được LM phân công đợt 1 vào plan đó (`EmployeeTransportPlan`). Ngoài phạm vi: AB1 không trả dòng đó, AB2 trả `403 FORBIDDEN`.

### AB1. Danh sách booking đã duyệt

`GET /api/v1/bookings/approved?pageIndex=1&pageSize=20&search=REQ-2026&isInternational=true&transportPlanStatus=APPROVED&routePlanStatus=DRAFT&departureFrom=2026-10-20&departureTo=2026-11-30&sortBy=requestedDepartureDate:asc`

Chỉ trả Booking `status = APPROVED` (không cần truyền `status`).

| Query                           | Type    | Bắt buộc | Mô tả                                                                                                                                       |
| ------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageIndex` / `pageSize`        | number  | No       | Phân trang (mặc định `1` / `20`)                                                                                                            |
| `search`                        | string  | No       | Mã Booking hoặc tên khách hàng                                                                                                              |
| `isInternational`               | boolean | No       | `true` = đi/đến khác quốc gia (suy ra từ `origin_country` ≠ `destination_country`; `Booking` lưu địa chỉ dạng text, không có `location_id`) |
| `transportPlanStatus`           | string  | No       | `transport_plan_status` của DB (`DRAFT, PENDING, APPROVED, ...`). `APPROVED` = khách đã đồng ý/cọc (UC-32 ALT-01)                           |
| `routePlanStatus`               | string  | No       | `route_plan_status` của DB (`DRAFT, CONFIRMED, ACTIVE, COMPLETED, CANCELLED`) của RoutePlan chính                                           |
| `hasRoutePlan`                  | boolean | No       | `false` = chưa có RoutePlan chính chưa hủy                                                                                                  |
| `hasTransportPlan`              | boolean | No       | `false` = LM chưa lập TransportPlan                                                                                                         |
| `hasComplianceDossier`          | boolean | No       | `false` = TS chưa Apply Template                                                                                                            |
| `complianceDossierStatus`       | string  | No       | `compliance_dossier_status` của CDos (`DRAFT, IN_PREPARATION, …`)                                                                           |
| `departureFrom` / `departureTo` | date    | No       | Lọc `requestedDepartureDate`                                                                                                                |
| `sortBy`                        | string  | No       | `requestedDepartureDate`, `approvedAt` hoặc `createdAt`. Mặc định `requestedDepartureDate:asc`                                              |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Approved bookings retrieved successfully",
  "value": {
    "items": [
      {
        "bookingId": "uuid",
        "bookingCode": "REQ-20261001-0005",
        "status": "APPROVED",
        "customerName": "Example Racing Club",
        "customerCode": "CUS-2026-892",
        "originAddress": "Haras de Chantilly, Paris",
        "originCountry": "FR",
        "destinationAddress": "Newmarket Stables, London",
        "destinationCountry": "GB",
        "isInternational": true,
        "totalHorses": 4,
        "requestedDepartureDate": "2026-10-27",
        "requestedArrivalDate": "2026-11-01",
        "specialRequirements": "Temperature monitoring",
        "approvedAt": "2026-10-01T03:00:00Z",
        "transportId": "uuid",
        "transportPlan": {
          "transportPlanId": "uuid",
          "planCode": "TP-20261001-0001",
          "status": "APPROVED",
          "plannedStartAt": "2026-10-27T06:00:00Z",
          "plannedEndAt": "2026-11-01T18:00:00Z",
          "estimatedDistanceKm": 920.5,
          "estimatedDurationMinutes": 1260,
          "planningNote": "Temperature monitoring"
        },
        "routePlan": {
          "routePlanId": "uuid",
          "routePlanCode": "RP-20261001-0001",
          "status": "DRAFT"
        },
        "complianceDossier": {
          "complianceDossierId": "uuid",
          "status": "DRAFT"
        }
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

`transportPlan`, `routePlan`, `complianceDossier` là `null` khi chưa có (ví dụ LM chưa lập plan; TS chưa Apply Template; RC chưa lập RoutePlan). `routePlan` là RoutePlan chính (PRIMARY) chưa hủy. TS dùng `complianceDossier` để chọn nút: `null` → **Apply Template**, có → **View CDos**.

**Bộ lọc sẵn cho menu sidebar** (FE gọi AB1 với query cố định, không có màn hình danh sách riêng): RC "Route Plans List" → `routePlanStatus=DRAFT` hoặc `hasRoutePlan=false`; TS "Legal Feasibility Feedback" → `routePlanStatus=DRAFT`; TS "chưa Apply Template" → `hasComplianceDossier=false`; LM "chưa lập plan" → `hasTransportPlan=false`.

Không có dữ liệu → `200`, `items: []` (FE hiển thị "Hiện chưa có yêu cầu vận chuyển nào được phân công.", UC-32 EXC-01).

| HTTP | errorCode                | Message                       |
| ---- | ------------------------ | ----------------------------- |
| 400  | `INVALID_SORT_PARAMETER` | The sort parameter is invalid |

### AB2. Chi tiết booking đã duyệt

`GET /api/v1/bookings/approved/{bookingId}`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Approved booking retrieved successfully",
  "value": {
    "bookingId": "uuid",
    "bookingCode": "REQ-20261001-0005",
    "status": "APPROVED",
    "customer": {
      "customerId": "uuid",
      "customerCode": "CUS-2026-892",
      "fullName": "Example Racing Club",
      "phone": "+33-000-000"
    },
    "originAddress": "Haras de Chantilly, Paris",
    "originCountry": "FR",
    "destinationAddress": "Newmarket Stables, London",
    "destinationCountry": "GB",
    "isInternational": true,
    "requestedDepartureDate": "2026-10-27",
    "requestedArrivalDate": "2026-11-01",
    "specialRequirements": "Temperature monitoring",
    "customerNote": null,
    "totalHorses": 4,
    "horses": [
      {
        "horseId": "uuid",
        "horseName": "Golden Thunder",
        "sex": "MALE",
        "breed": "Thoroughbred",
        "microchipNumber": "985112003456781",
        "passportNumber": "FR-TB-2021-0457",
        "specialHandlingNotes": "Hay only"
      }
    ],
    "transport": {
      "transportId": "uuid",
      "transportCode": "TR-20261001-0005",
      "status": "PLANNING"
    },
    "transportPlan": {
      "transportPlanId": "uuid",
      "planCode": "TP-20261001-0001",
      "status": "PENDING",
      "plannedStartAt": "2026-10-27T06:00:00Z",
      "plannedEndAt": "2026-11-01T18:00:00Z",
      "estimatedDistanceKm": 920.5,
      "estimatedDurationMinutes": 1260,
      "planningNote": "Temperature monitoring"
    },
    "complianceDossier": null,
    "routePlans": []
  }
}
```

`transportPlan` là `null` khi LM chưa lập plan (khi đó chưa thể phân công TS/RC); khi đã có plan thì như mẫu trên; `complianceDossier` = `{ "complianceDossierId", "status" }` hoặc `null` nếu TS chưa Apply Template; `routePlans` = mảng `{ "routePlanId", "routePlanCode", "routeType", "status" }`.

| HTTP | errorCode                | Message                                                                                                      |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 403  | `FORBIDDEN`              | RC/TS chưa được phân công vào Transport Plan của booking này, hoặc Transport Plan chưa được khách đồng ý/cọc |
| 404  | `BOOKING_NOT_FOUND`      | Booking not found                                                                                            |
| 409  | `INVALID_BOOKING_STATUS` | This action cannot be performed while the booking is in {statusName} status (booking chưa `APPROVED`)        |

---

## 6. Transport Plan (UC-34, UC-35)

> Theo UC-34/35 và DB V7, `TransportPlan` **chỉ lưu các cột của bảng `TransportPlan`** (thời gian, quãng đường/thời gian ước tính, ghi chú). Báo giá và đặt cọc không thuộc Flow 3 (xem giả định ở Mục 1); không có API báo giá.

| #   | API                      | Method & Endpoint                            | Role                                |
| --- | ------------------------ | -------------------------------------------- | ----------------------------------- |
| TP1 | Tạo Transport Plan       | `POST /bookings/{bookingId}/transport-plans` | LM                                  |
| TP2 | Danh sách Transport Plan | `GET /transport-plans`                       | LM (tất cả), RC/TS (được phân công) |
| TP3 | Chi tiết Transport Plan  | `GET /transport-plans/{transportPlanId}`     | LM, RC, TS                          |
| TP4 | Sửa Transport Plan       | `PUT /transport-plans/{transportPlanId}`     | LM                                  |

**Lỗi dùng chung:**

| HTTP | errorCode                       | Message                                                                             | Dùng ở   |
| ---- | ------------------------------- | ----------------------------------------------------------------------------------- | -------- |
| 404  | `BOOKING_NOT_FOUND`             | Booking not found                                                                   | TP1      |
| 404  | `TRANSPORT_PLAN_NOT_FOUND`      | Transport Plan not found                                                            | TP3, TP4 |
| 409  | `INVALID_BOOKING_STATUS`        | Booking must be APPROVED                                                            | TP1      |
| 409  | `TRANSPORT_PLAN_ALREADY_EXISTS` | Transport Plan already exists for this booking. Please edit the existing plan.      | TP1      |
| 409  | `PLAN_LOCKED`                   | Cannot edit Transport Plan once the transport is in transit, completed or cancelled | TP4      |
| 409  | `TRANSPORT_PLAN_MODIFIED`       | The transport plan was just modified. Please reload the page                        | TP4      |

### TP1. Tạo Transport Plan

UC-34. Một transaction: tạo `TransportPlan` (`status = DRAFT`), sinh `planCode` (BR-016), đặt `Transport.status = PLANNING` (C29). **Không phân công TS/RC ở bước này**: LM phân công đợt 1 bằng [PS1](#ps1-phân-công-đợt-1-lần-đầu) sau khi `TransportPlan.status = APPROVED`.

`POST /api/v1/bookings/{bookingId}/transport-plans`

| Field                      | Type   | Bắt buộc | Mô tả                                                            |
| -------------------------- | ------ | -------- | ---------------------------------------------------------------- |
| `plannedStartAt`           | string | Yes      | `planned_start_at`                                               |
| `plannedEndAt`             | string | Yes      | `planned_end_at`; phải sau `plannedStartAt`                      |
| `estimatedDistanceKm`      | number | No       | Tổng quãng đường ước tính (`estimated_distance_km`)              |
| `estimatedDurationMinutes` | number | No       | Tổng thời gian di chuyển ước tính (`estimated_duration_minutes`) |
| `planningNote`             | string | No       | Ghi chú chỉ đạo / lập kế hoạch                                   |

```json
{
  "plannedStartAt": "2026-10-27T06:00:00Z",
  "plannedEndAt": "2026-11-01T18:00:00Z",
  "estimatedDistanceKm": 920.5,
  "estimatedDurationMinutes": 1260,
  "planningNote": "Customer requests temperature monitoring"
}
```

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Transport plan created successfully",
  "value": {
    "transportPlanId": "uuid",
    "planCode": "TP-20261001-0001",
    "status": "DRAFT",
    "booking": {
      "bookingId": "uuid",
      "bookingCode": "REQ-20261001-0005",
      "status": "APPROVED",
      "isInternational": true,
      "customerName": "Example Racing Club",
      "originAddress": "Haras de Chantilly, Paris",
      "originCountry": "FR",
      "destinationAddress": "Newmarket Stables, London",
      "destinationCountry": "GB",
      "totalHorses": 4,
      "requestedDepartureDate": "2026-10-27",
      "requestedArrivalDate": "2026-11-01",
      "specialRequirements": "Temperature monitoring"
    },
    "transport": {
      "transportId": "uuid",
      "transportCode": "TR-20261001-0005",
      "status": "PLANNING"
    },
    "plannedStartAt": "2026-10-27T06:00:00Z",
    "plannedEndAt": "2026-11-01T18:00:00Z",
    "planningNote": "Customer requests temperature monitoring",
    "estimatedDistanceKm": 920.5,
    "estimatedDurationMinutes": 1260,
    "assignedEmployees": [],
    "approvedBy": null,
    "approvedAt": null,
    "createdAt": "2026-10-06T08:00:00Z",
    "updatedAt": "2026-10-06T08:00:00Z"
  }
}
```

Thêm `400 VALIDATION_ERROR` khi `plannedEndAt ≤ plannedStartAt` hoặc thiếu field bắt buộc.

### TP2. Danh sách Transport Plan

`GET /api/v1/transport-plans?pageIndex=1&pageSize=20&status=APPROVED&search=TP-2026&sortBy=createdAt:desc`

| Query             | Type   | Bắt buộc | Mô tả                                                        |
| ----------------- | ------ | -------- | ------------------------------------------------------------ |
| `status`          | string | No       | `TransportPlanStatus`                                        |
| `search`          | string | No       | `planCode`, `bookingCode`, tên khách hàng                    |
| `routePlanStatus` | string | No       | `route_plan_status` của RoutePlan chính                      |
| `sortBy`          | string | No       | `createdAt` hoặc `plannedStartAt`. Mặc định `createdAt:desc` |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Transport plans retrieved successfully",
  "value": {
    "items": [
      {
        "transportPlanId": "uuid",
        "planCode": "TP-20261001-0001",
        "status": "APPROVED",
        "bookingId": "uuid",
        "bookingCode": "REQ-20261001-0005",
        "customerName": "Example Racing Club",
        "plannedStartAt": "2026-10-27T06:00:00Z",
        "plannedEndAt": "2026-11-01T18:00:00Z",
        "updatedAt": "2026-10-06T08:00:00Z"
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### TP3. Chi tiết Transport Plan

`GET /api/v1/transport-plans/{transportPlanId}`

**`200 OK`** — `value` là object [`TransportPlan`](#37-transportplan) đầy đủ (xem ví dụ ở TP1), trong đó `booking` kèm thông tin để hiển thị ngay: tên khách hàng, điểm đi → điểm đến, tổng số ngựa, ngày khởi hành/đến mong muốn, yêu cầu đặc biệt; dùng cho SCR-F3-005 (tab General, tab Personnel). Tab Personnel dùng thêm [PS2](#ps2-xem-phân-công).

### TP4. Sửa Transport Plan

UC-35. Sửa metadata (thời gian, quãng đường/thời gian ước tính, ghi chú). Provider **không** gắn ở cấp plan: chỉ gắn trên từng chặng `RoutePlanRoute` qua [OS1](#os1-gán--gỡ-thuê-ngoài-cho-chặng) hoặc `outsourcing` của RP1/RP4. **Không** đổi người phân công (dùng [PS1](#ps1-phân-công-đợt-1-lần-đầu)/[PS5](#ps5-đổi-nhân-sự-đợt-1)).

`PUT /api/v1/transport-plans/{transportPlanId}`

Chỉ sửa khi `status ∈ {DRAFT, PENDING, APPROVED}` (trước `IN_PROGRESS`).

| Field                                              | Type   | Bắt buộc | Mô tả                                                                               |
| -------------------------------------------------- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `lastUpdatedAt`                                    | string | Yes      | Chống ghi đè                                                                        |
| `updateReason`                                     | string | No       | Lý do chỉnh sửa; đưa vào nội dung thông báo, **không có cột lưu riêng** trong DB V7 |
| `plannedStartAt` / `plannedEndAt`                  | string | No       |                                                                                     |
| `estimatedDistanceKm` / `estimatedDurationMinutes` | number | No       |                                                                                     |
| `planningNote`                                     | string | No       |                                                                                     |

```json
{
  "lastUpdatedAt": "2026-10-06T08:00:00Z",
  "updateReason": "Customer moved departure by 2 days",
  "plannedStartAt": "2026-10-29T06:00:00Z",
  "plannedEndAt": "2026-11-03T18:00:00Z",
  "planningNote": "Updated schedule"
}
```

Thêm `400 VALIDATION_ERROR` khi `plannedEndAt ≤ plannedStartAt` (sau khi gộp với giá trị cũ).

**`200 OK`** — trả `TransportPlan` đầy đủ (cùng cấu trúc TP3). Hệ thống gửi thông báo cập nhật cho Customer, TS, RC.

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Transport plan updated successfully",
  "value": {
    "transportPlanId": "uuid",
    "planCode": "TP-20261001-0001",
    "status": "APPROVED",
    "plannedStartAt": "2026-10-29T06:00:00Z",
    "plannedEndAt": "2026-11-03T18:00:00Z",
    "updatedAt": "2026-10-07T09:00:00Z"
  }
}
```

> Ví dụ trên rút gọn các field không đổi; FE dùng `updatedAt` mới cho lần sửa kế tiếp. Response thực tế trả đủ các field của object `TransportPlan`.

---

## 7. Transport Provider (UC-41) & thuê ngoài (UC-42)

| #   | API                           | Method & Endpoint                                                        | Role                                    |
| --- | ----------------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| PV1 | Danh sách provider            | `GET /transport-providers`                                               | LM; RC (chỉ đọc, để chọn khi lập route) |
| PV2 | Chi tiết provider             | `GET /transport-providers/{providerId}`                                  | LM, RC                                  |
| PV3 | Thêm provider                 | `POST /transport-providers`                                              | LM                                      |
| PV4 | Sửa provider                  | `PUT /transport-providers/{providerId}`                                  | LM                                      |
| PV5 | Đổi trạng thái                | `PATCH /transport-providers/{providerId}/status`                         | LM                                      |
| PV6 | Xóa mềm                       | `DELETE /transport-providers/{providerId}`                               | LM                                      |
| OS1 | Gán / gỡ thuê ngoài cho chặng | `PUT /route-plans/{routePlanId}/segments/{routePlanRouteId}/outsourcing` | LM                                      |

**Lỗi dùng chung (PV):**

| HTTP | errorCode                  | Message                                                                         |
| ---- | -------------------------- | ------------------------------------------------------------------------------- |
| 404  | `PROVIDER_NOT_FOUND`       | Transport Provider not found                                                    |
| 409  | `PROVIDER_CODE_DUPLICATED` | Transport Provider with this Code / Tax ID already exists. (cho `providerCode`) |
| 409  | `TAX_CODE_DUPLICATED`      | Transport Provider with this Code / Tax ID already exists. (cho `taxCode`)      |
| 409  | `PROVIDER_MODIFIED`        | The provider was just modified. Please reload the page                          |

> Hệ thống chỉ quản lý **master** của provider; không có API/field cho tài xế hay phương tiện nội bộ của bên thứ 3 (UC-41 AC-002).

### PV1. Danh sách provider

`GET /api/v1/transport-providers?pageIndex=1&pageSize=20&status=ACTIVE&supportedMode=AIR&search=lufthansa&sortBy=providerName:asc`

| Query           | Type   | Bắt buộc | Mô tả                                                                    |
| --------------- | ------ | -------- | ------------------------------------------------------------------------ |
| `status`        | string | No       | `ACTIVE`, `INACTIVE`, `SUSPENDED`. RC chỉ nhận `ACTIVE` (bị ép)          |
| `supportedMode` | string | No       | `ROAD`, `SEA`, `AIR` — provider có chứa mode này                         |
| `search`        | string | No       | `providerCode`, `providerName`, `taxCode`                                |
| `sortBy`        | string | No       | `providerName`, `providerCode`, `createdAt`. Mặc định `providerName:asc` |

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
        "transportProviderId": "uuid",
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
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### PV2. Chi tiết provider

`GET /api/v1/transport-providers/{providerId}`

**`200 OK`** — `value` là object [`Provider`](#33-provider) (cùng field như 1 phần tử `items` của PV1).

### PV3. Thêm provider

`POST /api/v1/transport-providers`

| Field                                                              | Type     | Bắt buộc | Mô tả                                   |
| ------------------------------------------------------------------ | -------- | -------- | --------------------------------------- |
| `providerCode`                                                     | string   | Yes      | ≤ 50, duy nhất trên bản chưa xóa        |
| `providerName`                                                     | string   | Yes      | ≤ 200                                   |
| `supportedModes`                                                   | string[] | Yes      | ≥ 1; `ROAD`, `SEA`, `AIR`               |
| `taxCode`                                                          | string   | Yes      | ≤ 100, duy nhất trên bản chưa xóa (C20) |
| `contactName` / `phone` / `email` / `address` / `country` / `note` | string   | No       | `email` đúng định dạng                  |

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
    "transportProviderId": "uuid",
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

| Field                                                              | Type     | Bắt buộc | Mô tả                   |
| ------------------------------------------------------------------ | -------- | -------- | ----------------------- |
| `lastUpdatedAt`                                                    | string   | Yes      |                         |
| `providerName`                                                     | string   | Yes      |                         |
| `supportedModes`                                                   | string[] | Yes      | ≥ 1                     |
| `taxCode`                                                          | string   | Yes      | Kiểm tra unique nếu đổi |
| `contactName` / `phone` / `email` / `address` / `country` / `note` | string   | No       |                         |

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
{
  "isSuccess": true,
  "code": 200,
  "message": "Transport provider updated successfully",
  "value": {
    "transportProviderId": "uuid",
    "updatedAt": "2026-09-25T04:00:00Z"
  }
}
```

### PV5. Đổi trạng thái provider

`PATCH /api/v1/transport-providers/{providerId}/status`

```json
{ "status": "INACTIVE", "reason": "Contract ended" }
```

| Field    | Type   | Bắt buộc                     | Mô tả                             |
| -------- | ------ | ---------------------------- | --------------------------------- |
| `status` | string | Yes                          | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `reason` | string | Yes khi `INACTIVE/SUSPENDED` |                                   |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Provider status updated successfully",
  "value": {
    "transportProviderId": "uuid",
    "status": "INACTIVE",
    "updatedAt": "2026-09-26T04:00:00Z"
  }
}
```

Provider `INACTIVE/SUSPENDED` bị ẩn khỏi danh sách chọn mới (PV1 cho RC, OS1) nhưng tham chiếu cũ giữ nguyên.

### PV6. Xóa mềm provider

`DELETE /api/v1/transport-providers/{providerId}` — đặt `is_deleted = true`, `deleted_at`, `deleted_by_account_id`. Không xóa tham chiếu lịch sử (UC-41 ALT-02). Provider đang gán cho chặng của route **chưa `COMPLETED/CANCELLED`** → `409 PROVIDER_IN_USE`.

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Transport provider deleted successfully",
  "value": null
}
```

| HTTP | errorCode         | Message                                                                        |
| ---- | ----------------- | ------------------------------------------------------------------------------ |
| 409  | `PROVIDER_IN_USE` | The provider is assigned to route segments that are not completed or cancelled |

### OS1. Gán / gỡ thuê ngoài cho chặng

UC-42. Chỉ ghi `transport_provider_id` (và `note`) trên `RoutePlanRoute`. DB V7 không có `service_type`/`provider_reference`: số chuyến bay / AWB / mã booking dịch vụ thuê ngoài ghi vào `note`. Chặng thuê ngoài **không** có Driver/Escort/Vehicle: nếu chặng đang có sẽ bị **gỡ** (response trả `clearedPersonnel`/`clearedVehicles`).

`PUT /api/v1/route-plans/{routePlanId}/segments/{routePlanRouteId}/outsourcing`

Chỉ khi RoutePlan `status = DRAFT`; sau `CONFIRMED` không còn sửa chặng (đổi khi đang chạy: UC-48, mục 12; RoutePlan RETURN đã `CONFIRMED` gán provider qua EC3) → `409 ROUTE_LOCKED`. Không đổi status route.

| Field                 | Type    | Bắt buộc                | Mô tả                                                              |
| --------------------- | ------- | ----------------------- | ------------------------------------------------------------------ |
| `lastUpdatedAt`       | string  | Yes                     | `updatedAt` của RoutePlan                                          |
| `outsourced`          | boolean | Yes                     | `true` = thuê ngoài; `false` = chuyển về nội bộ                    |
| `transportProviderId` | uuid    | Khi `outsourced = true` | Provider `ACTIVE`, `supportedModes` chứa `transportMode` của chặng |
| `note`                | string  | No                      | Số chuyến bay / AWB / mã booking dịch vụ thuê ngoài (UC-42 bước 6) |

```json
{
  "lastUpdatedAt": "2026-10-08T08:00:00Z",
  "outsourced": true,
  "transportProviderId": "uuid",
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
    "routePlanId": "uuid",
    "routePlanStatus": "DRAFT",
    "segment": {
      "routePlanRouteId": "uuid",
      "sequenceNo": 2,
      "isOutsourced": true,
      "vehicles": [],
      "outsourcing": {
        "provider": {
          "transportProviderId": "uuid",
          "providerCode": "PRV-LUFTHANSA-01",
          "providerName": "Lufthansa Cargo",
          "status": "ACTIVE",
          "supportedModes": ["AIR"]
        }
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

Gỡ về nội bộ: body `{ "lastUpdatedAt": "…", "outsourced": false }` → `isOutsourced: false`, `outsourcing: null`; hệ thống bật lại yêu cầu gán Driver/Escort ở [PS3](#ps3-phân-công-đợt-2-lần-đầu-cả-route).

| HTTP | errorCode                                    | Message                                                               |
| ---- | -------------------------------------------- | --------------------------------------------------------------------- |
| 400  | `PROVIDER_REQUIRED`                          | Please select a valid Transport Provider for this outsourced segment. |
| 404  | `ROUTE_PLAN_NOT_FOUND` / `SEGMENT_NOT_FOUND` | Route Plan / Segment not found                                        |
| 409  | `ROUTE_LOCKED`                               | The route plan can no longer be modified (use emergency change)       |
| 409  | `ROUTE_PLAN_MODIFIED`                        | The route plan was just modified. Please reload the page              |
| 409  | `PROVIDER_INACTIVE`                          | Provider is not ACTIVE                                                |
| 422  | `PROVIDER_MODE_MISMATCH`                     | The provider does not support the transport mode of this segment      |

---

## 8. Vehicle (UC-43 → UC-46)

| #   | API                     | Method & Endpoint                    | Role   |
| --- | ----------------------- | ------------------------------------ | ------ |
| VH1 | Danh sách phương tiện   | `GET /vehicles`                      | RC, LM |
| VH2 | Chi tiết phương tiện    | `GET /vehicles/{vehicleId}`          | RC, LM |
| VH3 | Thêm phương tiện        | `POST /vehicles`                     | RC, LM |
| VH4 | Sửa thông tin           | `PUT /vehicles/{vehicleId}`          | RC, LM |
| VH5 | Đổi trạng thái thủ công | `PATCH /vehicles/{vehicleId}/status` | RC, LM |

**Lỗi dùng chung:**

| HTTP | errorCode                  | Message                                                                                                                     | Dùng ở        |
| ---- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 404  | `VEHICLE_NOT_FOUND`        | Vehicle not found                                                                                                           | VH2, VH4, VH5 |
| 409  | `VEHICLE_CODE_DUPLICATED`  | Vehicle Code or License Plate already exists in the system.                                                                 | VH3           |
| 409  | `LICENSE_PLATE_DUPLICATED` | License plate is already assigned to another vehicle.                                                                       | VH3, VH4      |
| 409  | `VEHICLE_MODIFIED`         | The vehicle was just modified. Please reload the page                                                                       | VH4, VH5      |
| 409  | `VEHICLE_IN_USE`           | The transport mode cannot be changed while the vehicle is assigned to unfinished route segments                             | VH4           |
| 409  | `VEHICLE_STATUS_LOCKED`    | Vehicle is currently assigned/IN_USE on an active trip. Status is managed automatically by the trip execution system. (C25) | VH5           |

### VH1. Danh sách phương tiện

`GET /api/v1/vehicles?pageIndex=1&pageSize=20&transportMode=ROAD&status=AVAILABLE&vehicleType=HORSE_TRUCK&minCapacity=4&availableFrom=2026-10-27&availableTo=2026-11-01&search=VEH-ROAD&sortBy=vehicleCode:asc`

Chỉ trả `is_deleted = false`.

| Query                           | Type          | Bắt buộc          | Mô tả                                                                                                                                                                                     |
| ------------------------------- | ------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transportMode`                 | string        | No                | `ROAD`, `SEA`, `AIR`                                                                                                                                                                      |
| `status`                        | string        | No                | `VehicleStatus`                                                                                                                                                                           |
| `vehicleType`                   | string        | No                |                                                                                                                                                                                           |
| `minCapacity`                   | number        | No                | `capacityHorses ≥` giá trị này (route builder truyền số ngựa của Booking)                                                                                                                 |
| `availableFrom` / `availableTo` | string (date) | Cả hai hoặc không | Bật chế độ **sẵn sàng theo lịch**: trả xe `AVAILABLE` hoặc `ASSIGNED`, **không chồng lịch** chặng nào trong khoảng này và chưa hết đăng kiểm/bảo hiểm. Khi bật, mỗi item có `isAvailable` |
| `search`                        | string        | No                | `vehicleCode`, `licensePlate`, `vehicleName`                                                                                                                                              |
| `sortBy`                        | string        | No                | `vehicleCode`, `capacityHorses`, `updatedAt`. Mặc định `vehicleCode:asc`                                                                                                                  |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Vehicles retrieved successfully",
  "value": {
    "items": [
      {
        "vehicleId": "uuid",
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
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Không có xe phù hợp → `200`, `items: []` (FE hiển thị "No available vehicles matching the search criteria.", UC-43 EXC-02).

| HTTP | errorCode                | Message                                                                                |
| ---- | ------------------------ | -------------------------------------------------------------------------------------- |
| 400  | `INVALID_DATE_RANGE`     | `availableTo` must not be earlier than `availableFrom`, and both are required together |
| 400  | `INVALID_SORT_PARAMETER` | The sort parameter is invalid                                                          |

### VH2. Chi tiết phương tiện

`GET /api/v1/vehicles/{vehicleId}`

**`200 OK`** — object [`Vehicle`](#34-vehicle) + `upcomingAssignments` (lịch các chặng đã gán, UC-43 bước 5).

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Vehicle retrieved successfully",
  "value": {
    "vehicleId": "uuid",
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
        "routePlanRouteId": "uuid",
        "routePlanId": "uuid",
        "routePlanCode": "RP-20261001-0001",
        "transportPlanId": "uuid",
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

| Field                    | Type          | Bắt buộc     | Mô tả                             |
| ------------------------ | ------------- | ------------ | --------------------------------- |
| `vehicleCode`            | string        | Yes          | ≤ 50, duy nhất trên bản chưa xóa  |
| `vehicleName`            | string        | No           | ≤ 200                             |
| `transportMode`          | string        | Yes          | `ROAD`, `SEA`, `AIR`              |
| `licensePlate`           | string        | Có điều kiện | **Bắt buộc khi `ROAD`**; duy nhất |
| `vehicleType`            | string        | No           |                                   |
| `manufacturer` / `model` | string        | No           |                                   |
| `capacityHorses`         | number        | Yes          | Số nguyên **2–9** (BR-BOOKING-02) |
| `registrationNumber`     | string        | No           |                                   |
| `registrationExpiryDate` | string (date) | No           | Nếu có phải **sau hôm nay**       |
| `insuranceNumber`        | string        | No           |                                   |
| `insuranceExpiryDate`    | string (date) | No           | Nếu có phải **sau hôm nay**       |
| `specialEquipment`       | string        | No           |                                   |

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
    "vehicleId": "uuid",
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
  "isSuccess": false,
  "code": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "The input data is invalid",
  "errors": [
    {
      "field": "capacityHorses",
      "message": "Vehicle capacity must be between 2 and 9 racehorses (BR-BOOKING-02)."
    },
    {
      "field": "insuranceExpiryDate",
      "message": "Expiry date must be in the future."
    }
  ],
  "value": null
}
```

### VH4. Sửa thông tin phương tiện

UC-45. Gửi đủ các field cho phép sửa. **Không sửa** `vehicleId`, `vehicleCode`, `status` (gửi giá trị khác → `400 VALIDATION_ERROR`; đổi status dùng VH5). Đổi `transportMode` khi xe đang gán cho chặng chưa hoàn thành → `409 VEHICLE_IN_USE`.

`PUT /api/v1/vehicles/{vehicleId}`

| Field                                                                     | Type          | Bắt buộc     | Mô tả                                        |
| ------------------------------------------------------------------------- | ------------- | ------------ | -------------------------------------------- |
| `lastUpdatedAt`                                                           | string        | Yes          |                                              |
| `vehicleName`, `vehicleType`, `manufacturer`, `model`, `specialEquipment` | string        | No           |                                              |
| `transportMode`                                                           | string        | Yes          |                                              |
| `licensePlate`                                                            | string        | Có điều kiện | Bắt buộc khi `ROAD`; kiểm tra unique nếu đổi |
| `capacityHorses`                                                          | number        | Yes          | 2–9                                          |
| `registrationNumber` / `registrationExpiryDate`                           | string / date | No           | Hạn phải ở tương lai                         |
| `insuranceNumber` / `insuranceExpiryDate`                                 | string / date | No           | Hạn phải ở tương lai                         |

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
  "value": {
    "vehicleId": "uuid",
    "registrationStatus": "VALID",
    "insuranceStatus": "VALID",
    "warnings": [],
    "updatedAt": "2026-10-06T09:00:00Z"
  }
}
```

### VH5. Đổi trạng thái thủ công

UC-46. ⚠️ C25.

`PATCH /api/v1/vehicles/{vehicleId}/status`

| Field           | Type   | Bắt buộc | Mô tả                                                                          |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `lastUpdatedAt` | string | Yes      |                                                                                |
| `status`        | string | Yes      | Trạng thái đích, **chỉ** `AVAILABLE`, `MAINTENANCE`, `INACTIVE`. Gửi `ASSIGNED`/`IN_USE` → `400 VALIDATION_ERROR` |
| `reason`        | string | Yes      | Ghi chú / lý do thay đổi (DB V7 không có cột lưu riêng; đưa vào log/thông báo) |

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
  "value": {
    "vehicleId": "uuid",
    "previousStatus": "AVAILABLE",
    "status": "MAINTENANCE",
    "updatedAt": "2026-10-06T10:00:00Z"
  }
}
```

Xe sang trạng thái khác `AVAILABLE` tự động bị ẩn khỏi danh sách gợi ý khi lập route/phân công (UC-46 ALT-01). Xe **hiện đang** `ASSIGNED` hoặc `IN_USE` → `409 VEHICLE_STATUS_LOCKED` (khác với trạng thái đích ở trên). Thiếu `reason` → `400 VALIDATION_ERROR`.

---

## 9. Route Plan (UC-33, UC-37 → UC-40)

| #   | API                               | Method & Endpoint                                     | Role                              |
| --- | --------------------------------- | ----------------------------------------------------- | --------------------------------- |
| RP1 | Tạo Route Plan (chính / dự phòng / quay về) | `POST /transport-plans/{transportPlanId}/route-plans` | RC (PRIMARY, BACKUP, RETURN); LM (BACKUP) |
| RP2 | Danh sách Route Plan của plan     | `GET /transport-plans/{transportPlanId}/route-plans`  | RC, LM, TS                        |
| RP3 | Chi tiết Route Plan               | `GET /route-plans/{routePlanId}`                      | RC, LM, TS                        |
| RP4 | Sửa Route Plan                    | `PUT /route-plans/{routePlanId}`                      | RC (PRIMARY, BACKUP, RETURN); LM (BACKUP) |
| RP5 | Hủy Route Plan                    | `POST /route-plans/{routePlanId}/cancel`              | RC; LM (BACKUP)                   |
| RP6 | Xuất PDF                          | `GET /route-plans/{routePlanId}/export`               | RC, LM                            |

> RP7 (TS xác nhận pháp lý) ở [Mục 10](#10-xác-nhận-pháp-lý-của-ts-uc-33-uc-39). Không còn bước Manager duyệt riêng.

**Lỗi dùng chung:**

| HTTP | errorCode                                                      | Message                                                                                                                                       | Dùng ở    |
| ---- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 404  | `TRANSPORT_PLAN_NOT_FOUND`                                     | Transport Plan not found                                                                                                                      | RP1, RP2  |
| 404  | `ROUTE_PLAN_NOT_FOUND`                                         | Route Plan not found                                                                                                                          | RP3 → RP6 |
| 404  | `ROUTE_NOT_FOUND` / `LOCATION_NOT_FOUND` / `VEHICLE_NOT_FOUND` | Route / Location / Vehicle not found                                                                                                          | RP1, RP4  |
| 409  | `PRIMARY_ROUTE_PLAN_EXISTS`                                    | A primary route plan already exists for this transport plan                                                                                   | RP1       |
| 409  | `PRIMARY_ROUTE_PLAN_REQUIRED`                                  | A backup route plan requires an existing primary route plan                                                                                   | RP1       |
| 409  | `DOSSIER_LOCKED`                                               | A backup route plan cannot be created once the compliance dossier is past IN_PREPARATION                                                      | RP1       |
| 409  | `DOSSIER_NOT_APPROVED`                                         | A return route plan requires an approved compliance dossier (Transport is in transit)                                                         | RP1, EC2  |
| 409  | `RETURN_ROUTE_PLAN_EXISTS`                                     | A return route plan already exists for this transport plan                                                                                    | RP1       |
| 409  | `TRANSPORT_NOT_IN_TRANSIT`                                     | A return route plan can only be created while the transport is in transit                                                                     | RP1, EC1–EC3 |
| 409  | `IDENTICAL_CONTINGENCY_ROUTE`                                  | Contingency route cannot be identical to the primary route. Please select alternative waypoints or border checkpoints.                        | RP1, RP4  |
| 422  | `BACKUP_NOT_ANCHORED`                                          | The backup route must start and end on locations of the primary route (R16)                                                                   | RP1, RP4  |
| 409  | `INVALID_ROUTE_PLAN_STATUS`                                    | This action cannot be performed while the route plan is in {status} status                                                                    | RP4, RP5  |
| 409  | `RETURN_NOT_APPROVED`                                          | A return route plan cannot be submitted for legal review before the Logistics Manager approves it (EC2)                                       | RP4       |
| 409  | `RETURN_ALREADY_APPROVED`                                      | An approved return route plan cannot be cancelled                                                                                             | RP5       |
| 409  | `ROUTE_LOCKED`                                                 | Transport is currently in transit. Please use Emergency Route Change (UC-48) for in-transit modifications.                                    | RP4       |
| 409  | `ROUTE_PLAN_MODIFIED`                                          | The route plan was just modified. Please reload the page                                                                                      | RP4, RP5  |
| 409  | `SCHEDULE_CONFLICT`                                            | A selected vehicle is already assigned during this time slot                                                                                  | RP1, RP4  |
| 422  | `DEPOSIT_REQUIRED`                                             | The deposit must be paid before a route plan can be created                                                                                   | RP1       |
| 422  | `REST_RULE_VIOLATION`                                          | Violation of mandatory rest rules (BR-033/BR-034). Maximum continuous driving time is 8 hours and mandatory 24h rest for trips over 24 hours. | RP1, RP4  |
| 422  | `BCP_REQUIRED`                                                 | A cross-border transport requires at least one Border Control Post                                                                            | RP1, RP4  |
| 422  | `SEGMENT_NOT_CONTINUOUS`                                       | Segments must be continuous: each segment must start where the previous one ends                                                              | RP1, RP4  |
| 422  | `VEHICLE_MODE_MISMATCH`                                        | The vehicle transport mode does not match the segment                                                                                         | RP1, RP4  |
| 422  | `VEHICLE_UNAVAILABLE`                                          | The vehicle is not available (status / expired registration or insurance)                                                                     | RP1, RP4  |
| 422  | `VEHICLE_CAPACITY_EXCEEDED`                                    | Total vehicle capacity is lower than the number of horses in the booking                                                                      | RP1, RP4  |
| 422  | `OUTSOURCED_SEGMENT`                                           | An outsourced segment cannot have vehicles, driver or escort                                                                                  | RP1, RP4  |
| 422  | `PROVIDER_MODE_MISMATCH`                                       | The provider does not support the transport mode of this segment                                                                              | RP1, RP4  |

### 9.1. Cấu trúc `segments[]` khi tạo/sửa

| Field                             | Type   | Bắt buộc     | Mô tả                                                                                             |
| --------------------------------- | ------ | ------------ | ------------------------------------------------------------------------------------------------- |
| `sequenceNo`                      | number | Yes          | Liền từ 1                                                                                         |
| `routeId`                         | uuid   | Có điều kiện | Route master có sẵn. **Hoặc** dùng 3 field dưới (R13)                                             |
| `fromLocationId` / `toLocationId` | uuid   | Có điều kiện | Khi không gửi `routeId`                                                                           |
| `transportMode`                   | string | Có điều kiện | Khi không gửi `routeId`                                                                           |
| `plannedDepartureAt`              | string | Yes          |                                                                                                   |
| `plannedArrivalAt`                | string | Yes          | Sau `plannedDepartureAt`                                                                          |
| `vehicleIds`                      | uuid[] | No           | Chỉ chặng nội bộ; ≥ 1 khi `SUBMIT_FOR_LEGAL_REVIEW`                                               |
| `outsourcing`                     | object | No           | Chặng thuê ngoài: `{ transportProviderId, note }` (UC-33 bước 4). Có field này ⇒ chặng thuê ngoài |
| `note`                            | string | No           | Ví dụ "BCP Calais"                                                                                |

> Trạm dừng nghỉ/BCP **không** là mảng riêng: chúng là `Location` nối giữa 2 chặng liên tiếp, thời gian dừng = khoảng cách giữa `plannedArrivalAt` chặng trước và `plannedDepartureAt` chặng sau.

### RP1. Tạo Route Plan (chính / dự phòng)

UC-33 (PRIMARY), UC-37 (BACKUP) và UC-48 (RETURN, R17). Mọi chặng của RoutePlan mới nhận `route_type` = `routeType` của request (R11).

`POST /api/v1/transport-plans/{transportPlanId}/route-plans`

Điều kiện: Booking `APPROVED`; `TransportPlan.status = APPROVED` (R3). BACKUP yêu cầu đã có PRIMARY chưa hủy và chỉ chứa **đoạn thay thế** của primary (R16). **Tạo BACKUP** còn đưa `ComplianceDossier` `IN_PREPARATION → DRAFT` trong cùng transaction để TS thẩm định lại qua RP7 (mục 2.2). **RETURN** (R17): chỉ khi `Transport.status = IN_TRANSIT`, đã có PRIMARY, CDos `APPROVED`, chưa có RETURN chưa hủy; **không** đổi CDos và không thông báo TS, chỉ thông báo LM (`URGENT`); `action = SUBMIT_FOR_LEGAL_REVIEW` với RETURN → `400 VALIDATION_ERROR`.

| Field       | Type   | Bắt buộc               | Mô tả                                                                                                           |
| ----------- | ------ | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `routeType` | string | Yes                    | `PRIMARY` \| `BACKUP` \| `RETURN`                                                                              |
| `segments`  | array  | Yes                    | ≥ 1 chặng, [9.1](#91-cấu-trúc-segments-khi-tạosửa)                                                              |
| `routeNote` | string | Khi `BACKUP`, `RETURN` | Ghi chú; với BACKUP là lý do lập dự phòng, với RETURN là lý do quay đầu khẩn cấp (≥ 10 ký tự)                    |
| `action`    | string | Yes                    | `SAVE_DRAFT` (→ `DRAFT`, không báo TS) \| `SUBMIT_FOR_LEGAL_REVIEW` (vẫn `DRAFT`, notify TS). RETURN chỉ dùng `SAVE_DRAFT` |

```json
{
  "routeType": "PRIMARY",
  "segments": [
    {
      "sequenceNo": 1,
      "routeId": "uuid",
      "plannedDepartureAt": "2026-10-27T06:00:00Z",
      "plannedArrivalAt": "2026-10-27T08:00:00Z",
      "vehicleIds": ["uuid"],
      "note": "Stable to CDG cargo"
    },
    {
      "sequenceNo": 2,
      "fromLocationId": "uuid",
      "toLocationId": "uuid",
      "transportMode": "AIR",
      "plannedDepartureAt": "2026-10-27T14:00:00Z",
      "plannedArrivalAt": "2026-10-27T15:30:00Z",
      "outsourcing": {
        "transportProviderId": "uuid",
        "note": "Lufthansa Cargo"
      },
      "note": "Air leg CDG-LHR"
    },
    {
      "sequenceNo": 3,
      "routeId": "uuid",
      "plannedDepartureAt": "2026-10-27T17:00:00Z",
      "plannedArrivalAt": "2026-10-27T19:30:00Z",
      "vehicleIds": ["uuid"],
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
    "routePlanId": "uuid",
    "routePlanCode": "RP-20261001-0001",
    "transportPlanId": "uuid",
    "bookingId": "uuid",
    "bookingCode": "REQ-20261001-0005",
    "routeType": "PRIMARY",
    "status": "DRAFT",
    "isCrossBorder": true,
    "totalDistanceKm": 612.4,
    "estimatedDurationMinutes": 750,
    "plannedDepartureAt": "2026-10-27T06:00:00Z",
    "plannedArrivalAt": "2026-10-27T19:30:00Z",
    "segments": [
      {
        "routePlanRouteId": "uuid",
        "sequenceNo": 1,
        "routeType": "PRIMARY",
        "route": {
          "routeId": "uuid",
          "routeCode": "RT-STB-CDG-ROAD",
          "routeName": "Paris Stable - CDG Cargo",
          "transportMode": "ROAD",
          "distanceKm": 48.2,
          "estimatedDurationMinutes": 110
        },
        "fromLocation": {
          "locationId": "uuid",
          "locationName": "Paris Stable",
          "locationType": "STABLE",
          "city": "Paris",
          "country": "FR"
        },
        "toLocation": {
          "locationId": "uuid",
          "locationName": "Paris CDG Airport",
          "locationType": "AIRPORT",
          "city": "Paris",
          "country": "FR"
        },
        "plannedDepartureAt": "2026-10-27T06:00:00Z",
        "plannedArrivalAt": "2026-10-27T08:00:00Z",
        "actualDepartureAt": null,
        "actualArrivalAt": null,
        "status": "PENDING",
        "dwellAfterMinutes": 360,
        "isOutsourced": false,
        "vehicles": [
          {
            "vehicleId": "uuid",
            "vehicleCode": "VEH-ROAD-005",
            "vehicleName": "Horse Truck 05",
            "licensePlate": "29C-99988",
            "transportMode": "ROAD",
            "capacityHorses": 6
          }
        ],
        "outsourcing": null,
        "driver": null,
        "escort": null,
        "note": "Stable to CDG cargo"
      },
      {
        "routePlanRouteId": "uuid",
        "sequenceNo": 2,
        "routeType": "PRIMARY",
        "route": {
          "routeId": "uuid",
          "routeCode": "RT-CDG-LHR-AIR",
          "routeName": "CDG - LHR",
          "transportMode": "AIR",
          "distanceKm": 350.0,
          "estimatedDurationMinutes": 90
        },
        "fromLocation": {
          "locationId": "uuid",
          "locationName": "Paris CDG Airport",
          "locationType": "AIRPORT",
          "city": "Paris",
          "country": "FR"
        },
        "toLocation": {
          "locationId": "uuid",
          "locationName": "London Heathrow",
          "locationType": "AIRPORT",
          "city": "London",
          "country": "GB"
        },
        "plannedDepartureAt": "2026-10-27T14:00:00Z",
        "plannedArrivalAt": "2026-10-27T15:30:00Z",
        "actualDepartureAt": null,
        "actualArrivalAt": null,
        "status": "PENDING",
        "dwellAfterMinutes": 90,
        "isOutsourced": true,
        "vehicles": [],
        "outsourcing": {
          "provider": {
            "transportProviderId": "uuid",
            "providerCode": "PRV-LUFTHANSA-01",
            "providerName": "Lufthansa Cargo",
            "status": "ACTIVE",
            "supportedModes": ["AIR"]
          }
        },
        "driver": null,
        "escort": null,
        "note": "Air leg CDG-LHR"
      },
      {
        "routePlanRouteId": "uuid",
        "sequenceNo": 3,
        "routeType": "PRIMARY",
        "route": {
          "routeId": "uuid",
          "routeCode": "RT-LHR-NMK-ROAD",
          "routeName": "LHR - Newmarket",
          "transportMode": "ROAD",
          "distanceKm": 214.2,
          "estimatedDurationMinutes": 150
        },
        "fromLocation": {
          "locationId": "uuid",
          "locationName": "London Heathrow",
          "locationType": "AIRPORT",
          "city": "London",
          "country": "GB"
        },
        "toLocation": {
          "locationId": "uuid",
          "locationName": "Newmarket Stables",
          "locationType": "STABLE",
          "city": "Newmarket",
          "country": "GB"
        },
        "plannedDepartureAt": "2026-10-27T17:00:00Z",
        "plannedArrivalAt": "2026-10-27T19:30:00Z",
        "actualDepartureAt": null,
        "actualArrivalAt": null,
        "status": "PENDING",
        "dwellAfterMinutes": null,
        "isOutsourced": false,
        "vehicles": [
          {
            "vehicleId": "uuid",
            "vehicleCode": "VEH-ROAD-006",
            "vehicleName": "Horse Truck 06",
            "licensePlate": "GB-HT-0006",
            "transportMode": "ROAD",
            "capacityHorses": 6
          }
        ],
        "outsourcing": null,
        "driver": null,
        "escort": null,
        "note": "LHR to Newmarket Stables"
      }
    ],
    "isPersonnelComplete": false,
    "legalReview": null,
    "replacesSequenceNo": null,
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
  "segments": [
    {
      "sequenceNo": 1,
      "routeId": "uuid",
      "plannedDepartureAt": "2026-10-27T06:00:00Z",
      "plannedArrivalAt": "2026-10-27T11:00:00Z",
      "vehicleIds": ["uuid"],
      "note": "BCP Dunkirk"
    },
    {
      "sequenceNo": 2,
      "fromLocationId": "uuid",
      "toLocationId": "uuid",
      "transportMode": "SEA",
      "plannedDepartureAt": "2026-10-27T12:00:00Z",
      "plannedArrivalAt": "2026-10-27T18:00:00Z",
      "outsourcing": {
        "transportProviderId": "uuid",
        "note": "Dunkirk to UK"
      }
    }
  ],
  "routeNote": "Backup in case Heathrow cargo apron is congested (via Dunkirk)",
  "action": "SAVE_DRAFT"
}
```

Response `201` cùng cấu trúc, `routeType: "BACKUP"`, `status: "DRAFT"`, `replacesSequenceNo: { "from": 1, "to": 2 }`. Khi `SUBMIT_FOR_LEGAL_REVIEW` hệ thống notify TS để chuẩn bị giấy tờ cho tuyến dự phòng (UC-37 bước 7, AC-002).

**Return (UC-48 EXC-01, R17).** Cùng cấu trúc request với `"routeType": "RETURN"` và `"action": "SAVE_DRAFT"`; `routeNote` là lý do. Response `201` cùng cấu trúc, `routeType: "RETURN"`, `status: "DRAFT"`. Đây chính là yêu cầu gửi LM; LM duyệt ở [EC2](#12-thay-đổi-lộ-trình-khẩn-cấp-uc-48).

### RP2. Danh sách Route Plan của Transport Plan

UC-38 (chuyển tab tuyến chính / dự phòng), UC-37 (danh sách dự phòng, SCR-F3-013).

`GET /api/v1/transport-plans/{transportPlanId}/route-plans?routeType=BACKUP&includeCancelled=false`

| Query              | Type    | Bắt buộc | Mô tả                                                                                        |
| ------------------ | ------- | -------- | -------------------------------------------------------------------------------------------- |
| `routeType`        | string  | No       | `PRIMARY` \| `BACKUP` \| `RETURN` (suy ra từ `route_type` các chặng, R11); bỏ trống = tất cả |
| `status`           | string  | No       | `RoutePlanStatus`                                                                            |
| `includeCancelled` | boolean | No       | Mặc định `false`                                                                             |

**`200 OK`** — không phân trang (một plan chỉ có vài phương án).

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plans retrieved successfully",
  "value": {
    "items": [
      {
        "routePlanId": "uuid",
        "routePlanCode": "RP-20261001-0001",
        "routeType": "PRIMARY",
        "status": "DRAFT",
        "totalDistanceKm": 612.4,
        "estimatedDurationMinutes": 750,
        "segmentCount": 3,
        "isPersonnelComplete": false,
        "replacesSequenceNo": null,
        "routeNote": "Direct air route",
        "updatedAt": "2026-10-08T08:00:00Z"
      },
      {
        "routePlanId": "uuid",
        "routePlanCode": "RP-20261001-0002",
        "routeType": "BACKUP",
        "status": "DRAFT",
        "totalDistanceKm": 340.0,
        "estimatedDurationMinutes": 720,
        "segmentCount": 2,
        "isPersonnelComplete": false,
        "replacesSequenceNo": { "from": 1, "to": 2 },
        "routeNote": "Backup via Dunkirk",
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

**`200 OK`** — `value` là object [`RoutePlan`](#36-routeplan) đầy đủ như response `201` của RP1, bổ sung `legalReview` khi TS đã xác nhận:

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plan retrieved successfully",
  "value": {
    "routePlanId": "uuid",
    "routePlanCode": "RP-20261001-0001",
    "transportPlanId": "uuid",
    "bookingId": "uuid",
    "bookingCode": "REQ-20261001-0005",
    "routeType": "PRIMARY",
    "status": "CONFIRMED",
    "isCrossBorder": true,
    "totalDistanceKm": 612.4,
    "estimatedDurationMinutes": 750,
    "plannedDepartureAt": "2026-10-27T06:00:00Z",
    "plannedArrivalAt": "2026-10-27T19:30:00Z",
    "segments": ["…cùng cấu trúc Segment như RP1…"],
    "isPersonnelComplete": false,
    "legalReview": {
      "isFeasible": true,
      "note": "All required permits are obtainable",
      "blockedSegments": [],
      "reviewedBy": {
        "employeeId": "uuid",
        "employeeCode": "EMP-2026-021",
        "fullName": "Nguyen Van A",
        "role": "TRANSPORT_SPECIALIST"
      },
      "reviewedAt": "2026-10-09T08:00:00Z"
    },
    "replacesSequenceNo": null,
    "routeNote": "Direct air route",
    "createdAt": "2026-10-08T08:00:00Z",
    "updatedAt": "2026-10-09T10:00:00Z"
  }
}
```

> `"…cùng cấu trúc Segment như RP1…"` chỉ là chú thích rút gọn trong tài liệu; response thật trả mảng `Segment` đầy đủ.

### RP4. Sửa Route Plan

UC-39 (PRIMARY), UC-37 (BACKUP) và RETURN (sau khi LM duyệt ở EC2). Ghi đè toàn bộ `segments` (thêm/sửa/xóa chặng). Chỉ khi `status = DRAFT` (kể cả sau khi TS báo không khả thi). `CONFIRMED` trở đi → `409 ROUTE_LOCKED` (đổi lộ trình khi đang chạy dùng UC-48). Chặng cũ bị xóa trong lần sửa được ghi audit (AC-002 UC-33). RoutePlan `RETURN` chỉ gửi thẩm định (`SUBMIT_FOR_LEGAL_REVIEW`) được sau khi LM duyệt ở EC2; trước đó → `409 RETURN_NOT_APPROVED`.

`PUT /api/v1/route-plans/{routePlanId}`

| Field           | Type   | Bắt buộc | Mô tả                                                                                    |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `lastUpdatedAt` | string | Yes      | Optimistic locking (UC-39 Non-Functional)                                                |
| `updateReason`  | string | Yes      | Lý do cập nhật lộ trình (UC-39 bước 4); đưa vào thông báo cho TS, không có cột lưu riêng |
| `segments`      | array  | Yes      | Toàn bộ chặng mới, [9.1](#91-cấu-trúc-segments-khi-tạosửa)                               |
| `routeNote`     | string | No       |                                                                                          |
| `action`        | string | Yes      | `SAVE_DRAFT` \| `SUBMIT_FOR_LEGAL_REVIEW` ("Lưu & Gửi Thẩm định Pháp lý")                |

```json
{
  "lastUpdatedAt": "2026-10-08T08:00:00Z",
  "updateReason": "TS reported the original BCP cannot be permitted",
  "segments": [
    {
      "sequenceNo": 1,
      "routeId": "uuid",
      "plannedDepartureAt": "2026-10-27T06:00:00Z",
      "plannedArrivalAt": "2026-10-27T11:00:00Z",
      "vehicleIds": ["uuid"],
      "note": "BCP Dunkirk"
    },
    {
      "sequenceNo": 2,
      "fromLocationId": "uuid",
      "toLocationId": "uuid",
      "transportMode": "SEA",
      "plannedDepartureAt": "2026-10-27T12:00:00Z",
      "plannedArrivalAt": "2026-10-27T18:00:00Z",
      "outsourcing": {
        "transportProviderId": "uuid"
      }
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
    "routePlanId": "uuid",
    "status": "DRAFT",
    "totalDistanceKm": 340.0,
    "estimatedDurationMinutes": 720,
    "segmentCount": 2,
    "isPersonnelComplete": false,
    "updatedAt": "2026-10-08T12:00:00Z"
  }
}
```

> Response thu gọn để FE cập nhật nhanh; cần dữ liệu đầy đủ thì gọi lại RP3. Khi `SUBMIT_FOR_LEGAL_REVIEW` hệ thống notify TS (UC-39 bước 6).

### RP5. Hủy Route Plan

UC-40 (PRIMARY, RC) và UC-37 (BACKUP, soft-cancel). Chỉ khi `DRAFT`; RoutePlan `RETURN` đã được LM duyệt ở EC2 (CDos đã mở lại) không hủy được → `409 RETURN_ALREADY_APPROVED`; `CONFIRMED` trở đi → `409 INVALID_ROUTE_PLAN_STATUS` (message "Cannot cancel a Confirmed Route Plan. Please contact Logistics Manager if a route change is required."). Giải phóng xe đã giữ chỗ. Không đổi trạng thái Booking hay TransportPlan.

`POST /api/v1/route-plans/{routePlanId}/cancel`

```json
{ "lastUpdatedAt": "2026-10-08T08:00:00Z", "reason": "Created by mistake" }
```

`reason` bắt buộc; ghi vào `RoutePlan.route_note` (DB V7 không có cột lý do hủy riêng).

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plan cancelled successfully",
  "value": {
    "routePlanId": "uuid",
    "status": "CANCELLED",
    "cancelledAt": "2026-10-08T12:30:00Z",
    "bookingStatus": "APPROVED"
  }
}
```

### RP6. Xuất PDF

UC-38 ALT-01 (SCR-F3-033).

`GET /api/v1/route-plans/{routePlanId}/export?format=pdf`

| Query    | Type   | Bắt buộc | Mô tả                     |
| -------- | ------ | -------- | ------------------------- |
| `format` | string | No       | Hiện chỉ `pdf` (mặc định) |

**`200 OK`** — **không** dùng envelope JSON:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="RP-20261001-0001.pdf"
```

Lỗi (`404 ROUTE_PLAN_NOT_FOUND`, `400 VALIDATION_ERROR` khi `format` khác `pdf`) vẫn trả JSON theo envelope lỗi.

---

## 10. Xác nhận pháp lý của TS (UC-33, UC-39)

| #   | API                           | Method & Endpoint                              | Role                |
| --- | ----------------------------- | ---------------------------------------------- | ------------------- |
| RP7 | TS xác nhận / từ chối pháp lý | `POST /route-plans/{routePlanId}/legal-review` | TS (được phân công) |

> Đã **bỏ RP8** (Manager duyệt/từ chối). Theo UC-33/36 và ERD V7, việc TS xác nhận khả thi chính là `CONFIRMED`, và `CONFIRMED` mở upload cho Customer + phân công đợt 2 . Kết quả thẩm định **không có bảng riêng** (C07): lưu ở audit và `ComplianceDossier`.

**Lỗi dùng chung:**

| HTTP | errorCode                   | Message                                                                                        |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| 404  | `ROUTE_PLAN_NOT_FOUND`      | Route Plan not found                                                                           |
| 409  | `INVALID_ROUTE_PLAN_STATUS` | This action cannot be performed while the route plan is in {status} status                     |
| 409  | `ROUTE_PLAN_MODIFIED`       | The route plan was just modified. Please reload the page                                       |
| 409  | `DOSSIER_NOT_INITIALIZED`   | Apply a Dossier Template (create the ComplianceDossier) before confirming the route plan (RP7) |

### RP7. TS xác nhận / từ chối tính khả thi pháp lý

UC-33 bước 7 và ALT-01; UC-39 bước 7. Chỉ khi `DRAFT`. Atomic (R14). Áp dụng cho RoutePlan PRIMARY, BACKUP và RETURN (nhánh RETURN ở cuối mục).

`POST /api/v1/route-plans/{routePlanId}/legal-review`

| Field             | Type     | Bắt buộc                 | Mô tả                                                     |
| ----------------- | -------- | ------------------------ | --------------------------------------------------------- |
| `lastUpdatedAt`   | string   | Yes                      |                                                           |
| `isFeasible`      | boolean  | Yes                      | `true` = "xin được hết"                                   |
| `note`            | string   | Khi `isFeasible = false` | Lý do cụ thể (quốc gia/cửa khẩu không xin được giấy phép) |
| `blockedSegments` | number[] | No                       | `sequenceNo` các chặng có vấn đề                          |

```json
{
  "lastUpdatedAt": "2026-10-08T12:00:00Z",
  "isFeasible": true,
  "note": "All required permits are obtainable"
}
```

```json
{
  "lastUpdatedAt": "2026-10-08T12:00:00Z",
  "isFeasible": false,
  "note": "Calais BCP cannot be permitted due to local disease restriction",
  "blockedSegments": [1]
}
```

**`isFeasible = true`** — trong cùng transaction: `ComplianceDossier` của Transport `DRAFT → IN_PREPARATION` (**CDos phải tồn tại ở `DRAFT`**, chưa có → `409 DOSSIER_NOT_INITIALIZED`: TS cần Apply Template trước), kéo theo `RoutePlan` tự `DRAFT → CONFIRMED`; mở upload giấy tờ cho Customer; mở phân công đợt 2 (PS3, chỉ với RoutePlan PRIMARY); gán xe `ASSIGNED` (R10); ghi `AuditDossier` (CDos và RoutePlan); notify Customer ("Lộ trình di chuyển đã được xác nhận. Vui lòng tải lên các giấy tờ pháp lý theo yêu cầu."), RC và LM.

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route plan confirmed successfully",
  "value": {
    "routePlanId": "uuid",
    "status": "CONFIRMED",
    "legalReview": {
      "isFeasible": true,
      "note": "All required permits are obtainable",
      "blockedSegments": [],
      "reviewedBy": {
        "employeeId": "uuid",
        "employeeCode": "EMP-2026-021",
        "fullName": "Nguyen Van A",
        "role": "TRANSPORT_SPECIALIST"
      },
      "reviewedAt": "2026-10-09T08:00:00Z"
    },
    "customerUploadEnabled": true,
    "personnelAssignmentPhase2Enabled": true,
    "updatedAt": "2026-10-09T08:00:00Z"
  }
}
```

**`isFeasible = false`** — route **giữ `DRAFT`**, ghi `AuditDossier`, notify RC kèm `note` để chỉnh lộ trình (RP4). Response `status: "DRAFT"`, `legalReview.isFeasible: false`, `customerUploadEnabled: false`, `personnelAssignmentPhase2Enabled: false`.

| HTTP | errorCode          | Message                                      |
| ---- | ------------------ | -------------------------------------------- |
| 400  | `VALIDATION_ERROR` | `note` là bắt buộc khi `isFeasible = false`  |
| 403  | `FORBIDDEN`        | Chỉ TS được phân công vào Transport Plan này |
| 409  | `RETURN_NOT_APPROVED` | RoutePlan RETURN chưa được LM duyệt (CDos chưa mở lại `DRAFT`, EC2) |

**Nhánh RETURN (R17, mục 12.2 bước 4).** Chỉ khi LM đã duyệt ở EC2 (CDos `DRAFT`), nếu không → `409 RETURN_NOT_APPROVED`. `isFeasible = true`: cùng transaction CDos `DRAFT → IN_PREPARATION → READY_FOR_SUBMISSION → SUBMITTED → APPROVED` (ghi `AuditDossier` từng bước; Customer không nộp thêm nên không có bước nộp), RoutePlan `DRAFT → CONFIRMED`. **Không** mở upload cho Customer (`customerUploadEnabled: false`), **không** mở phân công đợt 2 (`personnelAssignmentPhase2Enabled: false`, Driver/Escort giữ nguyên), không thông báo Customer. Thông báo LM (để gán xe/provider và kích hoạt bằng EC3) và RC. `isFeasible = false` như trên: route giữ `DRAFT`, notify RC.

---

## 11. Phân công nhân sự (UC-36)

Phân công 2 đợt. Quy tắc dưới đây dựa trên UC-34/36, `EmployeeTransportPlan` và `RoutePlanRoute` của DB V7. **Phân công lần đầu dùng `POST`, đổi người dùng `PUT`** (đổi bắt buộc `reason`).

| #   | API                                | Method & Endpoint                                                      | Role                       |
| --- | ---------------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| PS6 | Danh sách nhân sự có thể phân công | `GET /employees/assignable`                                            | LM                         |
| PS1 | Phân công đợt 1 lần đầu (TS + RC)  | `POST /transport-plans/{transportPlanId}/assignments/phase-1`          | LM                         |
| PS5 | Đổi nhân sự đợt 1 (TS và/hoặc RC)  | `PUT /transport-plans/{transportPlanId}/assignments/phase-1`           | LM                         |
| PS2 | Xem phân công (cả 2 đợt)           | `GET /transport-plans/{transportPlanId}/assignments`                   | LM, RC, TS, Driver, Escort |
| PS3 | Phân công đợt 2 lần đầu (cả route) | `POST /route-plans/{routePlanId}/personnel`                            | LM                         |
| PS4 | Đổi nhân sự một chặng (đợt 2)      | `PUT /route-plans/{routePlanId}/segments/{routePlanRouteId}/personnel` | LM                         |

### 11.0. Quy tắc nghiệp vụ (tóm tắt)

| Nội dung                | Quy tắc                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Khi nào phân công đợt 1 | Sau khi khách đã đồng ý/cọc: `TransportPlan.status = APPROVED` (UC-36 precondition). Chưa đạt → `422 DEPOSIT_REQUIRED`. LM chọn 1 TS + 1 RC. Đợt 1 không phải lúc tạo TransportPlan (TP1 không còn nhận TS/RC).                                                                                                                                              |
| Ai thấy gì sau đợt 1    | TS và RC được thông báo và thấy booking/plan trong AB1/AB2 (UC-32); trước khi được phân công họ không thấy.                                                                                                                                                                                                                                                  |
| Kích hoạt đợt 2         | **Tự động, không có API riêng**: khi RoutePlan PRIMARY `CONFIRMED` (TS thẩm định RP7, CDos `IN_PREPARATION`) thì `phase2.enabled = true` trong PS2.                                                                                                                                                                                                          |
| Đổi đợt 1               | Được, **chỉ khi chưa mở đợt 2** (`phase2.enabled = false`). Đã mở đợt 2 → `409 PHASE1_LOCKED` (khóa đợt 1). UC-36 chỉ nêu ALT-01 cho Driver; việc khóa đợt 1 theo yêu cầu nghiệp vụ, UC chưa viết.                                                                                                                                                           |
| Đổi đợt 2               | Được trước khi khởi hành, **theo từng chặng** (PS4), bắt buộc `reason` (UC-36 ALT-01). Chặng đã `IN_PROGRESS/COMPLETED` → `409 SEGMENT_LOCKED`; plan đã `IN_PROGRESS/COMPLETED/CANCELLED` → `409 PLAN_LOCKED`.                                                                                                                                               |
| Trùng lịch              | Đợt 2: server kiểm tra khi lưu (PS3/PS4) → `409 SCHEDULE_CONFLICT` nếu Driver/Escort đã có chặng khác trùng khoảng `planned_departure_at`–`planned_arrival_at` (UC-36 EXC-02 nêu Driver; áp dụng cả Escort). Đợt 1 (TS/RC): không kiểm tra lịch; PS6 trả mọi nhân viên đang hoạt động đúng role. PS6 đã lọc sẵn Driver/Escort rảnh, lúc lưu BE kiểm tra lại. |
| Chặng thuê ngoài        | Không gán Driver/Escort (`transport_provider_id` có giá trị) → `422 OUTSOURCED_SEGMENT`.                                                                                                                                                                                                                                                                     |
| Lưu ở đâu               | `EmployeeTransportPlan` `(employee_id, transport_plan_id)` (mỗi nhân viên 1 dòng/plan, `responsibility` = giá trị `employee_role`, `is_primary = true` cho TS/RC) và `RoutePlanRoute.driver_employee_id` / `escort_employee_id`.                                                                                                                             |
| Employee role           | Dùng đúng `employee_role` của DB: `LOGISTICS_MANAGER`, `TRANSPORT_SPECIALIST`, `FLEET_ROUTE_COORDINATOR`, `DRIVER`, `ESCORT`.                                                                                                                                                                                                                                |

> ⚠️ C05.

**Lỗi dùng chung:**

| HTTP | errorCode                                                                                        | Message                                                                                        | Dùng ở             |
| ---- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------ |
| 404  | `TRANSPORT_PLAN_NOT_FOUND` / `ROUTE_PLAN_NOT_FOUND` / `SEGMENT_NOT_FOUND` / `EMPLOYEE_NOT_FOUND` | Not found                                                                                      | tất cả             |
| 409  | `PLAN_LOCKED`                                                                                    | Cannot change assignments once the transport is in progress, completed or cancelled            | PS1, PS5, PS3, PS4 |
| 422  | `DEPOSIT_REQUIRED`                                                                               | The deposit must be paid before the Transport Specialist and Route Coordinator can be assigned | PS1                |
| 409  | `PHASE1_ALREADY_ASSIGNED`                                                                        | Phase 1 has already been assigned. Use PUT to change personnel                                 | PS1                |
| 409  | `PHASE1_NOT_ASSIGNED`                                                                            | Phase 1 has not been assigned yet. Use POST to assign                                          | PS5                |
| 409  | `PHASE1_LOCKED`                                                                                  | Phase 1 cannot be changed once Phase 2 is open (Route Plan confirmed)                          | PS5                |
| 409  | `TRANSPORT_PLAN_MODIFIED` / `ROUTE_PLAN_MODIFIED`                                                | The plan was just modified. Please reload the page                                             | PS5 / PS3, PS4     |
| 422  | `ROUTE_NOT_CONFIRMED`                                                                            | Cannot assign Driver and Escort until Route Plan is Confirmed                                  | PS3, PS4           |
| 409  | `SEGMENT_ALREADY_ASSIGNED`                                                                       | The segment already has a Driver/Escort. Use PUT on the segment to change personnel            | PS3                |
| 409  | `SEGMENT_LOCKED`                                                                                 | The segment is in progress or completed                                                        | PS4                |
| 409  | `SCHEDULE_CONFLICT`                                                                              | Driver EMP-XXXX-XXX is already assigned to Transport TP-YYYYMMDD-XXXX during this time slot.   | PS3, PS4           |
| 422  | `INVALID_ROLE_ASSIGNMENT`                                                                        | The selected employee does not have the required role or is not active                         | PS1, PS5, PS3, PS4 |
| 422  | `OUTSOURCED_SEGMENT`                                                                             | An outsourced segment cannot have a driver or escort                                           | PS3, PS4           |

### PS6. Danh sách nhân sự có thể phân công

UC-36: dropdown chọn nhân sự theo role. BE đã **lọc sẵn**, FE chỉ hiển thị danh sách trả về, không có màn hình quản lý lịch nhân sự. Flow 1 A12 (`GET /employees`) chỉ phục vụ quản lý tài khoản nên không dùng cho dropdown phân công.

`GET /api/v1/employees/assignable?role=DRIVER&availableFrom=2026-10-27T06:00:00Z&availableTo=2026-10-27T08:00:00Z&search=nam&pageIndex=1&pageSize=20`

| Query                           | Type   | Bắt buộc     | Mô tả                                                                                                                                                            |
| ------------------------------- | ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`                          | string | Yes          | `TRANSPORT_SPECIALIST`, `FLEET_ROUTE_COORDINATOR`, `DRIVER` hoặc `ESCORT` (giá trị `employee_role`)                                                              |
| `availableFrom` / `availableTo` | string | Có điều kiện | Bắt buộc với `DRIVER`/`ESCORT`: FE truyền `plannedDepartureAt`/`plannedArrivalAt` của chặng cần gán. Bỏ qua với `TRANSPORT_SPECIALIST`/`FLEET_ROUTE_COORDINATOR` |
| `search`                        | string | No           | Tên hoặc mã nhân viên                                                                                                                                            |
| `pageIndex` / `pageSize`        | number | No           | Mặc định `1` / `20`                                                                                                                                              |

**Quy tắc lọc (BE):**

- Mọi role: chỉ trả nhân viên `is_active = true`, `is_deleted = false` đúng `role`.
- `TRANSPORT_SPECIALIST`, `FLEET_ROUTE_COORDINATOR`: trả tất cả nhân viên thỏa điều kiện trên, không kiểm tra lịch.
- `DRIVER`, `ESCORT`: **chỉ trả người rảnh** trong khoảng `availableFrom`–`availableTo`, tức không có chặng (`RoutePlanRoute` của RoutePlan `CONFIRMED`/`ACTIVE`) nào trùng khoảng `planned_departure_at`–`planned_arrival_at`.
- Kiểm tra trùng lịch vẫn được chạy lại khi lưu (PS1/PS3/PS4/PS5) để chặn tranh chấp → `409 SCHEDULE_CONFLICT`.

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Assignable employees retrieved successfully",
  "value": {
    "items": [
      {
        "employeeId": "uuid",
        "employeeCode": "EMP-2026-081",
        "fullName": "Tran Van Nam",
        "role": "DRIVER"
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### PS1. Phân công đợt 1 lần đầu

UC-36 luồng đợt 1. LM mở Transport Plan Detail → tab Personnel → Phân công đợt 1. Chỉ khi `TransportPlan.status = APPROVED`; chưa có phân công đợt 1 (đã có → `409 PHASE1_ALREADY_ASSIGNED`). Ghi 2 dòng `EmployeeTransportPlan` (`responsibility` = `TRANSPORT_SPECIALIST` / `FLEET_ROUTE_COORDINATOR`, `is_primary = true`) và notify TS, RC.

`POST /api/v1/transport-plans/{transportPlanId}/assignments/phase-1`

| Field                   | Type | Bắt buộc | Mô tả                                              |
| ----------------------- | ---- | -------- | -------------------------------------------------- |
| `transportSpecialistId` | uuid | Yes      | Role `TRANSPORT_SPECIALIST`, `is_active = true`    |
| `routeCoordinatorId`    | uuid | Yes      | Role `FLEET_ROUTE_COORDINATOR`, `is_active = true` |

```json
{ "transportSpecialistId": "uuid", "routeCoordinatorId": "uuid" }
```

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Phase 1 personnel assigned successfully",
  "value": {
    "transportPlanId": "uuid",
    "assignedEmployees": [
      {
        "employeeId": "uuid",
        "employeeCode": "EMP-2026-021",
        "fullName": "Nguyen Van A",
        "role": "TRANSPORT_SPECIALIST",
        "responsibility": "TRANSPORT_SPECIALIST",
        "isPrimary": true,
        "assignedAt": "2026-10-06T08:00:00Z"
      },
      {
        "employeeId": "uuid",
        "employeeCode": "EMP-2026-035",
        "fullName": "Pham Hoang Nam",
        "role": "FLEET_ROUTE_COORDINATOR",
        "responsibility": "FLEET_ROUTE_COORDINATOR",
        "isPrimary": true,
        "assignedAt": "2026-10-06T08:00:00Z"
      }
    ],
    "updatedAt": "2026-10-06T08:00:00Z"
  }
}
```

### PS5. Đổi nhân sự đợt 1

Thay TS và/hoặc RC. Chỉ khi đã có phân công đợt 1 (chưa có → `409 PHASE1_NOT_ASSIGNED`) và **đợt 2 chưa mở** (`phase2.enabled = false`; đã mở → `409 PHASE1_LOCKED`). Bản ghi cũ bị thay (xem C05); notify cả người cũ và người mới. Trường bỏ trống = giữ nguyên.

`PUT /api/v1/transport-plans/{transportPlanId}/assignments/phase-1`

| Field                   | Type   | Bắt buộc | Mô tả                 |
| ----------------------- | ------ | -------- | --------------------- |
| `lastUpdatedAt`         | string | Yes      | `updatedAt` của TransportPlan |
| `transportSpecialistId` | uuid   | No       | Bỏ trống = giữ nguyên |
| `routeCoordinatorId`    | uuid   | No       | Bỏ trống = giữ nguyên |
| `reason`                | string | Yes      | Lý do thay người      |

```json
{
  "lastUpdatedAt": "2026-10-06T08:00:00Z",
  "routeCoordinatorId": "uuid",
  "reason": "Previous coordinator is on leave"
}
```

**`200 OK`** — cùng cấu trúc response PS1 (`assignedEmployees`, `updatedAt`).

### PS2. Xem phân công

Dùng cho tab Personnel của Transport Plan Detail và màn hình phân công nhân sự (2 tab đợt 1 / đợt 2). Driver và Escort cũng xem được để biết mình được giao chặng nào (UC-36 bước 9); **chỉ xem Transport Plan mình được phân công**, ngoài phạm vi trả `403 FORBIDDEN`.

`GET /api/v1/transport-plans/{transportPlanId}/assignments`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Assignments retrieved successfully",
  "value": {
    "transportPlanId": "uuid",
    "phase1": {
      "isAssigned": true,
      "isLocked": false,
      "transportSpecialist": {
        "employeeId": "uuid",
        "employeeCode": "EMP-2026-021",
        "fullName": "Nguyen Van A",
        "role": "TRANSPORT_SPECIALIST"
      },
      "routeCoordinator": {
        "employeeId": "uuid",
        "employeeCode": "EMP-2026-035",
        "fullName": "Pham Hoang Nam",
        "role": "FLEET_ROUTE_COORDINATOR"
      }
    },
    "phase2": {
      "enabled": true,
      "routePlanId": "uuid",
      "isPersonnelComplete": false,
      "segments": [
        {
          "routePlanRouteId": "uuid",
          "sequenceNo": 1,
          "isOutsourced": false,
          "plannedDepartureAt": "2026-10-27T06:00:00Z",
          "plannedArrivalAt": "2026-10-27T08:00:00Z",
          "driver": {
            "employeeId": "uuid",
            "employeeCode": "EMP-2026-081",
            "fullName": "Tran Van Nam",
            "role": "DRIVER"
          },
          "escort": null,
          "provider": null,
          "isComplete": false
        },
        {
          "routePlanRouteId": "uuid",
          "sequenceNo": 2,
          "isOutsourced": true,
          "plannedDepartureAt": "2026-10-27T14:00:00Z",
          "plannedArrivalAt": "2026-10-27T15:30:00Z",
          "driver": null,
          "escort": null,
          "provider": {
            "transportProviderId": "uuid",
            "providerCode": "PRV-LUFTHANSA-01",
            "providerName": "Lufthansa Cargo"
          },
          "isComplete": true
        }
      ]
    }
  }
}
```

- `phase1.isAssigned = false`: chưa phân công đợt 1 (hai object TS/RC là `null`). Tab đợt 1 chỉ cho phân công khi `TransportPlan.status = APPROVED`.
- `phase1.isLocked = true` khi `phase2.enabled = true`: FE ẩn/khóa nút đổi đợt 1.
- `phase2.enabled = false` (và `routePlanId = null`, `segments = []`) khi RoutePlan PRIMARY chưa `CONFIRMED`: FE khóa giao diện chọn Driver/Escort (UC-36 AC-001).

### PS3. Phân công đợt 2 lần đầu (cả route)

UC-36 luồng đợt 2 ("Xác nhận & Giao nhiệm vụ Chuyến đi"). Atomic: kiểm tra từng chặng, ghi `driver_employee_id`/`escort_employee_id`, ghi `EmployeeTransportPlan` (`responsibility` = `DRIVER` / `ESCORT`), thông báo Driver/Escort.

`POST /api/v1/route-plans/{routePlanId}/personnel`

Điều kiện: RoutePlan PRIMARY `status = CONFIRMED` (chưa → `422 ROUTE_NOT_CONFIRMED`). Mỗi chặng **nội bộ** phải gửi `driverEmployeeId` **và** `escortEmployeeId`; chặng thuê ngoài **không** gửi (UC-36 AC-002). Chặng đã có người → `409 SEGMENT_ALREADY_ASSIGNED` (đổi dùng PS4).

| Field           | Type   | Bắt buộc | Mô tả                                                                            |
| --------------- | ------ | -------- | -------------------------------------------------------------------------------- |
| `lastUpdatedAt` | string | Yes      | Chống ghi đè                                                                     |
| `segments`      | array  | Yes      | `{ routePlanRouteId, driverEmployeeId, escortEmployeeId }` cho từng chặng nội bộ |

```json
{
  "lastUpdatedAt": "2026-10-09T10:00:00Z",
  "segments": [
    {
      "routePlanRouteId": "uuid",
      "driverEmployeeId": "uuid",
      "escortEmployeeId": "uuid"
    },
    {
      "routePlanRouteId": "uuid",
      "driverEmployeeId": "uuid",
      "escortEmployeeId": "uuid"
    }
  ]
}
```

**`201 Created`** — `segments[]` cùng cấu trúc `phase2.segments` của PS2.

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Phase 2 personnel assigned successfully",
  "value": {
    "routePlanId": "uuid",
    "isPersonnelComplete": true,
    "segments": [
      {
        "routePlanRouteId": "uuid",
        "sequenceNo": 1,
        "isOutsourced": false,
        "driver": {
          "employeeId": "uuid",
          "employeeCode": "EMP-2026-081",
          "fullName": "Tran Van Nam",
          "role": "DRIVER"
        },
        "escort": {
          "employeeId": "uuid",
          "employeeCode": "EMP-2026-090",
          "fullName": "Le Van Binh",
          "role": "ESCORT"
        },
        "provider": null
      }
    ],
    "updatedAt": "2026-10-09T10:30:00Z"
  }
}
```

### PS4. Đổi nhân sự một chặng (đợt 2)

UC-36 ALT-01 ("Thay đổi / Điều động nhân sự bổ sung"). Dùng cho Driver/Escort ốm/bận trước khi khởi hành; hoạt động cả khi route đã `CONFIRMED`. Chặng phải đã có phân công (PS3). Không sửa khi chặng đã `IN_PROGRESS/COMPLETED` (`409 SEGMENT_LOCKED`). Kiểm tra `SCHEDULE_CONFLICT` cho người mới; notify người mới và người cũ.

`PUT /api/v1/route-plans/{routePlanId}/segments/{routePlanRouteId}/personnel`

| Field              | Type   | Bắt buộc | Mô tả                 |
| ------------------ | ------ | -------- | --------------------- |
| `lastUpdatedAt`    | string | Yes      | `updatedAt` của RoutePlan |
| `driverEmployeeId` | uuid   | No       | Bỏ trống = giữ nguyên |
| `escortEmployeeId` | uuid   | No       | Bỏ trống = giữ nguyên |
| `reason`           | string | Yes      | Lý do điều động       |

```json
{
  "lastUpdatedAt": "2026-10-09T10:00:00Z",
  "driverEmployeeId": "uuid",
  "reason": "Previous driver is sick"
}
```

**`200 OK`** — trả `routePlanId`, `segment` (cấu trúc như một phần tử `phase2.segments` của PS2), `isPersonnelComplete`, `updatedAt`.

---

## 12. Thay đổi lộ trình khẩn cấp (UC-48)

> V7 không có bảng đề xuất đổi lộ trình, nên mục này chỉ dùng bảng có sẵn: `RoutePlan` + `RoutePlanRoute.route_type` (`BACKUP`/`RETURN`) + `Notification` + `AuditDossier`. Thay đổi lệch **< 50 km và < 1 giờ** do Driver tự chọn được ghi nhận ở Flow 4 (BR-036), không qua các API này. Chỉ áp dụng khi `Transport.status = IN_TRANSIT`.

Có hai phương án, chuẩn bị ở hai thời điểm khác nhau:

| | BACKUP | RETURN |
| --- | --- | --- |
| Lập RoutePlan | **Trước khi khởi hành** (RP1), TS thẩm định qua RP7 cùng lộ trình chính (R16) | **Giữa đường**, khi có sự cố (RP1 do RC tạo lúc đó, R17) |
| Giấy tờ | TS soạn từ đầu, Customer nộp luôn | TS bổ sung vào CDos đã mở lại; Customer **không** nộp thêm |
| Yêu cầu | EC1 (RC) | RP1 `routeType = RETURN` kèm lý do ở `routeNote` |
| LM quyết định | EC2: duyệt thì `CONFIRMED → ACTIVE` | EC2: duyệt thì mở lại CDos `APPROVED → DRAFT` |
| Kích hoạt | Ngay khi EC2 duyệt | EC3 (LM), sau khi TS xác nhận ở RP7 |

### 12.1. BACKUP

1. Trước khi khởi hành: RC lập RoutePlan `BACKUP` (RP1), TS thẩm định qua RP7. Khi primary gặp sự cố, RC gửi yêu cầu bật backup (EC1); LM nhận thông báo `URGENT`.
2. LM quyết định (EC2): duyệt thì backup `CONFIRMED → ACTIVE`, thông báo RC, Customer, Driver; từ chối thì RC được thông báo để lập phương án khác.

### 12.2. RETURN (quay đầu khẩn cấp, UC-48 EXC-01)

RETURN xảy ra giữa đường nên không thể chuẩn bị sẵn. CDos lúc này đã `APPROVED` nên bị khóa (Flow 2, UC-19); luồng dưới đây mở lại CDos có kiểm soát.

1. **RC gửi yêu cầu = tạo RoutePlan RETURN** bằng RP1 (`routeType = RETURN`, `routeNote` là lý do, ≥ 10 ký tự, `action = SAVE_DRAFT`). Điều kiện: `Transport.status = IN_TRANSIT`, đã có PRIMARY, CDos `APPROVED`, chưa có RETURN nào chưa hủy. RoutePlan ở `DRAFT`; CDos **chưa đổi**. Thông báo LM (`URGENT`). TS chưa được báo ở bước này.
2. **LM quyết định (EC2).** `APPROVE`: CDos `APPROVED → DRAFT` (ghi `AuditDossier`), thông báo TS (để bổ sung giấy tờ) và RC. `REJECT`: RoutePlan RETURN `DRAFT → CANCELLED`, lý do (`note`) ghi vào `route_note`, thông báo RC; RC có thể gửi yêu cầu RETURN mới.
3. **RC và TS soạn song song.** RC chỉnh lộ trình RETURN nếu cần (RP4, `SUBMIT_FOR_LEGAL_REVIEW` để báo TS). TS vào CDos bổ sung giấy tờ còn thiếu (Flow 2): yêu cầu thêm thuộc CDos (không gắn riêng vào RoutePlan), ghi `RETURN` ở `instruction`/`note`.
4. **TS xác nhận (RP7, `isFeasible = true`).** Cùng transaction: CDos `DRAFT → IN_PREPARATION`, rồi tự chạy tiếp `READY_FOR_SUBMISSION → SUBMITTED → APPROVED` (ghi `AuditDossier` từng bước; Customer không nộp thêm giấy tờ); RoutePlan RETURN `DRAFT → CONFIRMED`. Không mở upload cho Customer, không mở phân công đợt 2. Thông báo LM và RC.
5. **LM kích hoạt (EC3).** Gán thêm xe/provider cho các chặng RETURN (nếu cần), RoutePlan `CONFIRMED → ACTIVE`, thông báo Customer đã áp dụng lộ trình RETURN và RC.
6. **RC báo Driver (EC4).** Driver đang phụ trách chuyến biết CDos đã duyệt, RoutePlan RETURN đã có, bắt đầu quay về.

Từ lúc RC tạo yêu cầu đến khi LM kích hoạt, `Transport` vẫn `IN_TRANSIT` (DB không có trạng thái tạm dừng). Khi RETURN `ACTIVE`, lộ trình hiệu lực = các chặng đã đi + chặng `RETURN`; các chặng chưa đi của primary bị bỏ (R17). Yêu cầu RETURN **không có API riêng**: chính là RP1. LM mở yêu cầu từ thông báo (deep link tới RoutePlan) hoặc xem RP2 của TransportPlan (`routeType = RETURN`, `status = DRAFT`); không có danh sách yêu cầu toàn hệ thống.

| #   | API                                  | Method & Endpoint                                   | Role |
| --- | ------------------------------------ | --------------------------------------------------- | ---- |
| EC1 | RC gửi yêu cầu bật BACKUP            | `POST /route-plans/{routePlanId}/change-request`    | RC   |
| EC2 | LM quyết định (BACKUP hoặc RETURN)   | `POST /route-plans/{routePlanId}/change-decision`   | LM   |
| EC3 | LM kích hoạt RETURN, báo Customer    | `POST /route-plans/{routePlanId}/return-activation` | LM   |
| EC4 | RC báo Driver bắt đầu quay về        | `POST /route-plans/{routePlanId}/driver-notice`     | RC   |

**Lỗi dùng chung của EC1–EC4** (ngoài lỗi chung mục 0):

| HTTP | errorCode                   | Message                                                                        | Dùng ở        |
| ---- | --------------------------- | ------------------------------------------------------------------------------ | ------------- |
| 404  | `ROUTE_PLAN_NOT_FOUND`      | Route Plan not found                                                           | EC1–EC4       |
| 409  | `INVALID_ROUTE_PLAN_STATUS` | This action cannot be performed while the route plan is in {status} status     | EC1–EC4       |
| 409  | `ROUTE_PLAN_MODIFIED`       | The route plan was just modified. Please reload the page                       | EC2, EC3      |
| 409  | `TRANSPORT_NOT_IN_TRANSIT`  | The transport is not in transit                                                | EC1–EC3       |
| 409  | `DOSSIER_NOT_APPROVED`      | The compliance dossier must be approved to approve a return route plan         | EC2           |
| 422  | `APPROVAL_NOT_REQUIRED`     | The change is below the approval threshold (BR-036)                            | EC1           |

### EC1. RC gửi yêu cầu bật BACKUP

Chỉ cho phương án **BACKUP đã `CONFIRMED`**. Không ghi bảng mới: tạo `Notification` (`ROUTE`, `URGENT`, `reference_type = RoutePlan`, `reference_id = routePlanId`) gửi LM. `422 APPROVAL_NOT_REQUIRED` khi dưới ngưỡng BR-036 (không đổi BCP, không thêm trạm nghỉ 24h, lệch < 50 km, trễ < 1 giờ).

`POST /api/v1/route-plans/{routePlanId}/change-request`

| Field                   | Type   | Bắt buộc | Mô tả                                       |
| ----------------------- | ------ | -------- | ------------------------------------------- |
| `reason`                | string | Yes      | Lý do đổi lộ trình, ≥ 10 ký tự              |
| `newEstimatedArrivalAt` | string | Yes      | ETA mới                                     |
| `estimatedExtraCost`    | number | No       | Chi phí phát sinh ước tính (chỉ vào thông báo) |
| `currency`              | string | Khi có `estimatedExtraCost` | Mã tiền tệ, ví dụ `EUR`     |
| `note`                  | string | No       |                                             |

```json
{
  "reason": "Snow closed the primary road section near Calais",
  "newEstimatedArrivalAt": "2026-10-28T10:00:00Z",
  "estimatedExtraCost": 1200.0,
  "currency": "EUR",
  "note": "Driver informed by phone"
}
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route change request sent successfully",
  "value": {
    "routePlanId": "uuid",
    "routeType": "BACKUP",
    "status": "CONFIRMED",
    "requestedAt": "2026-10-28T02:10:00Z"
  }
}
```

### EC2. LM quyết định

`POST /api/v1/route-plans/{routePlanId}/change-decision`

| Field           | Type   | Bắt buộc        | Mô tả                                              |
| --------------- | ------ | --------------- | -------------------------------------------------- |
| `lastUpdatedAt` | string | Yes             | `updatedAt` của RoutePlan                          |
| `decision`      | string | Yes             | `APPROVE` \| `REJECT`                              |
| `note`          | string | Khi `REJECT`    | ≥ 10 ký tự; với RETURN ghi vào `route_note`        |

Rẽ nhánh theo loại RoutePlan:

| Loại     | Điều kiện                                         | `APPROVE`                                         | `REJECT`                           |
| -------- | ------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| `BACKUP` | `CONFIRMED`                                       | `CONFIRMED → ACTIVE`; notify RC, Customer, Driver | notify RC                          |
| `RETURN` | `DRAFT`, Transport `IN_TRANSIT`, CDos `APPROVED`  | CDos `APPROVED → DRAFT`; notify TS, RC            | RoutePlan `→ CANCELLED`; notify RC |

```json
{
  "lastUpdatedAt": "2026-10-28T02:10:00Z",
  "decision": "APPROVE",
  "note": "Approved, return immediately"
}
```

**`200 OK`** — `status` là trạng thái RoutePlan sau quyết định; `complianceDossier` chỉ có với RETURN.

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Route change approved successfully",
  "value": {
    "routePlanId": "uuid",
    "routeType": "RETURN",
    "decision": "APPROVE",
    "status": "DRAFT",
    "complianceDossier": {
      "complianceDossierId": "uuid",
      "status": "DRAFT"
    },
    "updatedAt": "2026-10-28T02:30:00Z"
  }
}
```

BACKUP `APPROVE` trả `status: "ACTIVE"`, `complianceDossier: null`; `REJECT` của RETURN trả `status: "CANCELLED"`; `REJECT` của BACKUP giữ `status: "CONFIRMED"`.

### EC3. LM kích hoạt RETURN

Điều kiện: RoutePlan RETURN ở `CONFIRMED` (đã qua RP7) và Transport `IN_TRANSIT`. Đây là chỗ **duy nhất** sau `CONFIRMED` cho phép đổi xe và provider của chặng RETURN (RP4, OS1 vẫn `ROUTE_LOCKED`). Áp dụng R9, R10 và R17 cho xe; chặng thuê ngoài không nhận xe.

`POST /api/v1/route-plans/{routePlanId}/return-activation`

| Field           | Type   | Bắt buộc | Mô tả                                                                                       |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `lastUpdatedAt` | string | Yes      | `updatedAt` của RoutePlan                                                                   |
| `segments`      | array  | No       | `{ routePlanRouteId, vehicleIds?, outsourcing? { transportProviderId, note } }`; bỏ trống = giữ nguyên |
| `note`          | string | No       |                                                                                             |

```json
{
  "lastUpdatedAt": "2026-10-28T04:00:00Z",
  "segments": [
    {
      "routePlanRouteId": "uuid",
      "vehicleIds": ["uuid"]
    }
  ],
  "note": "Same truck continues to the origin stable"
}
```

**`200 OK`** — `segments` là mảng [`Segment`](#35-segment-một-routeplanroute) đầy đủ.

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Return route activated successfully",
  "value": {
    "routePlanId": "uuid",
    "routeType": "RETURN",
    "status": "ACTIVE",
    "segments": ["…cùng cấu trúc Segment như RP1…"],
    "updatedAt": "2026-10-28T04:10:00Z"
  }
}
```

Lỗi riêng: `409 SCHEDULE_CONFLICT`, `409 PROVIDER_INACTIVE`, `422 OUTSOURCED_SEGMENT`, `422 VEHICLE_MODE_MISMATCH`, `422 VEHICLE_UNAVAILABLE`, `422 VEHICLE_CAPACITY_EXCEEDED`, `422 PROVIDER_MODE_MISMATCH`.

### EC4. RC báo Driver bắt đầu quay về

Không đổi trạng thái; chỉ tạo `Notification` (`ROUTE`, `URGENT`) gửi Driver đang phụ trách chuyến (Driver của các chặng PRIMARY, R17). Điều kiện: RoutePlan RETURN ở `CONFIRMED` hoặc `ACTIVE`; RC phải được phân công vào Transport Plan này (`403 FORBIDDEN`).

`POST /api/v1/route-plans/{routePlanId}/driver-notice`

| Field     | Type   | Bắt buộc | Mô tả                                |
| --------- | ------ | -------- | ------------------------------------ |
| `message` | string | No       | Lời nhắn thêm vào nội dung thông báo |

```json
{ "message": "Dossier approved, follow the return route plan" }
```

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Driver notified successfully",
  "value": {
    "routePlanId": "uuid",
    "notifiedDrivers": [
      {
        "employeeId": "uuid",
        "employeeCode": "EMP-2026-081",
        "fullName": "Tran Van Nam",
        "role": "DRIVER"
      }
    ],
    "sentAt": "2026-10-28T04:15:00Z"
  }
}
```

### Quy ước cho BE (DB V7 không nói rõ)

1. **RoutePlan chính khi bật backup/RETURN:** bật phương án không hủy primary mà ghép đoạn thay vào (R16, R17). RoutePlan chính **giữ nguyên trạng thái** (`ACTIVE`); phương án chuyển `→ ACTIVE`; lộ trình hiệu lực là bản ghép. Mỗi lúc chỉ cho một backup `ACTIVE` trên cùng đoạn; backup chồng lên đoạn đã có backup `ACTIVE` → `409`.
2. **Danh sách yêu cầu chờ LM duyệt:** không có bảng, nên không có API danh sách toàn hệ thống. BACKUP: LM mở từ `Notification` (`notification_type = ROUTE`, `priority = URGENT`, `reference_id` = phương án). RETURN: từ `Notification` hoặc RP2 của TransportPlan.
3. **Chi phí phát sinh (`estimatedExtraCost`, EC1):** chỉ nằm trong `Notification.message`; ghi nhận chính thức thuộc Flow 5.
4. **RP7 nhánh RETURN tự chạy CDos tới `APPROVED` trong một transaction** (không có Customer nộp, không có cơ quan duyệt).
5. **CDos `APPROVED → DRAFT` chỉ do EC2 (RETURN) thực hiện**, là ngoại lệ của luật khóa CDos `SUBMITTED`/`APPROVED` ở UC-19 (Flow 2).
6. **Xe của RETURN:** thường là chính xe đang chở ngựa (`IN_USE`) và lịch chồng với các chặng chưa đi của primary. R9/`SCHEDULE_CONFLICT` bỏ qua hai trường hợp này khi xe đã gán cho PRIMARY của cùng Transport.

---

## 13. Mapping UC → API

| UC    | API                                            |
| ----- | ---------------------------------------------- |
| UC-32 | AB1, AB2                                       |
| UC-33 | LOC1, ROT1, MAP1–MAP3, VH1, PV1, RP1, RP4, RP7 |
| UC-34 | TP1                                            |
| UC-35 | TP3, TP4                                       |
| UC-36 | PS6, PS1, PS5 (đợt 1), PS2, PS3, PS4 (đợt 2)   |
| UC-37 | RP1, RP2, RP3, RP4, RP5 (`routeType = BACKUP`) |
| UC-38 | RP2, RP3, RP6                                  |
| UC-39 | RP4                                            |
| UC-40 | RP5                                            |
| UC-41 | PV1 → PV6                                      |
| UC-42 | OS1 (+ `outsourcing` trong RP1/RP4)            |
| UC-43 | VH1, VH2                                       |
| UC-44 | VH3                                            |
| UC-45 | VH4                                            |
| UC-46 | VH5                                            |
| UC-47 | Đã bỏ: hiệu ứng nằm ở RP7 (UC-33)              |
| UC-48 | RP1 (`routeType = RETURN`), RP7, EC1, EC2, EC3, EC4 |

**Tổng endpoint:** 10 Location/Route master (LOC1–5, ROT1–5) + 2 booking + 4 TransportPlan + 6 personnel + 6 provider + 1 outsourcing + 5 vehicle + 7 route plan + 4 đổi lộ trình khẩn cấp (EC1–EC4) = **45 endpoint**. Geoapify (MAP1–MAP3) do FE gọi trực tiếp, không tính.

# API Contract — Flow 2: Quản lý Hồ sơ Pháp lý & Kiểm dịch Thông quan

> **Căn cứ:** UC-16 → UC-31 (bao gồm UC-28a/b, UC-29a/b) + Physical ERD Final V7 (`ComplianceRequirement`, `DossierTemplate`, `DossierTemplateItem`, `ComplianceDossier`, `DossierRequirement`, `ComplianceDocument`, `DocumentVersion`, `DocumentAttachment`, `DocumentReview`, `DocumentRequest`, `AuthoritySubmission`, `AuthoritySubmissionEvidenceFile`, `QuarantineProof`, `CustomsClearanceProof`, `AuditDossier`) + `screen/flow2-screen-inventory.md` + `screen/flow2-screen-data-llm-only` + các quyết định team ghi ngày 28/09 trong branch `api-contract`. Khi wording cũ mâu thuẫn, contract ưu tiên ERD V7 và quyết định đã chốt; kênh thông báo Flow 2 là Email + Web Notification, không có native push.
>
> **⚠️ Đọc [Mục 1](#1-️-các-gap-còn-mở) trước khi review phần còn lại.** Mục này chỉ liệt kê các thiếu hụt DB/endpoint vẫn còn ảnh hưởng đến triển khai.

## Mục lục

- [0. Quy ước chung](#0-quy-ước-chung)
- [1. ⚠️ Các gap còn mở](#1-️-các-gap-còn-mở)
- [2. Quy tắc nghiệp vụ](#2-quy-tắc-nghiệp-vụ)
- [3. Danh mục ComplianceRequirement (UC-16)](#3-danh-mục-compliancerequirement-uc-16)
- [4. DossierTemplate (UC-17)](#4-dossiertemplate-uc-17)
- [5. Khởi tạo ComplianceDossier từ Template (UC-18)](#5-khởi-tạo-compliancedossier-từ-template-uc-18)
- [6. Quản lý DossierRequirement trong CDos (UC-19)](#6-quản-lý-dossierrequirement-trong-cdos-uc-19)
- [7. Xem ComplianceDossier (UC-20)](#7-xem-compliancedossier-uc-20)
- [8. Nộp & Cập nhật ComplianceDocument (UC-21, UC-22)](#8-nộp--cập-nhật-compliancedocument-uc-21-uc-22)
- [9. Thẩm định giấy tờ — DocumentReview & DocumentRequest (UC-23, UC-24)](#9-thẩm-định-giấy-tờ--documentreview--documentrequest-uc-23-uc-24)
- [10. Nhắc nộp bổ sung (UC-25)](#10-nhắc-nộp-bổ-sung-uc-25)
- [11. Nộp & Cập nhật kết quả cơ quan chức năng — AuthoritySubmission (UC-26, UC-27)](#11-nộp--cập-nhật-kết-quả-cơ-quan-chức-năng--authoritysubmission-uc-26-uc-27)
- [12. Kiểm dịch BCP (UC-28a, UC-28b)](#12-kiểm-dịch-bcp-uc-28a-uc-28b)
- [13. Thông quan Hải quan (UC-29a, UC-29b)](#13-thông-quan-hải-quan-uc-29a-uc-29b)
- [14. Dashboard theo dõi tiến độ (UC-30)](#14-dashboard-theo-dõi-tiến-độ-uc-30)
- [15. Lịch sử kiểm toán (UC-31)](#15-lịch-sử-kiểm-toán-uc-31)
- [16. Phụ lục — Đề xuất bổ sung ERD](#16-phụ-lục--đề-xuất-bổ-sung-erd)

---

## 0. Quy ước chung

Kế thừa toàn bộ quy ước của `api-contract/flow1.md` (Base URL `/api/v1`, ID số `bigint`, timestamp ISO 8601 UTC, ngày `YYYY-MM-DD`, field camelCase, response envelope `{ isSuccess, code, message, value }`, lỗi chung 400/401/403/500, phân trang `pageIndex/pageSize/sortBy` → `items/pageIndex/pageSize/totalItems/totalPages`). Chỉ liệt kê phần **khác biệt hoặc bổ sung** riêng cho Flow 2 ở đây.

| Header/Field         | Ghi chú                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `Authorization`      | Bắt buộc cho mọi API 🔒 trong file này (không có API public)                                                    |
| Upload file           | `Content-Type: multipart/form-data`. Field chứa file luôn đặt tên `files` (mảng, hỗ trợ nhiều file — BR-039) |
| Actor viết tắt        | `CUS` = Customer, `TS` = Transport Specialist, `LM` = Logistics Manager, `DRV` = Driver, `ESC` = Escort        |
| Giới hạn dung lượng | Giấy tờ pháp lý (CDoc): PDF/JPG/JPEG/PNG, ≤ 10MB/file (UC-21 EXC-01/02). Ảnh proof BCP/Hải quan: ≤ 5MB/file  |

**Lỗi chung của Flow 2** (áp dụng cho mọi endpoint, không lặp lại ở từng bảng lỗi bên dưới):

| HTTP | errorCode | Khi nào |
| ---- | --------- | ------- |
| 400  | `VALIDATION_ERROR` | Thiếu field bắt buộc hoặc sai kiểu/định dạng; `value.errors[]` liệt kê `{ field, message }` |
| 403  | `FORBIDDEN` | Sai role, hoặc Customer truy cập CDos/giấy tờ của Booking không thuộc mình (R12), hoặc Escort/Driver không được phân công (R13) |
| 404  | `NOT_FOUND` | Không tìm thấy bản ghi theo ID trên path (hoặc đã soft-delete) |
| 409  | `BOOKING_CHANGE_IN_PROGRESS` | API ghi khi Booking đang `DRAFT` do xử lý hotline (R16/D2I) |
| 409  | `DOSSIER_CLOSED` | API ghi khi CDos đã `CLOSED` (Booking bị hủy hoặc cơ quan từ chối hẳn — R5) |

**Enums riêng Flow 2** (theo ERD V7 — xem [Mục 1](#1-️-các-gap-còn-mở) về phần còn mở):

| Enum                          | Giá trị                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `ComplianceRequirementCategory` | `QUARANTINE`, `CUSTOMS`, `TRANSPORT`, `HORSE_HEALTH`, `HORSE_IDENTITY`, `OTHER` (mặc định `OTHER`)                |
| `ComplianceRequirementStatus` | `ACTIVE`, `INACTIVE`                                                                       |
| `DossierTemplateStatus`       | `DRAFT`, `ACTIVE`, `INACTIVE`                                                              |
| `ComplianceDossierStatus`     | `DRAFT`, `IN_PREPARATION`, `READY_FOR_SUBMISSION`, `SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`, `CLOSED` |
| `DossierRequirementStatus`    | `PENDING`, `REQUESTED`, `PROVIDED`, `SATISFIED`, `REJECTED`, `WAIVED`                     |
| `ComplianceDocumentStatus`    | `PROVIDED`, `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`                                   |
| `DocumentReviewResult`        | `APPROVED`, `REJECTED`, `REVISION_REQUIRED`                                                |
| `DocumentRequestType`         | `MISSING_DOCUMENT`, `REVISION`, `REUPLOAD`, `ADDITIONAL_INFORMATION`                       |
| `DocumentRequestStatus`       | `OPEN`, `FULFILLED`, `CANCELLED`                                                           |
| `AuthoritySubmissionStatus`   | `DRAFT`, `SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`, `RETURNED`                        |
| `QuarantineProofStatus`       | `PENDING_VERIFICATION`, `PASSED`, `PASSED_WITH_CONDITIONS`, `HOLDBACK`, `FAILED`, `REJECTED` |
| `CustomsClearanceProofStatus` | `PENDING_VERIFICATION`, `CLEARED`, `HELD`, `REJECTED`                                    |
| `CustomsLane`                 | `GREEN_LANE`, `ORANGE_LANE`, `RED_LANE`                                                   |
| `AuthorityEvidenceType`       | `ACCEPTANCE`, `REJECTION`, `ADDITIONAL_INFORMATION`, `OTHER`                                |
| `AuditVisibility`             | `PUBLIC`, `INTERNAL` (mặc định `PUBLIC`)                                                    |

---

## 1. ⚠️ Các gap còn mở

Contract đã được đối chiếu với `dbdiagram/racehorse_transport_physical_erd_final_v7.dbml` (**ERD V7**) và cập nhật theo DB. V7 đã giải quyết G8, G9/G10, G12, G26 (`submitted_note`, `ata_carnet_expiry_date`), G30 (`CatalogAuditLog`) nên các gap này không còn liệt kê. Mục này chỉ giữ điểm **chưa khớp giữa contract và V7** hoặc **chưa được chốt**; phần DB còn cần đổi nằm ở [Mục 16](#16-phụ-lục--đề-xuất-bổ-sung-erd).

| Gap | Còn thiếu | Nguồn phát hiện |
| --- | --- | --- |
| 🟡 **G32** | **Chờ backend chốt.** Unique index của `DossierRequirement` là `(compliance_dossier_id, compliance_requirement_id, horse_id)`. (a) DR riêng từng ngựa (`horse_id` có giá trị): index chặn trùng bình thường. (b) DR chung cả chuyến (`horse_id = NULL`): PostgreSQL coi mỗi NULL là một giá trị khác nhau nên có thể chèn 2 DR cùng dossier, cùng CR, cùng `NULL` mà không bị chặn — lúc đó chỉ còn BE tự kiểm tra (`DR_DUPLICATE`, D3). (c) DR optional đã soft-delete vẫn nằm trong bảng và vẫn chiếm chỗ trong unique, nên không thêm lại được cùng CR/ngựa (báo trùng dù DR cũ đã xóa) | Đề xuất: đổi thành partial unique index `WHERE is_deleted = false` và dùng `COALESCE(horse_id, 0)` (Mục 16). Cần backend xác nhận trước khi chốt |

---

## 2. Quy tắc nghiệp vụ

**Phân quyền & bảo mật**

- **R1 — Phân quyền tổng quát** (theo RACI): TS `CRUD` hầu hết (CR, DT, CDos, DR, Review, Request, AuthoritySubmission). Customer `CRU` trên `ComplianceDocument` của mình + `R` trên CDos/DR/review. **TS không được upload/sửa `ComplianceDocument` thay Customer** (đã chốt G24) — TS chỉ có `R` trên giấy tờ và dùng Review/Request (Mục 9) để yêu cầu Customer nộp lại. LM `R` toàn bộ (dashboard/giám sát). Escort/Driver chỉ 2 API nộp proof (Mục 12/13), không quyền gì khác. Server luôn tự kiểm tra role, không chỉ ẩn nút ở FE.
- **R12 — Cách ly dữ liệu:** Customer chỉ xem/thao tác CDos của Booking mình sở hữu, truy cập của người khác → `403`. TS/LM xem được mọi CDos.
- **R13 — Phạm vi Escort/Driver:** chỉ nộp proof cho chuyến mình đang được phân công (`EmployeeTransportPlan`); không được phân công → `403`.

**Vòng đời dữ liệu & mapping trạng thái**

- **R2 — Soft delete `CR`, `DT` và Optional `DR`:** `is_deleted = true` + `deleted_at`/`deleted_by_account_id`; API danh sách mặc định chỉ trả bản ghi chưa xóa và không cung cấp thao tác khôi phục. ERD V7 đã có 3 cột soft-delete trên `DossierRequirement`; audit sửa CR ghi vào `CatalogAuditLog`.
- **R3 — Xử lý khi đã tham chiếu:** CR đã gắn ≥1 DTI/DR **vẫn được Edit**, nhưng trước khi lưu FE phải hiển thị số template/hồ sơ đang liên kết, cảnh báo thay đổi có thể ảnh hưởng dữ liệu đang dùng và yêu cầu TS xác nhận chịu trách nhiệm. BE đếm lại tại thời điểm cập nhật, chỉ cho lưu khi request có xác nhận rõ ràng và ghi audit actor + before/after vào `CatalogAuditLog`. **Delete CR vẫn bị chặn** và hướng người dùng sang `INACTIVE`. DT đã tạo ≥1 CDos vẫn bị chặn Edit/Delete như cũ.
- **R4 — Progress % của CDos:** `(số DR mandatory có status SATISFIED hoặc WAIVED) / (tổng số DR mandatory)`, tính trên cả DR chung lẫn theo ngựa. DR optional không xuất hiện ở cả tử số lẫn mẫu số.
- **R5 — Trạng thái CDos:** CDos là bộ hồ sơ TS chuẩn bị trước chuyến. Luồng chính: `DRAFT` (transient lúc tạo) → `IN_PREPARATION` → `READY_FOR_SUBMISSION` → `SUBMITTED`/`PENDING` → `APPROVED` hoặc bị cơ quan bắt buộc từ chối theo UC-26/27. `RETURNED` đưa CDos về `IN_PREPARATION`. `APPROVED` là trạng thái hoàn tất bình thường. `CLOSED` dùng khi (a) Booking bị hủy qua ngoại lệ hotline, hoặc (b) cơ quan bắt buộc **từ chối hẳn** (`REJECTED` ở S3) — hệ thống **cancel luôn CDos** (đặt `rejectedAt`, `rejectionReason`, `closedAt`), không mở lại. Nếu TS chọn **trả về để sửa** (`RETURNED`) thì CDos về `IN_PREPARATION` và được nộp lại (R25). **Kết quả kiểm dịch/hải quan không được cập nhật vào cột này.**
- **R6 — Mapping trạng thái DR:** `MISSING` chưa nhắc → `PENDING`; đã nhắc (UC-25) → `REQUESTED`; `UPLOADED` → `PROVIDED`; `VERIFIED` → `SATISFIED`; `REJECTED` giữ nguyên; miễn trừ (dùng cột `waived_reason` có sẵn) → `WAIVED`.
- **R7 — Mapping trạng thái ComplianceDocument:** có version chờ duyệt → `PROVIDED`; review mới nhất `APPROVED`/`REJECTED` → tương ứng; `expiry_date` quá hạn → `EXPIRED` (batch job hàng ngày, không phải API riêng).
- **R10 — Không xoá được DR mandatory** — chỉ soft-delete DR optional (UC-19 EXC-01); DR đã có `ComplianceDocument` cũng bị chặn xóa để bảo toàn lịch sử.
- **R11 — DR theo phạm vi áp dụng:** `horseId = null` = chung cả chuyến; có giá trị = riêng 1 con ngựa. ERD V7 có `DossierRequirement.horse_id` và `DossierTemplateItem.applies_per_horse`. Lúc Apply Template, BE nhân DTI có `appliesPerHorse = true` cho **từng ngựa** trong `BookingHorse` (VD 5 ngựa × 5 DTI đều bật cờ = 25 DR); DTI `appliesPerHorse = false` chỉ tạo 1 DR chung (`horseId = null`). Ghi chú team "mỗi con ngựa 1 template" được hiểu là bật `appliesPerHorse` cho mọi DTI của template ngựa (xem gap G27/G1).

**File & version (BR-039, BR-040)**

- **R8 — Multi-file/1 version (BR-039):** file đầu tiên là primary và lưu vào các cột `DocumentVersion.file_*` đang bắt buộc; file thứ 2..N lưu ở `DocumentAttachment` với `sort_order` tương ứng. API luôn trả projection `files[]` hợp nhất, `sortOrder` bắt đầu từ 1. Không sinh thêm `DocumentVersion` chỉ vì thêm/bớt file trước khi Submit.
- **R9 — Version increment vs edit-in-place (BR-040):** trước khi nhận file mới, BE kiểm tra `DocumentVersion` mới nhất **đã có `DocumentReview` chưa**. Chưa có → edit-in-place (ghi đè, giữ `version_no`). Có review `!= APPROVED` → tạo version mới (`version_no + 1`). Có review `APPROVED` → khoá, lỗi `DOCUMENT_ALREADY_VERIFIED`.

**Điều kiện chuyển bước & tích hợp liên Flow**

- **R14 — Điều kiện tiên quyết:** tạo CDos cần `Booking.status = APPROVED`; thêm/xoá/sửa DR cần CDos đang `IN_PREPARATION`/`READY_FOR_SUBMISSION` (bị khoá nếu `SUBMITTED` hoặc `APPROVED` — UC-19 EXC-02); chuyển `READY_FOR_SUBMISSION` cần 100% DR mandatory `SATISFIED`/`WAIVED`; ghi nhận nộp cơ quan cần CDos đang `READY_FOR_SUBMISSION`; nộp proof BCP cần CDos đang `APPROVED`; nộp proof Hải quan cần kết quả kiểm dịch mới nhất `PASSED`/`PASSED_WITH_CONDITIONS`.
- **R15 — Ba nhóm trạng thái tách riêng cho một chuyến (đã xác nhận):** (1) `ComplianceDossier.status` phản ánh bộ hồ sơ trước chuyến và việc nộp hồ sơ ở UC-26/27; (2) kết quả kiểm dịch tại BCP nằm ở `QuarantineProof.status`; (3) kết quả hải quan nằm ở `CustomsClearanceProof.status`. `FAILED`, `HELD` hoặc `REJECTED` tại cửa khẩu tuyệt đối không ghi đè `ComplianceDossier.status`. Flow 3, Flow 5 và Flow 6 phải đọc cả ba nguồn.
- **R16 — Ngoại lệ Booking sau phê duyệt:** D2 kiểm tra `Booking.status = APPROVED` trong cùng transaction khởi tạo CDos. Customer không được tự hủy Booking `APPROVED`; nếu gọi hotline và được nhân sự có thẩm quyền chấp thuận, Flow 1 commit trạng thái mới rồi gọi D2I. `DRAFT` → giữ status CDos nhưng khóa mọi write; `APPROVED` trở lại → mở khóa và giữ nguyên status CDos; `CANCELLED` → CDos `CLOSED`, ghi lý do/audit và khóa write vĩnh viễn. Flow 2 phát Web Notification và tín hiệu real-time để FE cảnh báo TS. Không dùng DB trigger.
- **R17 — Thông báo (Flow 8):** hành động nghiệp vụ tạo `Notification` + `AccountNotification`; Flow 8 phát Email và hiển thị Web Notification/inbox. Không có native mobile push trong phạm vi Flow 2.
- **R18 — Kích hoạt Flow 5:** `QuarantineProof.status = FAILED` hoặc `CustomsClearanceProof.status = REJECTED` **và** `isFinalized = true` (X3 `FINALIZE`) → tạo `Notification` mức `URGENT` cho LM; không thay đổi CDos.
- **R19 — Bất biến sau Finalize:** `QuarantineProof`/`CustomsClearanceProof` sau Finalize đặt `isFinalized = true`, mọi sửa sau đó → `409 RECORD_LOCKED`. `AuthoritySubmission` sau khi có quyết định cũng không cho sửa file/reference đã nộp.
- **R20 — Mã tự sinh** (đã chốt G17, cùng dạng `PREFIX-YYYYMMDD-XXXX` như mã Booking `REQ-…` trong api-contract): `dossierCode = CD-YYYYMMDD-XXXX`, `documentCode = DOC-YYYYMMDD-XXXX`, `requestCode = DREQ-YYYYMMDD-XXXX`; `XXXX` là 4 chữ số, unique toàn hệ thống.
- **R21 — Hard-block ngày hết hạn:** create, replace và metadata-only đều từ chối nếu `expiryDate` đã hết hạn, sớm hơn ngày khởi hành hoặc không đáp ứng `DossierRequirement.validUntil`. FE validate sớm, BE bắt buộc kiểm tra lại; review không có quyền override và không có luồng warning rồi cho tiếp tục.
- **R22 — Metadata-only không tạo version/audit:** sửa riêng metadata khi version hiện tại chưa được review chỉ cập nhật `ComplianceDocument`; không tạo `DocumentVersion` mới và không ghi `AuditDossier` event.
- **R24 — ATA Carnet là `ComplianceRequirement` (đã chốt G26):** ATA thuộc loại CR (`category = CUSTOMS`), được yêu cầu như mọi DR khác và nộp/duyệt qua Mục 8–9 (hạn theo `ComplianceDocument.expiryDate`). Ngoài ra ERD V7 có `CustomsClearanceProof.ata_carnet_expiry_date` để TS ghi hạn ATA thực tế khi chốt hải quan (X3) và đối chiếu với hạn trên giấy tờ (X2).
- **R25 — Hai luồng khi cơ quan không chấp thuận (đã chốt G29; TS quyết định luồng ở S3, nộp lại không giới hạn số lần):** (1) **Từ chối hẳn** (`AuthoritySubmission.status = REJECTED` của cơ quan bắt buộc) → CDos `CLOSED` ngay, không sửa, không nộp lại. (2) **Trả về để sửa** (`RETURNED`) → CDos về `IN_PREPARATION`; Customer bổ sung giấy tờ, TS chuyển `READY_FOR_SUBMISSION` (V4) rồi ghi nhận nộp lại ở S1 (`submissionNo` tăng). Một Booking chỉ có 1 CDos (`ComplianceDossier.transport_id` giữ unique như ERD V7).

---

## 3. Danh mục ComplianceRequirement (UC-16)

| #      | API                                                     | Method & Endpoint                                | Auth | Role |
| ------- | -------------------------------------------------------- | -------------------------------------------------- | ---- | ---- |
| **C1** | [Danh sách CR](#c1-danh-sách-cr)                        | `GET /compliance-requirements`                    | 🔒   | TS, LM |
| **C2** | [Chi tiết CR](#c2-chi-tiết-cr)                          | `GET /compliance-requirements/{crId}`             | 🔒   | TS, LM |
| **C3** | [Tạo CR](#c3-tạo-cr)                                    | `POST /compliance-requirements`                   | 🔒   | TS   |
| **C4** | [Sửa CR](#c4-sửa-cr)                                    | `PUT /compliance-requirements/{crId}`             | 🔒   | TS   |
| **C5** | [Đổi trạng thái Active/Inactive](#c5-đổi-trạng-thái-cr) | `PATCH /compliance-requirements/{crId}/status`    | 🔒   | TS   |
| **C6** | [Xoá CR](#c6-xoá-cr)                                    | `DELETE /compliance-requirements/{crId}`          | 🔒   | TS   |

### C1. Danh sách CR

`GET /api/v1/compliance-requirements?pageIndex=1&pageSize=20&status=ACTIVE&country=GB&category=QUARANTINE&search=EHC&sortBy=updatedAt:desc`

| Query      | Type   | Bắt buộc | Mô tả                                   |
| ---------- | ------ | -------- | ----------------------------------------- |
| `status`  | string | No       | `ACTIVE` \| `INACTIVE`                  |
| `country` | string | No       | Lọc theo `ComplianceRequirement.country` |
| `category` | string | No      | Lọc theo `ComplianceRequirementCategory`  |
| `search`  | string | No       | Tìm theo `requirementCode`/`requirementName` |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "ComplianceRequirements retrieved successfully",
  "value": {
    "items": [
      {
        "complianceRequirementId": 12,
        "requirementCode": "CR-EHC-01",
        "requirementName": "Export Health Certificate (EHC)",
        "country": "GB",
        "category": "HORSE_HEALTH",
        "validityRequired": true,
        "validityPeriodDays": 30,
        "status": "ACTIVE",
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

### C2. Chi tiết CR

`GET /api/v1/compliance-requirements/{crId}`

**`200 OK`** — trả đầy đủ field bảng `ComplianceRequirement` (xem C3) kèm `isReferenced: boolean` và `referenceCount: { dossierTemplateItemCount, dossierRequirementCount, linkedDossierCount }`. FE dùng các số lượng này để hiển thị cảnh báo trước khi Edit và khoá Delete; **không khoá Edit**. Server vẫn phải đếm lại khi nhận PUT vì số tham chiếu có thể đã thay đổi (R3).

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "ComplianceRequirement retrieved successfully",
  "value": {
    "complianceRequirementId": 12,
    "requirementCode": "CR-EHC-01",
    "requirementName": "Export Health Certificate (EHC)",
    "description": null,
    "country": "GB",
    "category": "HORSE_HEALTH",
    "issuingAuthority": "APHA",
    "bcpCode": null,
    "legalBasis": null,
    "validityRequired": true,
    "validityPeriodDays": 30,
    "status": "ACTIVE",
    "createdAt": "2026-09-01T03:00:00Z",
    "updatedAt": "2026-09-20T03:00:00Z",
    "isReferenced": true,
    "referenceCount": { "dossierTemplateItemCount": 4, "dossierRequirementCount": 128, "linkedDossierCount": 100 }
  }
}
```

### C3. Tạo CR

`POST /api/v1/compliance-requirements`

| Field               | Type    | Bắt buộc | Mô tả                                                      |
| -------------------- | ------- | -------- | ------------------------------------------------------------ |
| `requirementCode`   | string  | Yes      | Do TS tự đặt, unique, tối đa 50 ký tự                       |
| `requirementName`   | string  | Yes      | Tối đa 200 ký tự                                            |
| `description`       | string  | No       | Mô tả tự do                                                  |
| `country`           | string  | No       | Quốc gia áp dụng; lưu `ComplianceRequirement.country`       |
| `category`          | string  | Yes      | `QUARANTINE` \| `CUSTOMS` \| `TRANSPORT` \| `HORSE_HEALTH` \| `HORSE_IDENTITY` \| `OTHER` |
| `issuingAuthority`  | string  | No       |                                                                |
| `validityRequired`  | boolean | Yes      | Có yêu cầu ngày hết hạn hay không                            |
| `validityPeriodDays` | number | Conditional | Bắt buộc và > 0 khi `validityRequired = true`             |
| `bcpCode`           | string  | No       | Lưu `ComplianceRequirement.bcp_code` (tối đa 50 ký tự)       |
| `legalBasis`        | string  | No       | Lưu `ComplianceRequirement.legal_basis`                      |
| `status`            | string  | No       | Mặc định `ACTIVE`                                            |

```json
{
  "requirementCode": "CR-CHEDA-01",
  "requirementName": "Common Health Entry Document (CHED-A)",
  "description": "Common Health Entry Document for animals entering the EU",
  "legalBasis": "Regulation (EU) 2016/429 (AHL)",
  "country": "EU",
  "category": "QUARANTINE",
  "issuingAuthority": "TRACES-NT",
  "validityRequired": true,
  "validityPeriodDays": 10,
  "status": "ACTIVE"
}
```

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "ComplianceRequirement entry saved successfully",
  "value": { "complianceRequirementId": 45, "requirementCode": "CR-CHEDA-01" }
}
```

| HTTP | errorCode                    | Message                                                                              |
| ---- | ------------------------------ | --------------------------------------------------------------------------------------- |
| 409  | `DUPLICATE_REQUIREMENT_CODE` | A ComplianceRequirement with this code already exists (`requirement_code` is unique across all records, including INACTIVE and soft-deleted ones) |

### C4. Sửa CR

`PUT /api/v1/compliance-requirements/{crId}` — Body giống C3 và thêm field xác nhận có điều kiện:

`requirementCode` sửa được (TS); nếu đổi thì vẫn phải unique (`409 DUPLICATE_REQUIREMENT_CODE`). Các field bắt buộc ở C3 vẫn bắt buộc.

```json
{
  "requirementName": "Export Health Certificate — updated",
  "country": "GB",
  "category": "HORSE_HEALTH",
  "validityRequired": true,
  "validityPeriodDays": 30,
  "status": "ACTIVE",
  "acknowledgeReferenceImpact": true
}
```

- CR chưa được tham chiếu: không bắt buộc `acknowledgeReferenceImpact`.
- CR đã được tham chiếu: bắt buộc `acknowledgeReferenceImpact = true`. BE đếm lại số tham chiếu trong transaction, cập nhật CR và lưu audit actor + snapshot before/after vào `CatalogAuditLog` (`before_data`, `after_data`, `reference_count_snapshot`).
- Nếu thiếu xác nhận, trả `409 REFERENCE_IMPACT_CONFIRMATION_REQUIRED` cùng số liệu mới nhất để FE mở lại hộp thoại cảnh báo:

```json
{
  "isSuccess": false,
  "code": 409,
  "message": "This ComplianceRequirement is linked to 100 dossiers. Editing it may affect active records. Confirm that you accept responsibility for this change.",
  "errorCode": "REFERENCE_IMPACT_CONFIRMATION_REQUIRED",
  "value": {
    "referenceCount": {
      "dossierTemplateItemCount": 4,
      "dossierRequirementCount": 128,
      "linkedDossierCount": 100
    }
  }
}
```

**`200 OK`** (khi cập nhật thành công)

```json
{ "isSuccess": true, "code": 200, "message": "ComplianceRequirement updated successfully", "value": { "complianceRequirementId": 12, "updatedAt": "2026-09-30T03:00:00Z" } }
```

### C5. Đổi trạng thái CR

Deactivate: hiển thị cảnh báo "sẽ ẩn khỏi DossierTemplate setup mới, không ảnh hưởng DT/CDos đã tồn tại" (UC-16 ALT-01) — hiển thị phía FE, không cần field riêng.

`PATCH /api/v1/compliance-requirements/{crId}/status`

```json
{ "status": "INACTIVE" }
```

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "ComplianceRequirement deactivated successfully", "value": null }
```

### C6. Xoá CR

Soft delete (R2). Chặn nếu đã tham chiếu (R3, UC-16 EXC-03); quyền sửa có cảnh báo không làm thay đổi quy tắc chặn xóa này.

`DELETE /api/v1/compliance-requirements/{crId}`

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "ComplianceRequirement deleted successfully", "value": null }
```

| HTTP | errorCode           | Message                                                                                             |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| 409  | `REQUIREMENT_IN_USE` | Cannot delete: N DossierTemplateItem(s) and M DossierRequirement(s) still referencing it. Please deactivate instead |

---

## 4. DossierTemplate (UC-17)

| #      | API                                                | Method & Endpoint                       | Auth | Role |
| ------- | ----------------------------------------------------- | ------------------------------------------ | ---- | ---- |
| **T1** | [Danh sách DT](#t1-danh-sách-dt)                    | `GET /dossier-templates`                 | 🔒   | TS, LM |
| **T2** | [Chi tiết DT (kèm DTI)](#t2-chi-tiết-dt-kèm-dti)   | `GET /dossier-templates/{templateId}`    | 🔒   | TS, LM |
| **T3** | [Tạo DT](#t3-tạo-dt)                                | `POST /dossier-templates`                | 🔒   | TS   |
| **T4** | [Sửa DT (kèm DTI)](#t4-sửa-dt-kèm-dti)             | `PUT /dossier-templates/{templateId}`    | 🔒   | TS   |
| **T5** | [Đổi trạng thái DT](#t5-đổi-trạng-thái-dt)         | `PATCH /dossier-templates/{templateId}/status` | 🔒   | TS   |
| **T6** | [Xoá DT](#t6-xoá-dt)                                | `DELETE /dossier-templates/{templateId}` | 🔒   | TS   |

> DTI (`DossierTemplateItem`) được quản lý **inline** trong body của T3/T4 (mảng `items`), không có API riêng — đúng thiết kế "bảng inline" ở `screen/flow2-screen-data-llm-only` mục 4.2.

### T1. Danh sách DT

Danh sách quản trị thông thường:

`GET /api/v1/dossier-templates?pageIndex=1&pageSize=20&status=ACTIVE&country=GB&search=UK-EU`

Danh sách gợi ý cho `SCR-F2-007`/UC-18:

`GET /api/v1/dossier-templates?pageIndex=1&pageSize=20&status=ACTIVE&bookingId=8102&sortBy=recommendation:desc`

- `bookingId` là query có điều kiện dùng khi Apply Template. BE resolve Booking/Transport/Route để lấy `originCountry` và `destinationCountry`; FE không tự gửi hai country rời để tránh lệch dữ liệu Booking.
- BE join `DossierTemplateItem → ComplianceRequirement`, chỉ xét template `ACTIVE`, chưa hết hiệu lực và chưa soft-delete.
- Xếp hạng: khớp CR country với **cả hai** đầu tuyến → khớp **một** đầu tuyến → template chỉ gồm CR dùng chung → các template active còn lại.
- `ComplianceRequirement.country = null` nghĩa là dùng chung, vẫn hiển thị trong preview nhưng không được tính là một country match.
- `country` vẫn là filter một quốc gia cho màn hình quản trị UC-17; `bookingId` mới là chế độ recommendation của UC-18. Không thêm country trùng lặp vào `DossierTemplate`.

**`200 OK`** — mỗi item: `dossierTemplateId`, `templateCode`, `templateName`, `versionNo`, `status`, `effectiveFrom`, `effectiveTo`, `itemCount`, `updatedAt`. Khi có `bookingId`, trả thêm `isRecommended`, `recommendationRank`, `matchedCountries`, `recommendationReason`:

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "DossierTemplates retrieved successfully",
  "value": {
    "items": [
      {
        "dossierTemplateId": 3,
        "templateCode": "DT-UK-EU-01",
        "templateName": "UK-to-EU Cross-Border Racehorse Master Template",
        "versionNo": 2,
        "status": "ACTIVE",
        "effectiveFrom": "2026-01-01",
        "effectiveTo": null,
        "itemCount": 9,
        "updatedAt": "2026-09-20T03:00:00Z",
        "isRecommended": true,
        "recommendationRank": 1,
        "matchedCountries": ["GB", "FR"],
        "recommendationReason": "Requirements in this template match both GB and FR on the booking route"
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Query bổ sung của T1: `status` (`DRAFT` \| `ACTIVE` \| `INACTIVE`), `country`, `search` (theo `templateCode`/`templateName`), `bookingId`, `sortBy` (`updatedAt:desc` mặc định, `templateName:asc\|desc`, `recommendation:desc` — chỉ hợp lệ khi có `bookingId`).

### T2. Chi tiết DT (kèm DTI)

`GET /api/v1/dossier-templates/{templateId}`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "DossierTemplate retrieved successfully",
  "value": {
    "dossierTemplateId": 3,
    "templateCode": "DT-UK-EU-01",
    "templateName": "UK-to-EU Cross-Border Racehorse Master Template",
    "description": "...",
    "versionNo": 2,
    "status": "ACTIVE",
    "effectiveFrom": "2026-01-01",
    "effectiveTo": null,
    "isReferenced": true,
    "referenceCount": { "complianceDossierCount": 5 },
    "items": [
      {
        "dossierTemplateItemId": 21,
        "complianceRequirementId": 12,
        "requirementName": "Export Health Certificate (EHC)",
        "sequenceNo": 1,
        "isMandatory": true,
        "appliesPerHorse": true,
        "instruction": "Nộp bản scan màu, còn hiệu lực tại ngày khởi hành"
      }
    ]
  }
}
```

> `appliesPerHorse` (boolean, cột `DossierTemplateItem.applies_per_horse` đã có ở ERD V7): khi Apply Template (Mục 5), `true` → BE nhân DR cho từng ngựa của Booking; `false` → 1 DR chung cả chuyến.

### T3. Tạo DT

`POST /api/v1/dossier-templates`

| Field                  | Type   | Bắt buộc | Mô tả                                       |
| ----------------------- | ------ | -------- | --------------------------------------------- |
| `templateCode`         | string | Yes      | Unique                                        |
| `templateName`         | string | Yes      |                                                |
| `description`          | string | No       |                                                |
| `status`               | string | No       | `DRAFT` \| `ACTIVE`, mặc định `DRAFT`      |
| `effectiveFrom`        | date   | No       |                                                |
| `effectiveTo`          | date   | No       |                                                |
| `items`                | array  | Yes      | Tối thiểu 1 phần tử                          |
| `items[].complianceRequirementId` | number | Yes | Phải đang `ACTIVE`                        |
| `items[].sequenceNo`   | number | Yes      | Duy nhất trong template                      |
| `items[].isMandatory`  | boolean| Yes      |                                                |
| `items[].appliesPerHorse` | boolean | No   | Mặc định `false` (xem T2)                    |
| `items[].instruction`  | string | No       |                                                |

**`201 Created`** → `value: { dossierTemplateId, templateCode }`

| HTTP | errorCode                 | Message                                                                                          |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| 400  | `TEMPLATE_NEEDS_ONE_ITEM` | A DossierTemplate must contain at least 1 DossierTemplateItem                                     |
| 400  | `DTI_DUPLICATE`           | Duplicate ComplianceRequirement or Sequence Number detected in the same template                  |
| 409  | `DUPLICATE_TEMPLATE_CODE`| Template code already exists                                                                       |

### T4. Sửa DT (kèm DTI)

`PUT /api/v1/dossier-templates/{templateId}` — body giống T3, `items` gửi lại **toàn bộ danh sách** (BE tính diff: thêm mới/xoá/update `sequenceNo`), `versionNo` server tự tăng.

```json
{
  "templateName": "UK-to-EU Cross-Border Racehorse Master Template",
  "description": "...",
  "status": "ACTIVE",
  "effectiveFrom": "2026-01-01",
  "effectiveTo": null,
  "items": [
    { "complianceRequirementId": 12, "sequenceNo": 1, "isMandatory": true, "appliesPerHorse": true, "instruction": "Nộp bản scan màu" },
    { "complianceRequirementId": 31, "sequenceNo": 2, "isMandatory": false, "appliesPerHorse": false, "instruction": null }
  ]
}
```

`templateCode` sửa được như các field khác; nếu đổi thì vẫn phải unique (`409 DUPLICATE_TEMPLATE_CODE`).

**`200 OK`** → `value: { "dossierTemplateId": 3, "templateCode": "DT-UK-EU-01", "versionNo": 3 }`, message `"DossierTemplate updated successfully"`.

Chặn sửa nếu `isReferenced = true` (R3):

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 409  | `TEMPLATE_IN_USE` | This DossierTemplate is already used by N ComplianceDossier(s) and cannot be edited (`value.referenceCount.complianceDossierCount`) |
| 400  | `TEMPLATE_NEEDS_ONE_ITEM` / `DTI_DUPLICATE` | Như T3 |

### T5. Đổi trạng thái DT

`PATCH /api/v1/dossier-templates/{templateId}/status`

```json
{ "status": "ACTIVE" }
```

Chuyển sang `ACTIVE` yêu cầu: đã có ≥ 1 DTI, `effectiveFrom`/`effectiveTo` hợp lệ (UC-17 ALT-01 bước 3).

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "DossierTemplate status updated successfully", "value": { "dossierTemplateId": 3, "status": "ACTIVE" } }
```

| HTTP | errorCode                | Message                                                              |
| ---- | -------------------------- | ------------------------------------------------------------------------ |
| 400  | `TEMPLATE_NOT_ACTIVATABLE`| Template must have at least 1 item and valid effective dates to activate |

### T6. Xoá DT

Soft delete (R2), chặn nếu `isReferenced = true` (UC-17 EXC-04): `409 TEMPLATE_IN_USE` kèm số lượng `ComplianceDossier` tham chiếu (`value.referenceCount.complianceDossierCount`).

`DELETE /api/v1/dossier-templates/{templateId}`

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "DossierTemplate deleted successfully", "value": null }
```

---

## 5. Khởi tạo ComplianceDossier từ Template (UC-18)

| #      | API                                                                  | Method & Endpoint                                    | Auth | Role |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------- | ---- | ---- |
| **D1** | [Kiểm tra CDos của Booking](#d1-kiểm-tra-cdos-của-booking)           | `GET /bookings/{bookingId}/compliance-dossier`         | 🔒   | CUS, TS, LM |
| **D2** | [Khởi tạo CDos từ Template / thủ công](#d2-khởi-tạo-cdos-từ-template--thủ-công) | `POST /bookings/{bookingId}/compliance-dossier`        | 🔒   | TS   |
| **D2I** | [Đồng bộ ngoại lệ Booking nội bộ](#d2i-đồng-bộ-ngoại-lệ-booking-nội-bộ) | `POST /internal/compliance-dossiers/sync-booking-status` | Service auth | Flow 1 |

> CDos gắn với `Transport` (không phải trực tiếp `Booking`); `Transport` 1-1 với `Booking` nên để thân thiện với FE (đã có `bookingId` từ Flow 1), endpoint dùng path `bookings/{bookingId}/...`. BE tự resolve `Booking → Transport → ComplianceDossier`. Mỗi Booking chỉ có tối đa 1 CDos (`transport_id` unique).

### D1. Kiểm tra CDos của Booking

Dùng để FE biết hiển thị nút "Apply DossierTemplate" hay chuyển thẳng sang trang chi tiết CDos.

`GET /api/v1/bookings/{bookingId}/compliance-dossier`

**`200 OK`** (đã có CDos) — trả tóm tắt `{ complianceDossierId, dossierCode, status }`.

**`404 NOT_FOUND`** (chưa có CDos) — UC-18 precondition / UC-20 EXC-02: `"ComplianceDossier has not been initialized. Waiting for transport booking approval."`

### D2. Khởi tạo CDos từ Template / thủ công

`POST /api/v1/bookings/{bookingId}/compliance-dossier`

| Field                        | Type    | Bắt buộc | Mô tả                                                                 |
| ------------------------------ | ------- | -------- | ------------------------------------------------------------------------ |
| `dossierTemplateId`          | number  | No       | Bỏ trống = tạo thủ công (UC-18 ALT-01)                                |
| `selectedTemplateItemIds`    | array   | No*      | Danh sách `dossierTemplateItemId` được tick chọn (bắt buộc nếu có `dossierTemplateId`) |
| `manualRequirements`         | array   | No*      | Bắt buộc nếu KHÔNG có `dossierTemplateId`. Mỗi phần tử giống body D3/D4 ở Mục 6 |

Từ template:

```json
{
  "dossierTemplateId": 3,
  "selectedTemplateItemIds": [21, 22, 24]
}
```

Thủ công (không có `dossierTemplateId`), mỗi phần tử có field như D3 (`complianceRequirementId`, `horseId`, `isMandatory`, `dueDate`, `instruction`):

```json
{
  "manualRequirements": [
    { "complianceRequirementId": 12, "horseId": 71, "isMandatory": true, "dueDate": "2026-10-01", "instruction": "Nộp bản scan màu" },
    { "complianceRequirementId": 31, "horseId": null, "isMandatory": false }
  ]
}
```

**Xử lý (theo `screen/flow2-screen-data-llm-only` mục 5.4, nhân bản theo ngựa — R11/G27):**

1. Trong cùng transaction, kiểm tra lại Booking đang `APPROVED`; sau đó `INSERT ComplianceDossier` (`dossierCode` tự sinh — R20, `status = IN_PREPARATION` sau khi tạo xong DR — R5, `openedAt = now`). Thay đổi Booking hậu khởi tạo chỉ đi qua ngoại lệ hotline R16/D2I.
2. Với mỗi DTI được chọn: nếu `appliesPerHorse = false` → tạo 1 `DossierRequirement` (`horseId = null`); nếu `appliesPerHorse = true` → tạo 1 `DossierRequirement` cho **mỗi con ngựa** trong `BookingHorse` của booking đó (VD 5 ngựa × 5 DTI → 25 DR). Với `manualRequirements`, `horseId` do TS chỉ định (`null` = chung cả chuyến).
3. Copy `isMandatory`, `instruction` từ DTI sang DR; `dueDate` để trống (nếu từ template) hoặc lấy từ `manualRequirements[].dueDate`. `validUntil` do BE tính từ `ComplianceRequirement.validityPeriodDays` (chỉ khi `validityRequired = true`). ERD V7 không có `leadTimeDays`.
4. Trả về CDos vừa tạo + tổng số DR đã sinh.

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "ComplianceDossier initialized successfully. DossierRequirements generated for customer.",
  "value": {
    "complianceDossierId": 501,
    "dossierCode": "CD-20260925-7731",
    "status": "IN_PREPARATION",
    "generatedRequirementCount": 25
  }
}
```

| HTTP | errorCode                      | Message                                                                     |
| ---- | -------------------------------- | -------------------------------------------------------------------------------- |
| 409  | `BOOKING_NOT_APPROVED`         | ComplianceDossier can only be initialized for APPROVED transport bookings (EXC-01) |
| 409  | `DOSSIER_ALREADY_EXISTS`      | A ComplianceDossier already exists for this booking (EXC-02)             |
| 400  | `TEMPLATE_OR_MANUAL_REQUIRED` | Provide either dossierTemplateId + selectedTemplateItemIds, or manualRequirements |
| 400  | `TEMPLATE_ITEM_INVALID` | A selected DossierTemplateItem does not belong to the given DossierTemplate, or the template is not ACTIVE |
| 400  | `REQUIREMENT_INACTIVE` | A referenced ComplianceRequirement is not ACTIVE |

### D2I. Đồng bộ ngoại lệ Booking nội bộ

Flow 1 gọi endpoint này **sau khi đã commit** thay đổi Booking do quy trình hotline; FE không gọi trực tiếp. Cách Flow 1 nhận và phê duyệt yêu cầu hotline là trách nhiệm nội bộ của Flow 1, không phải dependency còn mở của Flow 2.

`POST /api/v1/internal/compliance-dossiers/sync-booking-status`

```json
{
  "bookingId": 88,
  "bookingStatus": "CANCELLED",
  "reason": "Cancellation approved by Logistics Manager after customer hotline request",
  "occurredAt": "2026-09-29T03:20:00Z"
}
```

- `DRAFT`: giữ nguyên `ComplianceDossier.status`; mọi write API trả `409 BOOKING_CHANGE_IN_PROGRESS`. Phát cảnh báo cho TS rằng Booking đang được xử lý theo yêu cầu hotline.
- `APPROVED`: nếu CDos đang tạm khóa do `DRAFT`, mở lại thao tác ghi và giữ nguyên status CDos.
- `CANCELLED`: chuyển CDos sang `CLOSED`, lưu `closedAt` và lý do, append `DOSSIER_STATUS_CHANGED`; trạng thái này khóa write vĩnh viễn.
- Không cập nhật từng DR sang một status giả như `DISABLED`; việc vô hiệu hóa được thực thi qua write guard của CDos/Booking để không phá enum DB.
- Tạo `Notification`/`AccountNotification` cho TS liên quan và phát tín hiệu real-time để FE reload CDos rồi hiển thị `SCR-F2-UX-009`.
- Booking chưa có CDos: trả `204 No Content`. Request lặp lại phải idempotent.

| Field | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `bookingId` | number | Yes | |
| `bookingStatus` | string | Yes | `DRAFT` \| `APPROVED` \| `CANCELLED` |
| `reason` | string | No | Bắt buộc khi `CANCELLED` |
| `occurredAt` | timestamp | Yes | Dùng để bỏ qua request cũ hơn trạng thái đã đồng bộ |

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "Booking status synchronized", "value": { "complianceDossierId": 501, "dossierStatus": "CLOSED", "writeLocked": true } }
```

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400  | `INVALID_BOOKING_STATUS` | Unsupported bookingStatus |
| 401/403 | `FORBIDDEN` | Service authentication failed |

## 6. Quản lý DossierRequirement trong CDos (UC-19)

| #      | API                                                       | Method & Endpoint                                                       | Auth | Role |
| ------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- | ---- |
| **D3** | [Thêm DR thủ công](#d3-thêm-dr-thủ-công)                    | `POST /compliance-dossiers/{dossierId}/requirements`                     | 🔒   | TS   |
| **D4** | [Sửa DR](#d4-sửa-dr)                                        | `PUT /compliance-dossiers/{dossierId}/requirements/{drId}`               | 🔒   | TS   |
| **D5** | [Xoá DR (chỉ Optional)](#d5-xoá-dr-chỉ-optional)          | `DELETE /compliance-dossiers/{dossierId}/requirements/{drId}`            | 🔒   | TS   |
| **D6** | [Miễn trừ DR (Waive)](#d6-miễn-trừ-dr-waive)               | `PATCH /compliance-dossiers/{dossierId}/requirements/{drId}/waive`       | 🔒   | TS   |

### D3. Thêm DR thủ công

`POST /api/v1/compliance-dossiers/{dossierId}/requirements`

| Field                     | Type    | Bắt buộc | Mô tả                                         |
| --------------------------- | ------- | -------- | ------------------------------------------------ |
| `complianceRequirementId` | number  | Yes      | Phải đang `ACTIVE`                              |
| `horseId`                 | number  | No       | `null` = áp dụng chung cả chuyến (xem R11) |
| `isMandatory`             | boolean | Yes      |                                                   |
| `dueDate`                 | date    | No       |                                                   |
| `instruction`              | string  | No       |                                                   |

```json
{
  "complianceRequirementId": 12,
  "horseId": 71,
  "isMandatory": true,
  "dueDate": "2026-10-01",
  "instruction": "Nộp bản scan màu"
}
```

**`201 Created`**

```json
{ "isSuccess": true, "code": 201, "message": "DossierRequirement added successfully", "value": { "dossierRequirementId": 8102, "status": "PENDING" } }
```

Hệ thống đồng thời tạo `Notification` báo Customer (R17).

| HTTP | errorCode      | Message                                                                                        |
| ---- | ---------------- | -------------------------------------------------------------------------------------------------- |
| 409  | `DR_DUPLICATE` | This ComplianceRequirement is already required for this dossier/horse combination (kể cả `horseId = null`; xem G32 về unique index của DB) |
| 409  | `DOSSIER_LOCKED` | Cannot modify DossierRequirements after dossier submission to official authorities (EXC-02)      |
| 400  | `REQUIREMENT_INACTIVE` | The ComplianceRequirement is not ACTIVE |
| 400  | `HORSE_NOT_IN_BOOKING` | `horseId` does not belong to the booking of this dossier |

### D4. Sửa DR

`PUT /api/v1/compliance-dossiers/{dossierId}/requirements/{drId}` — sửa `isMandatory`, `dueDate`, `instruction`. Chặn nếu DR đã có `ComplianceDocument` (đã tham chiếu — R3-style) hoặc CDos đã khoá (R9/EXC-02).

```json
{ "isMandatory": false, "dueDate": "2026-10-05", "instruction": "Nộp bản scan màu, 2 mặt" }
```

**`200 OK`** → `{ "isSuccess": true, "code": 200, "message": "DossierRequirement updated successfully", "value": { "dossierRequirementId": 8102 } }`

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 409  | `DR_HAS_DOCUMENT` | Cannot edit a DossierRequirement that already has a ComplianceDocument |
| 409  | `DOSSIER_LOCKED` | Cannot modify DossierRequirements after dossier submission (EXC-02) |

### D5. Xoá DR (chỉ Optional)

`DELETE /api/v1/compliance-dossiers/{dossierId}/requirements/{drId}`

**`200 OK`** → `{ "isSuccess": true, "code": 200, "message": "DossierRequirement removed successfully", "value": null }`

Soft delete theo R2 (`is_deleted`, `deleted_at`, `deleted_by_account_id` của `DossierRequirement`). Chặn nếu `isMandatory = true`, DR đã có `ComplianceDocument` (R10) hoặc CDos đã khoá. Thành công ghi `DOSSIER_REQUIREMENT_REMOVED` vào `AuditDossier`; các API đọc mặc định không trả DR đã xóa.

| HTTP | errorCode                 | Message                                                                    |
| ---- | --------------------------- | ------------------------------------------------------------------------------- |
| 409  | `MANDATORY_DR_CANNOT_BE_REMOVED` | Mandatory core DossierRequirements cannot be removed (EXC-01)          |
| 409  | `DR_HAS_DOCUMENT` | Cannot remove a DossierRequirement that already has a ComplianceDocument (R10) |
| 409  | `DOSSIER_LOCKED`          | Cannot modify DossierRequirements after dossier submission (EXC-02)              |

### D6. Miễn trừ DR (Waive)

Không nằm trong UC gốc nhưng cột `waived_reason` đã có sẵn trong ERD — bổ sung để TS xử lý trường hợp "yêu cầu này không áp dụng cho ngựa/chuyến này" mà vẫn giữ yêu cầu trong checklist.

`PATCH /api/v1/compliance-dossiers/{dossierId}/requirements/{drId}/waive`

```json
{ "waivedReason": "Horse exempted per veterinary certificate on file from previous trip" }
```

`waivedReason` bắt buộc.

**`200 OK`** → DR chuyển `status = WAIVED`, tính vào % hoàn thành (R4).

```json
{ "isSuccess": true, "code": 200, "message": "DossierRequirement waived successfully", "value": { "dossierRequirementId": 8101, "status": "WAIVED" } }
```

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400  | `WAIVE_REASON_REQUIRED` | Please provide the reason for waiving this DossierRequirement |
| 409  | `DOSSIER_LOCKED` | Cannot modify DossierRequirements after dossier submission (EXC-02) |

---

## 7. Xem ComplianceDossier (UC-20)

| #      | API                                              | Method & Endpoint                                          | Auth | Role |
| ------- | --------------------------------------------------- | -------------------------------------------------------------- | ---- | ---- |
| **D7** | [Tổng quan CDos (Tab Overview)](#d7-tổng-quan-cdos) | `GET /compliance-dossiers/{dossierId}`                       | 🔒   | CUS, TS, LM |
| **D8** | [Danh sách DR (Tab DossierRequirements)](#d8-danh-sách-dr) | `GET /compliance-dossiers/{dossierId}/requirements`          | 🔒   | CUS, TS, LM |

### D7. Tổng quan CDos

`GET /api/v1/compliance-dossiers/{dossierId}`

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "ComplianceDossier retrieved successfully",
  "value": {
    "complianceDossierId": 501,
    "dossierCode": "CD-20260925-7731",

    "bookingId": 88,
    "bookingCode": "REQ-20260925-1002",

    "status": "IN_PREPARATION",

    "openedAt": "2026-09-25T02:00:00Z",
    "readyForSubmissionAt": null,
    "approvedAt": null,
    "rejectedAt": null,
    "closedAt": null,
    "rejectionReason": null,
    "note": null,

    "writeLocked": false,
    "writeLockReason": null,

    "progressPercent": 62.5,
    "mandatoryTotal": 8,
    "mandatorySatisfiedOrWaived": 5,

    "bookingSummary": {
      "bookingStatus": "APPROVED",
      "originCountry": "GB",
      "destinationCountry": "FR",
      "requestedDepartureDate": "2026-10-02",
      "customerName": "Nguyễn Minh Khang",
      "horseCount": 2,

      "horses": [
        {
          "horseId": 71,
          "horseName": "Pegaxus Star"
        },
        {
          "horseId": 72,
          "horseName": "Silver Arrow"
        }
      ]
    },

    "requirementSummary": {
      "total": 8,
      "pending": 2,
      "requested": 0,
      "provided": 1,
      "satisfied": 4,
      "rejected": 0,
      "waived": 1
    },

    "quarantineStatus": null,
    "customsClearanceStatus": null
  }
}
```

`quarantineStatus`/`customsClearanceStatus` là projection từ proof mới nhất, dạng `{ latestProofId, status, verifiedAt } | null` (R15) — không phải trạng thái của CDos.

`writeLocked`/`writeLockReason` là projection do BE tính từ CDos và Booking hiện tại, không phải cột mới của `ComplianceDossier`:

- Booking đang `DRAFT` do xử lý hotline → `writeLocked = true`, `writeLockReason = BOOKING_CHANGE_IN_PROGRESS`.
- CDos `CLOSED` do Booking đã `CANCELLED` → `writeLocked = true`, `writeLockReason = DOSSIER_CLOSED`.
- Booking được duyệt lại (`APPROVED`) → bỏ lock nếu CDos chưa bị khóa bởi chính vòng đời hồ sơ.

Lỗi: `403 FORBIDDEN` nếu Customer xem CDos không thuộc booking của mình (R12, EXC-01).

### D8. Danh sách DR

`GET /api/v1/compliance-dossiers/{dossierId}/requirements?status=REJECTED&horseId=71&pageIndex=1&pageSize=20&sortBy=dueDate:asc`

Chỉ trả DR chưa bị soft-delete; không expose `includeDeleted` cho FE Flow 2.

| Query      | Type   | Bắt buộc | Mô tả                                                 |
| ---------- | ------ | -------- | -------------------------------------------------------- |
| `status`  | string | No       | Lọc theo `DossierRequirementStatus` (ALT-01)              |
| `horseId` | number | No       | Có giá trị: chỉ trả DR của ngựa đó; bỏ trống: trả DR chung và DR theo ngựa |
| `pageIndex` | number | No     | Trang bắt đầu từ `1`, mặc định `1`                         |
| `pageSize` | number | No      | Mặc định `20`, tối đa `100`                                |
| `sortBy` | string | No        | `createdAt:asc` (mặc định), `dueDate:asc\|desc`, `status:asc\|desc` |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "DossierRequirements retrieved successfully",
  "value": {
    "items": [
      {
        "dossierRequirementId": 8101,
        "complianceRequirementId": 31,
        "requirementName": "Horse Passport",
        "horseId": 71,
        "horseName": "Pegaxus Star",
        "status": "REJECTED",
        "isMandatory": true,
        "dueDate": "2026-10-01",
        "validUntil": "2027-10-01",
        "satisfiedAt": null,
        "waivedReason": null,
        "note": "Passport image is unclear",
        "document": {
          "complianceDocumentId": 9201,
          "documentCode": "DOC-20260928-0001",
          "status": "REJECTED",
          "latestVersionNo": 1
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

Nếu DR chưa có giấy tờ được nộp thì `document = null`. Nếu không có DR khớp bộ lọc thì trả `200 OK` với `items = []`, không trả `404`.

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400 | `INVALID_REQUIREMENT_STATUS` | Invalid DossierRequirement status filter |
| 403 | `FORBIDDEN` | You do not have access to this ComplianceDossier |
| 404 | `DOSSIER_NOT_FOUND` | ComplianceDossier not found |

> **Phân quyền hiển thị nút hành động** (UC-20 AC-003, xử lý ở FE dựa theo `role` trong token, server vẫn enforce ở API ghi tương ứng): Customer thấy "Upload" (Mục 8); TS thấy "Add/Remove DR" (Mục 6), "Review" (Mục 9).

---

## 8. Nộp & Cập nhật ComplianceDocument (UC-21, UC-22)

| #      | API                                                              | Method & Endpoint                                                              | Auth | Role |
| ------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---- | ---- |
| **U1** | [Nộp giấy tờ lần đầu (v1)](#u1-nộp-giấy-tờ-lần-đầu-v1)          | `POST /compliance-dossiers/{dossierId}/requirements/{drId}/documents`            | 🔒   | CUS  |
| **U2** | [Chi tiết CDoc + lịch sử version](#u2-chi-tiết-cdoc--lịch-sử-version) | `GET /compliance-documents/{documentId}`                                        | 🔒   | CUS, TS, LM |
| **U3** | [Nộp file (edit-in-place hoặc version mới)](#u3-nộp-file-edit-in-place-hoặc-version-mới) | `POST /compliance-documents/{documentId}/versions`                              | 🔒   | CUS  |
| **U4** | [Sửa metadata only](#u4-sửa-metadata-only)                       | `PATCH /compliance-documents/{documentId}`                                       | 🔒   | CUS  |

> **G24 đã chốt:** TS không được upload/sửa giấy tờ thay Customer. U1/U3/U4 chỉ nhận Customer sở hữu Booking (R12); TS/LM gọi → `403 FORBIDDEN`. Các cột `created_by_account_id`, `updated_by_account_id`, `uploaded_by_account_id` của ERD V7 luôn là tài khoản Customer.

### U1. Nộp giấy tờ lần đầu (v1)

`POST /api/v1/compliance-dossiers/{dossierId}/requirements/{drId}/documents` · `Content-Type: multipart/form-data`

| Field              | Type       | Bắt buộc | Mô tả                                             |
| -------------------- | ---------- | -------- | ---------------------------------------------------- |
| `files`            | file[]     | Yes      | ≥ 1 file, PDF/JPG/JPEG/PNG, ≤ 10MB/file (BR-039)   |
| `documentName`     | string     | No       | Tối đa 200 ký tự; `ComplianceDocument.document_name` là cột bắt buộc, bỏ trống thì BE dùng `requirementName` của DR |
| `documentNumber`   | string     | No       |                                                        |
| `issuingAuthority` | string     | No       |                                                        |
| `issuedDate`       | date       | No       |                                                        |
| `expiryDate`       | date       | Conditional | Bắt buộc khi CR yêu cầu validity; phải không sớm hơn ngày khởi hành và `DossierRequirement.validUntil` |

> **R21:** ngày hết hạn không hợp lệ bị chặn cứng. FE validate trước để phản hồi sớm, BE vẫn bắt buộc kiểm tra lại; không có luồng override.
>
> **Điều kiện CDos cho phép nộp** (UC-21/22 ghi "`IN_PREPARATION` hoặc `REJECTED`"): contract này chỉ chấp nhận `IN_PREPARATION`. CDos bị cơ quan từ chối hẳn thì `CLOSED` (không nộp được nữa); CDos bị trả về (`RETURNED`) quay lại `IN_PREPARATION` nên Customer nộp bổ sung được (R25).

**Xử lý:** tạo `ComplianceDocument` (`documentCode` tự sinh — R20, `dossierRequirementId = drId`) + `DocumentVersion` `v1` chứa file primary + N-1 dòng `DocumentAttachment` (BR-039/R8) → DR chuyển `PROVIDED` (R6).

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "ComplianceDocument uploaded successfully (Version v1). Pending DocumentReview by Transport Specialist.",
  "value": {
    "complianceDocumentId": 1200,
    "documentCode": "DOC-20260925-1183",
    "documentVersionId": 3300,
    "versionNo": 1
  }
}
```

| HTTP | errorCode              | Message                                                          |
| ---- | ------------------------ | --------------------------------------------------------------------- |
| 413  | `FILE_TOO_LARGE`        | File size exceeds the maximum limit of 10MB                          |
| 400  | `INVALID_FILE_TYPE`    | Invalid file format. Only PDF, JPG, JPEG, and PNG files are accepted |
| 400  | `DOCUMENT_EXPIRES_BEFORE_DEPARTURE` | Document expiry date must be on or after the planned transport departure date |
| 400  | `DOCUMENT_VALIDITY_INSUFFICIENT` | Document expiry date does not satisfy the DossierRequirement valid-until date |
| 409  | `DR_ALREADY_HAS_DOCUMENT` | This DossierRequirement already has a ComplianceDocument — use [U3](#u3-nộp-file-edit-in-place-hoặc-version-mới) instead |
| 409  | `DOSSIER_LOCKED` | Cannot submit documents unless the ComplianceDossier is IN_PREPARATION |
| 404  | `DR_NOT_FOUND` | DossierRequirement not found in this ComplianceDossier (hoặc đã bị soft-delete) |

### U2. Chi tiết CDoc + lịch sử version

`GET /api/v1/compliance-documents/{documentId}`

**`200 OK`** — object `ComplianceDocument` đầy đủ + mảng `versions[]` (mới nhất trước), mỗi version kèm `files[]` đã hợp nhất từ file primary và `DocumentAttachment` (`fileName`, `fileUrl`, `mimeType`, `fileSizeBytes`, `sortOrder`) và `review` (nếu có): `{ documentReviewId, result, reviewComment, reviewedBy, reviewedAt }`.

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "ComplianceDocument retrieved successfully",
  "value": {
    "complianceDocumentId": 1200,
    "documentCode": "DOC-20260925-1183",
    "dossierRequirementId": 8101,
    "documentName": "Horse Passport",
    "status": "REJECTED",
    "documentNumber": "PP-2026-00981",
    "issuingAuthority": "Weatherbys",
    "issuedDate": "2025-03-01",
    "expiryDate": "2027-03-01",
    "note": null,
    "updatedAt": "2026-09-26T04:10:00Z",
    "versions": [
      {
        "documentVersionId": 3300,
        "versionNo": 1,
        "uploadNote": null,
        "uploadedAt": "2026-09-25T02:30:00Z",
        "files": [
          { "fileName": "passport-front.jpg", "fileUrl": "https://.../passport-front.jpg", "mimeType": "image/jpeg", "fileSizeBytes": 812345, "sortOrder": 1 },
          { "fileName": "passport-back.jpg", "fileUrl": "https://.../passport-back.jpg", "mimeType": "image/jpeg", "fileSizeBytes": 790112, "sortOrder": 2 }
        ],
        "review": {
          "documentReviewId": 900,
          "result": "REJECTED",
          "reviewComment": "Stamp is unclear on page 2",
          "reviewedBy": { "accountId": 402, "fullName": "Nguyễn Tiến Hoàng" },
          "reviewedAt": "2026-09-26T04:10:00Z"
        }
      }
    ],
    "openRequest": { "documentRequestId": 15, "requestCode": "DREQ-20260926-0003", "requestType": "REUPLOAD", "message": "...", "dueDate": "2026-10-05" }
  }
}
```

`openRequest` là `DocumentRequest` đang `OPEN` của DR (hoặc `null`) để Customer biết cần sửa gì.

### U3. Nộp file (edit-in-place hoặc version mới)

Một endpoint duy nhất, BE tự quyết định hành vi theo **R9 (BR-040)** — FE không cần biết trước là edit-in-place hay version mới.

`POST /api/v1/compliance-documents/{documentId}/versions` · `multipart/form-data`

Body giống U1 (`files`, `documentNumber`, `issuingAuthority`, `issuedDate`, `expiryDate`) + `uploadNote` (string, optional — ghi chú phản hồi TS).

Áp dụng lại toàn bộ validation ngày hết hạn của U1/R21.

Khi version mới được nộp, `DocumentRequest` đang `OPEN` của DR (nếu có) chuyển `FULFILLED` (`fulfilled_at = now`).

**`200 OK`** (edit-in-place, chưa từng review — `mode = EDIT_IN_PLACE`, giữ `versionNo`) hoặc **`201 Created`** (tạo version mới, đã từng bị reject):

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "New DocumentVersion (v2) submitted successfully. Pending DocumentReview.",
  "value": { "documentVersionId": 3301, "versionNo": 2, "mode": "NEW_VERSION" }
}
```

`mode`: `"EDIT_IN_PLACE"` hoặc `"NEW_VERSION"` — FE dùng để hiện toast phù hợp.

| HTTP | errorCode                  | Message                                                                                     |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| 409  | `DOCUMENT_ALREADY_VERIFIED` | This ComplianceDocument has already been verified and locked (EXC-01)                            |
| 409  | `DOSSIER_LOCKED`            | Cannot submit new DocumentVersions while ComplianceDossier is undergoing official authority review (EXC-02) |
| 400  | `DOCUMENT_EXPIRES_BEFORE_DEPARTURE` | Document expiry date must be on or after the planned transport departure date |
| 400  | `DOCUMENT_VALIDITY_INSUFFICIENT` | Document expiry date does not satisfy the DossierRequirement valid-until date |
| 413  | `FILE_TOO_LARGE` / 400 `INVALID_FILE_TYPE` | Như U1 |

### U4. Sửa metadata only

Dùng khi version hiện tại vẫn rõ, chỉ cần đính chính số liệu (UC-22 ALT-01). Chỉ cho phép khi phiên bản mới nhất **chưa được duyệt** (giống điều kiện edit-in-place ở R9); nếu đã duyệt/từ chối thì dùng U3.

`PATCH /api/v1/compliance-documents/{documentId}`

```json
{ "documentNumber": "PP-2026-00981", "issuedDate": "2025-03-01", "expiryDate": "2027-03-01" }
```

Field cho phép: `documentName`, `documentNumber`, `issuingAuthority`, `issuedDate`, `expiryDate`, `note` (mọi field đều tùy chọn, gửi field nào cập nhật field đó).

BE áp dụng cùng validation ngày hết hạn như U1/R21. **`200 OK`** chỉ cập nhật metadata và `updatedAt`; theo R22, thao tác metadata-only không tạo `AuditDossier` event và không tạo `DocumentVersion` mới.

```json
{ "isSuccess": true, "code": 200, "message": "ComplianceDocument metadata updated successfully", "value": { "complianceDocumentId": 1200, "updatedAt": "2026-09-27T03:00:00Z" } }
```

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 409  | `DOCUMENT_ALREADY_REVIEWED` | The latest version has already been reviewed; submit a new version via U3 |
| 400  | `DOCUMENT_EXPIRES_BEFORE_DEPARTURE` / `DOCUMENT_VALIDITY_INSUFFICIENT` | Như U1 |
| 409  | `DOSSIER_LOCKED` | Cannot modify documents unless the ComplianceDossier is IN_PREPARATION |

---

## 9. Thẩm định giấy tờ — DocumentReview & DocumentRequest (UC-23, UC-24)

| #      | API                                                        | Method & Endpoint                                        | Auth | Role |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------- | ---- | ---- |
| **V1** | [Duyệt Đạt (Approve)](#v1-duyệt-đạt-approve)                 | `POST /compliance-documents/{documentId}/versions/{versionId}/reviews` | 🔒   | TS   |
| **V2** | [Từ chối + Tạo DocumentRequest](#v2-từ-chối--tạo-documentrequest) | `POST /compliance-documents/{documentId}/versions/{versionId}/reviews` | 🔒   | TS   |
| **V4** | [Chuyển CDos sang READY_FOR_SUBMISSION](#v4-chuyển-cdos-sang-ready_for_submission) | `PATCH /compliance-dossiers/{dossierId}/ready-for-submission` | 🔒   | TS   |

> V1 và V2 dùng **chung 1 endpoint**, phân biệt bằng field `result` trong body — vì cả hai đều là hành động "tạo 1 `DocumentReview`", chỉ khác `result` và có kèm `DocumentRequest` hay không.
>
> **V3 (Thu hồi kết quả Review) đã bị bỏ** theo quyết định team; giữ nguyên mã V4 để không đổi tham chiếu. Document đã `APPROVED` bị khóa theo R9 (`DOCUMENT_ALREADY_VERIFIED`).

### V1. Duyệt Đạt (Approve)

`POST /api/v1/compliance-documents/{documentId}/versions/{versionId}/reviews`

```json
{ "result": "APPROVED", "reviewComment": "Signature and stamp verified against OV register" }
```

**Xử lý:** tạo `DocumentReview` (`reviewed_by_account_id` = TS hiện tại) → `ComplianceDocument.status = APPROVED` (R7) → DR tương ứng chuyển `SATISFIED`, `satisfiedAt = now` (R6).

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "DocumentReview recorded: APPROVED. DossierRequirement status updated to SATISFIED.",
  "value": { "documentReviewId": 900, "dossierRequirementStatus": "SATISFIED" }
}
```

> Do U1/U3/U4 đã chặn cứng metadata hết hạn theo R21, V1 không có cơ chế xác nhận ngoại lệ. Nếu dữ liệu cũ vi phạm, trả `409 DOCUMENT_EXPIRY_INVALID` và yêu cầu sửa metadata/tải lại trước khi duyệt.

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 409  | `DOCUMENT_EXPIRY_INVALID` | Document expiry date is no longer valid; ask the customer to update it before approval |
| 409  | `VERSION_NOT_LATEST` | Only the latest DocumentVersion can be reviewed |
| 409  | `VERSION_ALREADY_REVIEWED` | This DocumentVersion has already been reviewed |
| 409  | `DOSSIER_LOCKED` | Cannot review documents after dossier submission to official authorities |

### V2. Từ chối + Tạo DocumentRequest

```json
{
  "result": "REJECTED",
  "reviewComment": "Stamp is unclear on page 2",
  "documentRequest": {
    "requestType": "REUPLOAD",
    "message": "File scan bị mờ mộc đỏ phòng lab. Vui lòng chụp lại khổ đứng rõ nét.",
    "dueDate": "2026-10-05"
  }
}
```

| Field                              | Type   | Bắt buộc | Mô tả                                                                      |
| ------------------------------------ | ------ | -------- | ------------------------------------------------------------------------------ |
| `result`                           | string | Yes      | `REJECTED` hoặc `REVISION_REQUIRED`                                          |
| `documentRequest.requestType`      | string | Yes      | `MISSING_DOCUMENT` \| `REVISION` \| `REUPLOAD` \| `ADDITIONAL_INFORMATION` |
| `documentRequest.message`          | string | Yes      | Tối thiểu 15 ký tự (EXC-01)                                                 |
| `documentRequest.dueDate`          | date   | No       |                                                                                |

**Xử lý:** tạo `DocumentReview` (`result`) + tạo `DocumentRequest` (`requested_by_account_id` = TS hiện tại, `requestCode` tự sinh — R20) → `ComplianceDocument.status = REJECTED` → DR chuyển `REJECTED` → CDos chuyển về `IN_PREPARATION` nếu đang khác (R5). UC-24 còn wording "IN_PREPARATION (hoặc REJECTED)"; contract chọn luôn `IN_PREPARATION`.

Endpoint giống V1: `POST /api/v1/compliance-documents/{documentId}/versions/{versionId}/reviews`.

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "DocumentReview recorded: REJECTED. DocumentRequest created and customer notified.",
  "value": {
    "documentReviewId": 901,
    "documentRequestId": 15,
    "requestCode": "DREQ-20260926-0003",
    "dossierRequirementStatus": "REJECTED",
    "dossierStatus": "IN_PREPARATION"
  }
}
```

| HTTP | errorCode                    | Message                                                                                          |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 400  | `REQUEST_MESSAGE_TOO_SHORT`   | Please provide detailed instructions in the DocumentRequest (minimum 15 characters)                    |
| 409  | `DOSSIER_LOCKED`              | Cannot create DocumentRequests after dossier submission to official authorities (EXC-02)                |
| 400  | `DOCUMENT_REQUEST_REQUIRED`   | `documentRequest` is required when result is REJECTED or REVISION_REQUIRED                             |
| 409  | `VERSION_NOT_LATEST` / `VERSION_ALREADY_REVIEWED` | Như V1                                                                  |

### V4. Chuyển CDos sang READY_FOR_SUBMISSION

TS chủ động bấm sau khi review xong DR mandatory cuối cùng (UC-23 bước 9 — hệ thống **không** tự động chuyển).

`PATCH /api/v1/compliance-dossiers/{dossierId}/ready-for-submission`

**`200 OK`** (server tự kiểm tra R4 = 100% trước khi chuyển)

```json
{ "isSuccess": true, "code": 200, "message": "ComplianceDossier is now READY_FOR_SUBMISSION", "value": null }
```

| HTTP | errorCode                | Message                                                                |
| ---- | -------------------------- | --------------------------------------------------------------------------- |
| 409  | `MANDATORY_DR_NOT_DONE`  | All mandatory DossierRequirements must be SATISFIED or WAIVED first        |
| 409  | `INVALID_DOSSIER_STATUS` | Only a dossier in IN_PREPARATION can be moved to READY_FOR_SUBMISSION      |

Request không có body. Thành công đặt `ready_for_submission_at = now` và ghi audit `DOSSIER_STATUS_CHANGED`.

---

## 10. Nhắc nộp bổ sung (UC-25)

| #      | API                                      | Method & Endpoint                                       | Auth | Role |
| ------- | ------------------------------------------- | ----------------------------------------------------------- | ---- | ---- |
| **V5** | [Gửi nhắc nhở DR còn thiếu](#v5-gửi-nhắc-nhở-dr-còn-thiếu) | `POST /compliance-dossiers/{dossierId}/requirements/reminders` | 🔒   | TS   |

`POST /api/v1/compliance-dossiers/{dossierId}/requirements/reminders`

```json
{
  "dossierRequirementIds": [601, 602],
  "dueDate": "2026-10-10",
  "note": "Vui lòng nộp trước ngày khởi hành 2 tuần để kịp xử lý"
}
```

**Xử lý:** chỉ chấp nhận DR đang `status = PENDING` hoặc `REQUESTED` (đã `PROVIDED`/`SATISFIED` thì loại khỏi danh sách); DR được chọn chuyển `PENDING → REQUESTED` (R6); tạo `Notification` gộp (R17).

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "Missing DossierRequirement reminder sent successfully", "value": { "remindedCount": 2 } }
```

| HTTP | errorCode          | Message                                                          |
| ---- | -------------------- | --------------------------------------------------------------------- |
| 400  | `NO_MISSING_DR`     | All selected DossierRequirements already have uploaded documents (EXC-01) |
| 409  | `DOSSIER_LOCKED`    | Cannot send reminders unless the ComplianceDossier is IN_PREPARATION       |

`dueDate` (tùy chọn) được ghi vào `DossierRequirement.due_date` của các DR được nhắc; `note` (tùy chọn) đưa vào nội dung Notification/Email gửi Customer. DR không còn ở trạng thái `PENDING`/`REQUESTED` bị bỏ qua, `remindedCount` là số DR thực sự được nhắc.

> **UC-25 ALT-01** (cron job tự động nhắc theo lịch 21/60 ngày) là tác vụ nền (scheduler), không phải API do FE gọi — không đưa vào contract này, chỉ note để BE tạo background job riêng dùng lại đúng logic "chuyển `PENDING → REQUESTED`" ở trên.

---

## 11. Nộp & Cập nhật kết quả cơ quan chức năng — AuthoritySubmission (UC-26, UC-27)

| #      | API                                                      | Method & Endpoint                                                    | Auth | Role |
| ------- | --------------------------------------------------------- | --------------------------------------------------------------------- | ---- | ---- |
| **S1** | [Ghi nhận nộp hồ sơ](#s1-ghi-nhận-nộp-hồ-sơ)             | `POST /compliance-dossiers/{dossierId}/authority-submissions`         | 🔒   | TS   |
| **S2** | [Danh sách lần nộp](#s2-danh-sách-lần-nộp)               | `GET /compliance-dossiers/{dossierId}/authority-submissions`         | 🔒   | CUS, TS, LM |
| **S3** | [Cập nhật kết quả xét duyệt](#s3-cập-nhật-kết-quả-xét-duyệt) | `PATCH /authority-submissions/{submissionId}/decision`                | 🔒   | TS   |

### S1. Ghi nhận nộp hồ sơ

Lần nộp đầu yêu cầu `ComplianceDossier.status = READY_FOR_SUBMISSION`; lần nộp bổ sung cho cơ quan khác cho phép khi CDos đang `SUBMITTED`/`PENDING`. `submissionNo` tự tăng theo unique index `(compliance_dossier_id, submission_no)`.

`POST /api/v1/compliance-dossiers/{dossierId}/authority-submissions` · `multipart/form-data`

| Field                  | Type   | Bắt buộc | Mô tả                                              |
| ------------------------ | ------ | -------- | ------------------------------------------------------ |
| `authorityName`        | string | Yes      | VD: `TRACES-NT`, `APHA IPAFFS`, `CDS`                |
| `submissionReference`  | string | Yes      | CHED-A / MRN, không được đang gắn với CDos khác (EXC-02); cùng một CDos được dùng lại          |
| `submissionMethod`     | string | No       |                                                          |
| `submittedAt`          | timestamp | Yes  |                                                          |
| `isRequired`           | boolean | Yes      | Có phải cơ quan bắt buộc để CDos được `APPROVED`; lưu vào `AuthoritySubmission.is_required` (mặc định `true`) |
| `proofFile`            | file   | Yes      | Biên nhận nộp; lưu thành `AuthoritySubmissionEvidenceFile` với `evidenceType = OTHER` |
| `decisionNote`         | string | No       |                                                          |

**Xử lý:** tạo `AuthoritySubmission` (`status = SUBMITTED`, `submitted_by_account_id` lấy từ access token) và `AuthoritySubmissionEvidenceFile` cho `proofFile`. Nếu CDos đang `READY_FOR_SUBMISSION` (lần nộp đầu, hoặc nộp lại sau `RETURNED`) → đặt `ComplianceDossier.status = SUBMITTED`; các lần nộp bổ sung cho cơ quan khác giữ `SUBMITTED`/`PENDING` hiện tại (R5).

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Authority submission recorded successfully",
  "value": { "authoritySubmissionId": 61, "submissionNo": 1, "status": "SUBMITTED", "dossierStatus": "SUBMITTED" }
}
```

| HTTP | errorCode                      | Message                                                                    |
| ---- | --------------------------------- | --------------------------------------------------------------------------------- |
| 409  | `DOSSIER_NOT_READY`             | Cannot submit ComplianceDossier. All mandatory DossierRequirements must be SATISFIED or WAIVED first, and the dossier must be READY_FOR_SUBMISSION (or SUBMITTED/PENDING for an additional authority) (EXC-01) |
| 413  | `FILE_TOO_LARGE` / 400 `INVALID_FILE_TYPE` | Như U1 cho `proofFile` |
| 409  | `DUPLICATE_SUBMISSION_REFERENCE` | This submission reference number is already linked to another ComplianceDossier (EXC-02). Cùng một CDos được dùng lại mã này cho các lần nộp sau; BE kiểm tra ở tầng ứng dụng vì DB không có unique index — G33 |

### S2. Danh sách lần nộp

`GET /api/v1/compliance-dossiers/{dossierId}/authority-submissions` — trả mảng, mới nhất trước (không phân trang).

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Authority submissions retrieved successfully",
  "value": {
    "items": [
      {
        "authoritySubmissionId": 61,
        "submissionNo": 1,
        "authorityName": "TRACES-NT",
        "submissionReference": "CHEDA.GB.2026.0012345",
        "submissionMethod": "ONLINE_PORTAL",
        "status": "APPROVED",
        "isRequired": true,
        "submittedAt": "2026-09-27T02:00:00Z",
        "responseReceivedAt": "2026-09-28T02:00:00Z",
        "permitNumber": "PMT-2026-001",
        "permitIssuedDate": "2026-09-28",
        "permitExpiryDate": "2026-12-28",
        "revisionDueDate": null,
        "decisionNote": null,
        "rejectionReason": null,
        "submittedBy": { "accountId": 402, "fullName": "Nguyễn Tiến Hoàng" },
        "evidenceFiles": [
          { "evidenceType": "OTHER", "fileName": "receipt.pdf", "fileUrl": "https://.../receipt.pdf", "mimeType": "application/pdf", "fileSizeBytes": 120345, "note": null },
          { "evidenceType": "ACCEPTANCE", "fileName": "approval.pdf", "fileUrl": "https://.../approval.pdf", "mimeType": "application/pdf", "fileSizeBytes": 220345, "note": null }
        ]
      }
    ]
  }
}
```

### S3. Cập nhật kết quả xét duyệt

`PATCH /api/v1/authority-submissions/{submissionId}/decision` · `multipart/form-data`

| Field                    | Type   | Bắt buộc | Mô tả                                                             |
| -------------------------- | ------ | -------- | --------------------------------------------------------------------- |
| `decision`               | string | Yes      | `APPROVED` \| `REJECTED` \| `RETURNED`; không nhận `ADDITIONAL_INFO_REQUIRED` |
| `permitNumber`           | string | Yes nếu `APPROVED` | Lưu `permit_number`                                       |
| `permitIssuedDate`       | date   | No       |                                                                         |
| `permitExpiryDate`       | date   | No       |                                                                         |
| `decisionFile`           | file   | Yes      | Lưu thành `AuthoritySubmissionEvidenceFile` với `evidenceType` tương ứng (AC-003) |
| `decisionNote`           | string | No       |                                                                         |
| `rejectionReason`        | string | Yes nếu `REJECTED` |                                                             |
| `revisionDueDate`        | date   | Yes nếu `RETURNED` |                                             |

**Mapping (R5):**

- `APPROVED` → submission hiện tại `APPROVED`; chỉ đặt CDos `APPROVED` khi **tất cả** submission `isRequired = true` đều `APPROVED`, nếu chưa đủ thì CDos `PENDING` (trả `200` với `dossierStatus = "PENDING"`, không phải lỗi).
- File `decisionFile` lưu ở `AuthoritySubmissionEvidenceFile` (`uploaded_by_employee_id` = TS hiện tại) với `evidenceType`: `APPROVED` → `ACCEPTANCE`, `REJECTED` → `REJECTION`, `RETURNED` → `ADDITIONAL_INFORMATION`.
- `REJECTED` (**TS chọn** khi từ chối hẳn) → submission hiện tại `REJECTED`; nếu là submission bắt buộc thì **cancel luôn CDos** (`CLOSED`, ghi `rejectedAt`, `rejectionReason`, `closedAt`; R5/R25), `value.dossierStatus = "CLOSED"`. Nếu là submission không bắt buộc thì CDos giữ nguyên trạng thái.
- `RETURNED` (**TS chọn** khi cho sửa và nộp lại; không giới hạn số lần) → submission hiện tại `RETURNED`, CDos về `IN_PREPARATION` để sửa/bổ sung hồ sơ rồi nộp lại (R25).

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "Authority decision recorded successfully for ComplianceDossier", "value": { "authoritySubmissionId": 61, "submissionStatus": "APPROVED", "dossierStatus": "APPROVED" } }
```

`dossierStatus` là `APPROVED` \| `PENDING` \| `CLOSED` \| `IN_PREPARATION` tùy `decision` và các submission bắt buộc còn lại. Server đặt `response_received_at = now`.

| HTTP | errorCode                    | Message                                                    |
| ---- | ------------------------------ | ----------------------------------------------------------------- |
| 400  | `DECISION_FILE_REQUIRED`     | Please upload the official authority decision document (AC-003) |
| 400  | `PERMIT_NUMBER_REQUIRED` / `REJECTION_REASON_REQUIRED` / `REVISION_DUE_DATE_REQUIRED` | Field bắt buộc theo `decision` bị thiếu |
| 409  | `SUBMISSION_ALREADY_DECIDED` | This AuthoritySubmission already has a decision and is read-only (R19) |

---

## 12. Kiểm dịch BCP (UC-28a, UC-28b)

> ERD V7 lưu toàn bộ bằng chứng và kết quả kiểm dịch trong `QuarantineProof`. Bảng này liên kết tới CDos để đối chiếu chuyến đi, nhưng mọi kết quả `PASSED`, `PASSED_WITH_CONDITIONS`, `HOLDBACK`, `FAILED` hoặc `REJECTED` chỉ cập nhật `QuarantineProof.status`, không cập nhật `ComplianceDossier.status`.

| #      | API                                                          | Method & Endpoint                                                       | Auth | Role |
| ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- | ---- |
| **Q1** | [Nộp nhanh proof BCP](#q1-nộp-nhanh-proof-bcp)                  | `POST /compliance-dossiers/{dossierId}/quarantine-proofs`             | 🔒   | ESC, DRV |
| **Q2** | [Chi tiết proof chờ duyệt](#q2-chi-tiết-proof-chờ-duyệt)       | `GET /quarantine-proofs/{proofId}`                                    | 🔒   | TS, LM |
| **Q3** | [Chốt/Từ chối kết quả](#q3-chốttừ-chối-kết-quả)                | `PATCH /quarantine-proofs/{proofId}/finalize`                         | 🔒   | TS   |

### Q1. Nộp nhanh proof BCP

Yêu cầu `ComplianceDossier.status = APPROVED` (R14). BE kiểm tra Escort/Driver được phân công chuyến đi này (R13).

`POST /api/v1/compliance-dossiers/{dossierId}/quarantine-proofs` · `multipart/form-data`

| Field                | Type   | Bắt buộc | Mô tả                                                     |
| ---------------------- | ------ | -------- | -------------------------------------------------------------- |
| `bcpName`            | string | Yes      | Tự gợi ý theo GPS ở FE, gửi lên tên cuối cùng                 |
| `locationId`         | number | No       | Địa điểm BCP nếu đã có trong danh mục `Location`              |
| `inspectionAt`       | datetime | No     | Thời điểm kiểm tra thực tế                                    |
| `isHoldback`         | boolean | No      | `true` nếu BCP đang giữ chuyến/ngựa để kiểm tra lại; mặc định `false` |
| `quickNote`          | string  | Conditional | Bắt buộc khi `isHoldback = true`; lưu vào `submitted_note` |
| `files`              | file[] | Yes      | Một hoặc nhiều ảnh, ≤ 5MB/file; mỗi file lưu 1 record `ProofAttachment` (`quarantine_proof_id` = proof này) |

UC-28a còn wording “Escort chọn PASSED”, nhưng screen mới và ERD V7 xác định kết quả chính thức do TS chốt. Vì vậy submitter chỉ gửi `isHoldback`; trường hợp thường luôn tạo `PENDING_VERIFICATION`, không nhận `PASSED` từ client.

**`201 Created`**

```json
{
  "isSuccess": true,
  "code": 201,
  "message": "Quarantine proof submitted successfully. Awaiting TS Verification.",
  "value": { "quarantineProofId": 7001 }
}
```

Server đặt `QuarantineProof.status = PENDING_VERIFICATION`; nếu `isHoldback = true` thì đặt `HOLDBACK`. Trong cả hai trường hợp, `ComplianceDossier.status` không đổi.

| HTTP | errorCode              | Message                                     |
| ---- | ------------------------ | ------------------------------------------------ |
| 403  | `NOT_ASSIGNED_TO_TRIP` | You are not assigned to this transport (R13)    |
| 400  | `EVIDENCE_UNCLEAR`     | Upload failed or image unclear. Please retake the photo (EXC-01) |
| 409  | `DOSSIER_NOT_APPROVED` | Quarantine proof can only be submitted when the ComplianceDossier is APPROVED (R14) |
| 400  | `QUICK_NOTE_REQUIRED`  | `quickNote` is required when `isHoldback = true` |
| 413  | `FILE_TOO_LARGE` / 400 `INVALID_FILE_TYPE` | Ảnh > 5MB hoặc sai định dạng |

### Q2. Chi tiết proof chờ duyệt

`GET /api/v1/quarantine-proofs/{proofId}` — trả đầy đủ field của `QuarantineProof`. Danh sách đối chiếu microchip được đọc/ghi qua `microchipChecklist` (`jsonb`).

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "QuarantineProof retrieved successfully",
  "value": {
    "quarantineProofId": 7001,
    "complianceDossierId": 501,
    "status": "PENDING_VERIFICATION",
    "bcpName": "Calais BCP",
    "locationId": 55,
    "inspectionAt": "2026-10-02T08:00:00Z",
    "submittedNote": null,
    "submittedBy": { "employeeId": 20, "fullName": "Trần Văn Escort" },
    "submittedAt": "2026-10-02T08:10:00Z",
    "officialVeterinarianName": null,
    "bcpReceiptNumber": null,
    "conditions": null,
    "microchipChecklist": null,
    "expectedHorses": [ { "horseId": 71, "horseName": "Pegaxus Star", "microchipNumber": "826000000000001" } ],
    "verifiedBy": null,
    "verifiedAt": null,
    "verificationNote": null,
    "rejectionReason": null,
    "isFinalized": false,
    "finalizedAt": null,
    "files": [ { "fileName": "bcp-1.jpg", "fileUrl": "https://.../bcp-1.jpg", "mimeType": "image/jpeg", "fileSizeBytes": 512345, "sortOrder": 1 } ]
  }
}
```

`expectedHorses` là danh sách ngựa của CDos để TS đối chiếu `microchipChecklist`.

### Q3. Chốt/Từ chối kết quả

`PATCH /api/v1/quarantine-proofs/{proofId}/finalize`

| Field                 | Type    | Bắt buộc | Mô tả                                                                     |
| ------------------------ | ------- | -------- | ------------------------------------------------------------------------------ |
| `action`               | string  | Yes      | `FINALIZE` \| `REJECT_PROOF`                                                 |
| `officialVetName`      | string  | Yes nếu `FINALIZE` |                                                                      |
| `bcpReceiptNo`         | string  | No       |                                                                                  |
| `status`               | string  | Yes nếu `FINALIZE` | `PASSED` \| `PASSED_WITH_CONDITIONS` \| `FAILED`                     |
| `conditions`           | string  | Yes nếu `status = PASSED_WITH_CONDITIONS` |                                                    |
| `microchipChecklist`   | array   | Yes nếu `FINALIZE` | `[{ horseId, microchipNumber, isMatched: true }]` — **phải đủ 100% ngựa trong CDos** |
| `rejectionReason`      | string  | Yes nếu `REJECT_PROOF` |                                                                       |

```json
{
  "action": "FINALIZE",
  "officialVetName": "Dr. Jean Dupont",
  "bcpReceiptNo": "BCP-2026-8891",
  "status": "PASSED_WITH_CONDITIONS",
  "conditions": "Re-inspection required at destination within 48h",
  "microchipChecklist": [ { "horseId": 71, "microchipNumber": "826000000000001", "isMatched": true } ]
}
```

**`FINALIZE` thành công:** `isFinalized = true`, ghi `finalizedAt`, `verified_by_employee_id` và `verifiedAt`. `status = FAILED` → kích hoạt Flow 5 nhưng không thay đổi CDos.

**`REJECT_PROOF`:** đặt `QuarantineProof.status = REJECTED`, lưu `rejectionReason`, **`isFinalized` vẫn `false`** (proof không hợp lệ, không phải kết luận kiểm dịch); gửi Notification cho Escort/Driver nộp proof mới qua Q1. `REJECT_PROOF` không kích hoạt Flow 5.

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "Quarantine proof finalized successfully", "value": { "quarantineProofId": 7001, "status": "PASSED_WITH_CONDITIONS", "isFinalized": true } }
```

| HTTP | errorCode                 | Message                                                                  |
| ---- | --------------------------- | ------------------------------------------------------------------------------ |
| 400  | `MICROCHIP_CHECK_INCOMPLETE` | All horses in this dossier must be checked before finalizing (AC-003)         |
| 409  | `RECORD_LOCKED`            | This record has already been finalized and is read-only (AC-002)               |
| 400  | `FIELD_REQUIRED_FOR_ACTION` | `officialVetName`/`status`/`microchipChecklist` (FINALIZE) hoặc `rejectionReason` (REJECT_PROOF) bị thiếu |

> D7 (Mục 7) trả projection `quarantineStatus: { latestProofId, status, verifiedAt } | null`. Đây chỉ là dữ liệu tổng hợp từ `QuarantineProof`, không phải trạng thái của CDos.

---

## 13. Thông quan Hải quan (UC-29a, UC-29b)

> ERD V7 lưu toàn bộ bằng chứng và kết quả hải quan trong `CustomsClearanceProof`. Kết quả `CLEARED`, `HELD` hoặc `REJECTED` không ghi đè `ComplianceDossier.status`.

| #      | API                                                          | Method & Endpoint                                                     | Auth | Role |
| ------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ---- | ---- |
| **X1** | [Nộp nhanh proof Hải quan](#x1-nộp-nhanh-proof-hải-quan)        | `POST /compliance-dossiers/{dossierId}/customs-clearance-proofs`     | 🔒   | DRV  |
| **X2** | [Chi tiết proof chờ duyệt](#x2-chi-tiết-proof-chờ-duyệt)       | `GET /customs-clearance-proofs/{proofId}`                             | 🔒   | TS, LM |
| **X3** | [Chốt/Từ chối kết quả](#x3-chốttừ-chối-kết-quả)                | `PATCH /customs-clearance-proofs/{proofId}/finalize`                  | 🔒   | TS   |

### X1. Nộp nhanh proof Hải quan

Yêu cầu kết quả kiểm dịch mới nhất (Mục 12) = `PASSED`/`PASSED_WITH_CONDITIONS` (R14).

`POST /api/v1/compliance-dossiers/{dossierId}/customs-clearance-proofs` · `multipart/form-data`

| Field              | Type   | Bắt buộc | Mô tả                                                            |
| -------------------- | ------ | -------- | ---------------------------------------------------------------- |
| `customsPortName`  | string | Yes      | Tên cửa khẩu                                                     |
| `locationId`       | number | No       | Địa điểm cửa khẩu nếu đã có trong danh mục `Location`            |
| `mrnNumber`        | string | No       | Mã MRN nếu Driver đã nhận được                                   |
| `customsLane`      | string | No       | `GREEN_LANE` \| `ORANGE_LANE` \| `RED_LANE`                    |
| `isHeld`           | boolean | No      | `true` nếu Hải quan đang giữ để kiểm tra; mặc định `false`       |
| `quickNote`        | string | Conditional | Bắt buộc khi `isHeld = true`; lưu vào `submitted_note` |
| `files`            | file[] | Yes      | Một hoặc nhiều ảnh, ≤ 5MB/file; mỗi file lưu 1 record `ProofAttachment` (`customs_clearance_proof_id` = proof này) |

**`201 Created`** → `value: { customsClearanceProofId }`, message: `"Customs proof submitted successfully. Awaiting TS Verification."` Server đặt status `PENDING_VERIFICATION`, hoặc `HELD` nếu `isHeld = true`; CDos không đổi.

| HTTP | errorCode              | Message                                       |
| ---- | ------------------------ | --------------------------------------------------- |
| 409  | `QUARANTINE_NOT_PASSED` | Customs proof can only be submitted after quarantine has passed |
| 403  | `NOT_ASSIGNED_TO_TRIP` | You are not assigned to this transport (R13) |
| 409  | `DOSSIER_NOT_APPROVED` | Customs proof can only be submitted when the ComplianceDossier is APPROVED |
| 400  | `QUICK_NOTE_REQUIRED` | `quickNote` is required when `isHeld = true` |
| 413  | `FILE_TOO_LARGE` / 400 `INVALID_FILE_TYPE` | Ảnh > 5MB hoặc sai định dạng |

### X2. Chi tiết proof chờ duyệt

`GET /api/v1/customs-clearance-proofs/{proofId}` — trả đầy đủ field, kèm projection `ataCarnet: { complianceDocumentId, expiryDate, status } | null` lấy từ `ComplianceDocument` của DR thuộc CR ATA Carnet (R24) để TS đối chiếu; `null` nếu chuyến không yêu cầu ATA.

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "CustomsClearanceProof retrieved successfully",
  "value": {
    "customsClearanceProofId": 7101,
    "complianceDossierId": 501,
    "status": "PENDING_VERIFICATION",
    "customsPortName": "Calais Customs",
    "locationId": 56,
    "mrnNumber": null,
    "customsLane": null,
    "submittedNote": null,
    "ataCarnetExpiryDate": null,
    "ataCarnet": { "complianceDocumentId": 1300, "expiryDate": "2026-12-31", "status": "APPROVED" },
    "clearanceAt": null,
    "submittedBy": { "employeeId": 21, "fullName": "Lê Văn Driver" },
    "submittedAt": "2026-10-02T10:00:00Z",
    "verifiedBy": null,
    "verifiedAt": null,
    "verificationNote": null,
    "rejectionReason": null,
    "isFinalized": false,
    "finalizedAt": null,
    "files": [ { "fileName": "customs-1.jpg", "fileUrl": "https://.../customs-1.jpg", "mimeType": "image/jpeg", "fileSizeBytes": 498000, "sortOrder": 1 } ]
  }
}
```

### X3. Chốt/Từ chối kết quả

`PATCH /api/v1/customs-clearance-proofs/{proofId}/finalize`

| Field              | Type   | Bắt buộc | Mô tả                                                       |
| -------------------- | ------ | -------- | ---------------------------------------------------------------- |
| `action`           | string | Yes      | `FINALIZE` \| `REJECT_PROOF`                                    |
| `mrnNumber`        | string | Yes nếu `FINALIZE` |                                                        |
| `customsLane`      | string | Yes nếu `FINALIZE` | `GREEN_LANE` \| `ORANGE_LANE` \| `RED_LANE`            |
| `ataCarnetExpiryDate` | date | No    | Lưu `CustomsClearanceProof.ata_carnet_expiry_date`; ngày hết hạn ATA Carnet để đối chiếu ở SCR-F2-022/UC-29b |
| `status`           | string | Yes nếu `FINALIZE` | `CLEARED` \| `HELD` \| `REJECTED`                     |
| `verificationNote` | string | No       | Ghi chú thẩm định; dùng để mô tả lý do giữ xe nếu `HELD`          |
| `rejectionReason`  | string | Yes nếu `status = REJECTED` hoặc `action = REJECT_PROOF` |                                    |

```json
{
  "action": "FINALIZE",
  "mrnNumber": "24GB1234567890ABC1",
  "customsLane": "GREEN_LANE",
  "ataCarnetExpiryDate": "2026-12-31",
  "status": "CLEARED",
  "verificationNote": "Cleared without inspection"
}
```

`FINALIZE` → `isFinalized = true`, ghi `finalizedAt`, `verified_by_employee_id` và `verifiedAt`. `status = REJECTED` (hải quan từ chối chuyến) → kích hoạt Flow 5 nhưng không thay đổi CDos. `status = HELD` → thông báo Fleet Coordinator (Flow 3, ngoài phạm vi).

`REJECT_PROOF` (proof không hợp lệ): đặt `CustomsClearanceProof.status = REJECTED`, lưu `rejectionReason`, **`isFinalized` vẫn `false`**, Driver nộp proof mới qua X1 và **không** kích hoạt Flow 5. Vì DB dùng chung giá trị `REJECTED` cho hai ý nghĩa, Flow 5 chỉ kích hoạt khi `REJECTED` **và** `isFinalized = true`.

**`200 OK`**

```json
{ "isSuccess": true, "code": 200, "message": "Customs proof finalized successfully", "value": { "customsClearanceProofId": 7101, "status": "CLEARED", "isFinalized": true } }
```

| HTTP | errorCode      | Message                                             |
| ---- | ---------------- | --------------------------------------------------------- |
| 409  | `RECORD_LOCKED` | This record has already been finalized and is read-only |
| 400  | `FIELD_REQUIRED_FOR_ACTION` | `mrnNumber`/`customsLane`/`status` (FINALIZE) hoặc `rejectionReason` bị thiếu |

---

## 14. Dashboard theo dõi tiến độ (UC-30)

| #      | API                                        | Method & Endpoint                     | Auth | Role |
| ------- | --------------------------------------------- | ---------------------------------------- | ---- | ---- |
| **K1** | [Dashboard CDos](#k1-dashboard-cdos)         | `GET /compliance-dossiers/dashboard`   | 🔒   | TS, LM |
| **K2** | [Export báo cáo](#k2-export-báo-cáo)        | `GET /compliance-dossiers/dashboard/export` | 🔒   | TS, LM |

### K1. Dashboard CDos

`GET /api/v1/compliance-dossiers/dashboard?pageIndex=1&pageSize=20&status=IN_PREPARATION&risk=URGENT_RISK&routeType=CROSS_BORDER&sortBy=requestedDepartureDate:asc`

| Query        | Type   | Bắt buộc | Mô tả                                                              |
| -------------- | ------ | -------- | ---------------------------------------------------------------------- |
| `status`     | string | No       | `ComplianceDossierStatus`                                            |
| `risk`       | string | No       | `URGENT_RISK` (khởi hành ≤ 7 ngày và `progressPercent < 100`) \| `NORMAL` |
| `routeType`  | string | No       | `DOMESTIC` \| `CROSS_BORDER` (so sánh `originCountry`/`destinationCountry` của Booking) |
| `sortBy`     | string | No       | `requestedDepartureDate:asc` (mặc định), `requestedDepartureDate:desc`, `progressPercent:asc|desc`, `status:asc|desc` |
| `search`     | string | No       | Tìm theo `bookingCode`/`dossierCode`/`customerName`                  |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Dashboard retrieved successfully",
  "value": {
    "kpi": {
      "totalActive": 42,
      "readyForDeparture": 10,
      "actionRequired": 6,
      "submittedToAuthorities": 15,
      "urgentRisk": 3
    },
    "items": [
      {
        "complianceDossierId": 501,
        "bookingCode": "REQ-20260925-1002",
        "customerName": "Nguyễn Minh Khang",
        "originCountry": "GB",
        "destinationCountry": "FR",
        "requestedDepartureDate": "2026-10-02",
        "progressPercent": 62.5,
        "status": "IN_PREPARATION",
        "isUrgentRisk": true
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

Không có kết quả khớp filter: `value.items = []` (EXC-01, FE tự hiện thông báo + nút Reset Filters, không cần errorCode riêng).

### K2. Export báo cáo

`GET /api/v1/compliance-dossiers/dashboard/export?format=xlsx&...` (giữ nguyên toàn bộ query filter của K1)

| Query    | Type   | Bắt buộc | Mô tả              |
| ---------- | ------ | -------- | ---------------------- |
| `format` | string | Yes      | `xlsx` \| `pdf`      |

**`200 OK`** — response là file binary (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` hoặc `application/pdf`), không theo envelope JSON chuẩn.

| HTTP | errorCode | Message |
| ---- | --------- | ------- |
| 400  | `INVALID_EXPORT_FORMAT` | format must be xlsx or pdf |

---

## 15. Lịch sử kiểm toán (UC-31)

| #      | API                              | Method & Endpoint                                       | Auth | Role |
| ------- | ----------------------------------- | ------------------------------------------------------------ | ---- | ---- |
| **K3** | [Audit Timeline](#k3-audit-timeline) | `GET /compliance-dossiers/{dossierId}/audit-history`         | 🔒   | TS, LM |

ERD V7 đã có bảng `AuditDossier` append-only. Mọi thao tác nghiệp vụ thuộc danh sách action bên dưới phải `INSERT` audit event trong cùng transaction; metadata-only là ngoại lệ theo R22. API không cung cấp thao tác sửa hoặc xóa audit event. Các action chính gồm:

- `DOSSIER_INITIALIZED`, `DOSSIER_STATUS_CHANGED`
- `DOSSIER_REQUIREMENT_ADDED`, `DOSSIER_REQUIREMENT_REMOVED`
- `DOCUMENT_VERSION_SUBMITTED` (metadata-only không tạo event theo R22)
- `DOCUMENT_REVIEW_APPROVED`, `DOCUMENT_REVIEW_REJECTED`, `DOCUMENT_REVIEW_REVISION_REQUIRED`, `DOCUMENT_REQUEST_CREATED`
- `DOSSIER_REQUIREMENT_UPDATED`, `DOSSIER_REQUIREMENT_WAIVED`, `DOSSIER_REQUIREMENT_REMINDED`
- `AUTHORITY_SUBMITTED`, `AUTHORITY_DECISION_UPDATED`
- `QUARANTINE_PROOF_SUBMITTED`, `QUARANTINE_RESULT_FINALIZED`
- `CUSTOMS_PROOF_SUBMITTED`, `CUSTOMS_RESULT_FINALIZED`

`targetEntity`/`targetEntityId` ánh xạ tới `AuditDossier.target_entity`/`target_id`; `actor.accountId` lấy từ `actor_account_id`; `note` lấy từ `summary`; dữ liệu before/after hoặc metadata chi tiết nằm trong `details`.

`GET /api/v1/compliance-dossiers/{dossierId}/audit-history?actionType=DOCUMENT_REVIEW_REJECTED&search=Nguyen&pageIndex=1&pageSize=20`

| Query | Type | Bắt buộc | Mô tả |
| ----- | ---- | -------- | ----- |
| `actionType` | string | No | Một trong các action ở trên |
| `search` | string | No | Tìm theo tên người thao tác hoặc nội dung `note` |
| `from`, `to` | timestamp | No | Lọc theo `occurredAt` |
| `pageIndex`, `pageSize`, `sortBy` | number, number, string | No | `occurredAt:desc` mặc định |

**`200 OK`**

```json
{
  "isSuccess": true,
  "code": 200,
  "message": "Audit history retrieved successfully",
  "value": {
    "items": [
      {
        "actionType": "DOCUMENT_REVIEW_REJECTED",
        "targetEntity": "DocumentVersion",
        "targetEntityId": 3300,
        "actor": { "accountId": 402, "fullName": "Nguyễn Tiến Hoàng", "role": "TRANSPORT_SPECIALIST" },
        "note": "Stamp is unclear on page 2",
        "occurredAt": "2026-09-26T04:10:00Z"
      }
    ],
    "pageIndex": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

> **Contract mới hơn UC-31 AC-003:** Customer tạm thời không được gọi endpoint audit (`403 FORBIDDEN`), kể cả event có `visibility = PUBLIC`. `visibility` vẫn được giữ trong DB để có thể mở quyền sau này mà không đổi mô hình dữ liệu.
>
> **Không có** IP/device trong `AuditDossier` — bỏ khỏi response cho tới khi có nguồn dữ liệu thật (ví dụ log tầng API Gateway/WAF).
>
> **ALT-01 (Version History)** đã có sẵn ở [U2](#u2-chi-tiết-cdoc--lịch-sử-version) — không cần API riêng.

---

## 16. Phụ lục — Đề xuất bổ sung ERD (so với V7)

`dbdiagram/racehorse_transport_physical_erd_final_v7.dbml` đã có: `DossierRequirement.is_deleted/deleted_at/deleted_by_account_id` (G8), `DocumentReview.reviewed_by_account_id` (G9), `DocumentRequest.requested_by_account_id` (G10), `AuthoritySubmission.submitted_by_account_id/is_required/permit_*/revision_due_date` (G12/G25), `submitted_note` và `ata_carnet_expiry_date` của proof (G26), `ComplianceDocument.created_by/updated_by_account_id`, `DocumentVersion.uploaded_by_account_id`, `CatalogAuditLog` (G30), `ComplianceRequirement.bcp_code/legal_basis` (G1), `DossierTemplateItem.applies_per_horse` (G27). Các phần này **không** lặp lại ở đây.

Các thay đổi còn cần DB xử lý để khớp contract (DBML):

```dbml
// ── G32: unique DossierRequirement ───────────────────────────────────
// Thay unique (compliance_dossier_id, compliance_requirement_id, horse_id) bằng
// partial unique index chỉ tính DR chưa xóa và coi horse_id NULL là một giá trị:
//   CREATE UNIQUE INDEX ... ON DossierRequirement
//     (compliance_dossier_id, compliance_requirement_id, COALESCE(horse_id, 0))
//     WHERE is_deleted = false;

// G33: không cần thay đổi DB — quy tắc "mã không được thuộc CDos khác" do BE kiểm tra (index thường hiện tại là đủ).
```

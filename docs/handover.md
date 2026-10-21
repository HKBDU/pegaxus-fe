# BÁO CÁO BÀN GIAO & RÀ SOÁT HỆ THỐNG (HANDOVER REPORT)
## QUY TRÌNH CHUẨN BỊ GIẤY TỜ PHÁP LÝ CHO CHUYẾN PRIMARY, RETURN VÀ BACKUP

> **Dự án**: Cross-Border Racehorse Transport System (`pegaxus-fe`)  
> **Phạm vi rà soát**: Quy trình chuẩn bị hồ sơ pháp lý, kiểm dịch và thông quan (`ComplianceDossier`, `DocumentTemplate`, `AuthoritySubmission`, `BCP/Customs Proofs`) gắn liền với 3 loại kế hoạch lộ trình: **PRIMARY (Tuyến chính)**, **RETURN (Quay đầu khẩn cấp)** và **BACKUP (Dự phòng / Contingency)**.  
> **Tài liệu đối chiếu**: Use Cases Flow 2 (`UC-16` đến `UC-31`), Flow 3 (`UC-33`, `UC-37`, `UC-47`, `UC-48`), Flow 5 (`UC-58`), Business Rules (`BR-039`, `BR-040`, `BR-041`, `BR-048`, `BR-052`, `BR-066`), API Contracts (`flow2.md`, `flow3.md`, `flow4.md`, `flow5.md`, `validation-limits.json`).

---

## MỤC LỤC
1. [Tổng Quan Nghiệp Vụ Giấy Tờ & Lộ Trình (Primary, Return, Backup)](#1-tổng-quan-nghiệp-vụ-giấy-tờ--lộ-trình)
2. [PHẦN 1: BUG LỖI CHƯƠNG TRÌNH (Code / Runtime / Logic / Crash Bugs)](#phần-1-bug-lỗi-chương-trình)
3. [PHẦN 2: SAI VỚI USE CASE, API CONTRACT HOẶC STATE MACHINE](#phần-2-sai-với-use-case-api-contract-hoặc-state-machine)
4. [PHẦN 3: TRẢI NGHIỆM UX CỰC KÌ KHÓ CHỊU (UX Friction & Broken Loops)](#phần-3-trải-nghiệm-ux-cực-kì-khó-chịu)
5. [Bảng Ma Trận Tổng Hợp & Đề Xuất Thứ Tự Khắc Phục](#5-bảng-ma-trận-tổng-hợp--đề-xuất-thứ-tự-khắc-phục)

---

## 1. TỔNG QUAN NGHIỆP VỤ GIẤY TỜ & LỘ TRÌNH

Quy trình chuẩn bị giấy tờ cho 3 loại chuyến đi có các đặc thù nghiệp vụ cốt lõi sau:

```
[Booking APPROVED]
       │
       ▼
[Transport CREATED] ──► [TransportPlan APPROVED] (Deposit Paid)
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       Phân công Đợt 1 (TS)            Phân công Đợt 1 (RC)
               │                               │
               ▼                               ▼
     Apply DossierTemplate             Tạo RoutePlan PRIMARY (DRAFT)
       (Tạo CDos MAIN: DRAFT)                  │
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
               [RP7] TS Thẩm định Khả thi Pháp lý
                               │
        ┌──────────────────────┴──────────────────────┐
        ▼ (isFeasible = true)                         ▼ (isFeasible = false)
• RoutePlan PRIMARY -> CONFIRMED              • RoutePlan giữ DRAFT
• CDos MAIN: DRAFT -> IN_PREPARATION          • CDos giữ DRAFT
• Mọi BACKUP DRAFT -> CONFIRMED (chung hồ sơ) • RC sửa lộ trình & gửi lại
• Customer nhận thông báo upload giấy tờ
• Mở phân công Đợt 2 (Driver + Escort)
```

1. **PRIMARY (Chuyến chính)**:
   - TS chọn mẫu hồ sơ `DossierTemplate` và áp dụng cho chuyến (UC-18, API D2). Hồ sơ khởi tạo ở trạng thái `DRAFT` loại `MAIN` (theo cập nhật D7 20/10).
   - RC lập lộ trình chính `PRIMARY` ở trạng thái `DRAFT`.
   - TS thẩm định khả thi pháp lý qua API RP7 (`POST /api/v1/route-plans/{id}/legal-review`): Nếu `isFeasible = true`, trong cùng transaction: `RoutePlan` thành `CONFIRMED`, `ComplianceDossier` (MAIN) chuyển `IN_PREPARATION`, mở cổng cho Customer upload giấy tờ, mở phân công Đợt 2.
   - Customer tải lên giấy tờ (UC-21, UC-22). TS thẩm định (UC-23, UC-24, UC-25).
   - Khi đủ giấy tờ bắt buộc, TS chuyển hồ sơ sang `READY_FOR_SUBMISSION`, nộp hồ sơ tới cơ quan chức năng (`SUBMITTED`), và ghi nhận kết quả phê duyệt (`APPROVED`). Chuyến xe chỉ được xuất phát khi hồ sơ `MAIN` đạt `APPROVED`.

2. **BACKUP (Chuyến dự phòng / Contingency)**:
   - RC lập lộ trình `BACKUP` (UC-37, API RP1). Tuyến BACKUP là lộ trình hỗn hợp đầy đủ cùng điểm đầu và điểm cuối với tuyến chính (R16).
   - **Quy tắc bất biến**: Tuyến BACKUP **dùng chung bộ hồ sơ `MAIN`** với PRIMARY. Tuyệt đối **không tạo bộ hồ sơ riêng cho BACKUP** (ràng buộc DB V9: mỗi Transport chỉ có tối đa 1 MAIN và 1 EXTRA: `(transport_id, dossier_type) [unique]`).
   - Tạo BACKUP không được làm thay đổi trạng thái của `ComplianceDossier`.
   - Khi TS thẩm định RP7 trên PRIMARY với `isFeasible = true`, toàn bộ BACKUP đang ở `DRAFT` tự động chuyển sang `CONFIRMED` (`confirmedBackupRoutePlanIds`).

3. **RETURN (Chuyến quay đầu khẩn cấp)**:
   - Chỉ phát sinh khi xe đang chạy (`Transport.status = IN_TRANSIT`), hồ sơ `MAIN` đã `APPROVED`, và gặp sự cố nghiêm trọng không dùng được BACKUP (BR-048, BR-066, UC-48, UC-58).
   - RC đề xuất hoặc LM trực tiếp kích hoạt RETURN.
   - **Quy tắc cốt lõi (BR-048)**: Tuyệt đối **không rollback hồ sơ `MAIN` về `DRAFT`** (giữ `APPROVED` để chứng minh xuất xứ hợp pháp). Khi LM duyệt RETURN (API `EC2`), hệ thống **tự động sinh thêm một bộ hồ sơ bổ sung loại `EXTRA`** (`ComplianceDossier.dossier_type = EXTRA`) ở trạng thái `DRAFT`.
   - TS thẩm định tuyến RETURN qua RP7 $\rightarrow$ hồ sơ `EXTRA` chuyển `IN_PREPARATION` $\rightarrow$ Customer nộp giấy tờ bổ sung $\rightarrow$ TS duyệt hồ sơ `EXTRA` đạt `APPROVED`.
   - LM kích hoạt RETURN (API `EC3`) **chỉ khi cả 2 bộ hồ sơ `MAIN` và `EXTRA` đều đã `APPROVED`**.

---

## PHẦN 1: BUG LỖI CHƯƠNG TRÌNH
*(Runtime Exceptions, Crash, Logic Bugs, Broken Routes, Null Pointers)*

### 🔴 BUG-01: Gãy toàn bộ chuỗi chặng khi tạo Tuyến dự phòng (BACKUP Route Broken Continuity)
- **Vị trí file**: [`src/features/route-plan/components/RoutePlanBuilder.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/components/RoutePlanBuilder.tsx#L921-L945)
- **Đoạn code lỗi**:
  ```tsx
  const payloadRoutes = isBackup
    ? [
        ...readonlyPrimaryRoutes.map((route) => ({
          route,
          routeType: "PRIMARY" as const,
          plannedDepartureAt: plan.departureAt,
          plannedArrivalAt: plan.arrivalAt,
          vehicleIds: undefined,
          outsourcing: undefined,
        })),
        ...segments.map((segment) => ({
          route: segment.route,
          routeType: "BACKUP" as const,
          plannedDepartureAt: segment.plannedDepartureAt || plan.departureAt,
          plannedArrivalAt: segment.plannedArrivalAt || plan.arrivalAt,
          vehicleIds: segment.vehicleIds,
          outsourcing: ...
        })),
      ]
  ```
- **Mô tả lỗi**:
  - Khi tạo lộ trình `BACKUP`, hàm `toPayload()` nối thô bạo: **toàn bộ chặng PRIMARY** rồi ghép tiếp **toàn bộ chặng BACKUP** vào sau!
  - Ví dụ: Tuyến chính là `A -> B -> C -> D`. Đoạn dự phòng rẽ từ `B` qua `X` đến `D` (`B -> X -> D`).
  - Mảng chặng gửi lên backend bị biến thành: `A -> B -> C -> D -> B -> X -> D`. Điểm cuối của chặng 3 là `D`, nhưng điểm đầu của chặng 4 lại là `B`!
  - Trong khi đó, file [`route-continuity.ts`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/route-continuity.ts#L54-L114) đã cài đặt thuật toán chuẩn `buildEffectiveBackupRoute` trả về `[...prefix, ...backup, ...suffix]`, nhưng `RoutePlanBuilder.tsx` hoàn toàn **vứt bỏ kết quả này** khi đóng gói payload lưu trữ!
- **Hậu quả**: Khi người dùng nhấn Save hoặc Submit, backend luôn từ chối với lỗi `400 VALIDATION_ERROR` (vi phạm tính liên tục R5: `fromLocationId[i+1] != toLocationId[i]`) hoặc `422 BACKUP_NOT_ANCHORED`! Không thể tạo thành công bất kỳ lộ trình BACKUP nào qua giao diện.

---

### 🔴 BUG-02: Chỉnh sửa Tuyến quay đầu (RETURN) bị biến đổi thành Tuyến chính (PRIMARY)
- **Vị trí file**: [`src/features/route-plan/pages/EditRoutePlanPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/pages/EditRoutePlanPage.tsx#L59) và [`EditRoutePlanPage.tsx:L177`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/pages/EditRoutePlanPage.tsx#L177)
- **Đoạn code lỗi**:
  ```tsx
  // Dòng 59:
  routeType: plan.routeType === "RETURN" ? "PRIMARY" : plan.routeType,
  // Dòng 177:
  routeType={plan.routeType === "RETURN" ? "PRIMARY" : plan.routeType}
  ```
- **Mô tả lỗi**:
  - Khi người điều phối (RC) hoặc quản lý (LM) mở màn hình chỉnh sửa một lộ trình `RETURN` đang soạn thảo (`DRAFT`), component ép kiểu `routeType` thành `"PRIMARY"`.
  - Khi người dùng bấm lưu, payload gửi lên backend qua API `RP4` sẽ mang `routeType: "PRIMARY"` thay vì `"RETURN"`.
- **Hậu quả**:
  - Gây xung đột nghiêm trọng với lộ trình chính hiện tại của chuyến vận chuyển (`409 PRIMARY_ALREADY_EXISTS`).
  - Làm mất dấu vết phương án quay đầu khẩn cấp của chuyến xe đang gặp sự cố, chặn đứng quy trình sinh và thẩm định hồ sơ `EXTRA`.

---

### 🔴 BUG-03: Điều hướng 404 sau khi Khởi tạo Hồ sơ Mẫu (Apply Template 404 Route Crash)
- **Vị trí file**: [`src/features/compliance-catalog/pages/ApplyTemplatePage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/compliance-catalog/pages/ApplyTemplatePage.tsx#L28) và [`ApplyTemplatePage.tsx:L105`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/compliance-catalog/pages/ApplyTemplatePage.tsx#L105)
- **Đoạn code lỗi**:
  ```tsx
  const AFTER_CREATE_PATH = (dossierId: EntityId) => `/compliance-dossiers/${dossierId}/details`
  ...
  navigate(`/compliance-dossiers/${existingQuery.data.complianceDossierId}/details`, { replace: true })
  ...
  navigate(AFTER_CREATE_PATH(guarded.value.complianceDossierId))
  ```
- **Mô tả lỗi**:
  - Sau khi TS hoàn tất 3 bước của wizard tạo hồ sơ từ mẫu (UC-18), mã nguồn tự động điều hướng người dùng tới đường dẫn `/compliance-dossiers/:dossierId/details`.
  - Nhưng trong [`src/app/router.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/app/router.tsx#L588-L606), route cho trang chi tiết dossier chỉ được đăng ký là:
    ```tsx
    path: "/compliance-dossiers/:dossierId",
    children: [{ index: true, element: <DossierDetailsPage /> }]
    ```
    Không hề có route con `/details` khớp với pattern này khi dùng trực tiếp (hoặc route bị che khuất bởi matching rule của React Router v6).
- **Hậu quả**: Người dùng vừa bấm "Confirm and Create ComplianceDossier", màn hình lập tức nhảy sang trang trắng lỗi 404 Not Found hoặc NotFoundPage, khiến người dùng tưởng rằng việc tạo hồ sơ bị lỗi và thao tác lại nhiều lần, gây ra duplicate dossier request.

---

### 🔴 BUG-04: Hardcode Null toàn bộ Metadata Booking trong Overview gây sập chức năng kiểm tra Hạn Giấy Tờ
- **Vị trí file**: [`src/features/dossier/lib/backend-contract.ts`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/lib/backend-contract.ts#L175-L200)
- **Đoạn code lỗi**:
  ```ts
  return dossierOverviewSchema.parse({
    ...
    openedAt: null,
    readyForSubmissionAt: null,
    approvedAt: null,
    rejectedAt: null,
    closedAt: null,
    bookingSummary: {
      bookingStatus: null,
      originCountry: null,
      destinationCountry: null,
      requestedDepartureDate: null,
      customerName: null,
      horseCount: value.horseRequirements.length,
      horses: value.horseRequirements.map(...),
    },
  });
  ```
- **Mô tả lỗi**:
  - Hàm mapper `mapBackendDossierOverview` hardcode toàn bộ các trường thời gian và dữ liệu chuyến đi thành `null`.
  - Tại [`DossierDetailsPage.tsx:L157`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/pages/DossierDetailsPage.tsx#L157):
    `plannedDepartureDate={query.data.bookingSummary.requestedDepartureDate ?? undefined}` luôn luôn trả về `undefined`.
- **Hậu quả nghiêm trọng**:
  - Quy tắc nghiệp vụ bắt buộc **R21 / BR-021** quy định: Hạn sử dụng của giấy tờ kiểm dịch/hộ chiếu (`expiryDate`) bắt buộc phải sau ngày khởi hành dự kiến (`plannedDepartureDate`). Do `plannedDepartureDate` luôn bị `undefined`, hàm validate Zod trong [`DocumentSubmissionDialog.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/components/DocumentSubmissionDialog.tsx) **không thể chạy kiểm tra**, cho phép Customer nộp giấy tờ đã hết hạn trước ngày xe chạy!
  - Toàn bộ các mốc thời gian thẩm định (Opened At, Approved At) trên thanh `DossierOverview` luôn rỗng.

---

### 🔴 BUG-05: Lỗi Crash trang Bằng chứng Hải quan do gọi `.toUpperCase()` trên giá trị Null
- **Vị trí file**: [`src/features/clearance/pages/CustomsClearanceProofPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/clearance/pages/CustomsClearanceProofPage.tsx#L40-L42)
- **Đoạn code lỗi**:
  ```ts
  function routeLabel(dossier?: ReturnType<typeof useClearanceDossierContext>['data']) {
    const summary = dossier?.bookingSummary
    if (!summary) return '—'
    const origin = summary.originPort || `${summary.originCountry.toUpperCase()} PORT`
    const destination = summary.destinationPort || `${summary.destinationCountry.toUpperCase()} TERMINAL`
    return `${origin} → ${destination}`
  }
  ```
- **Mô tả lỗi**:
  - Khi tài xế mở trang nộp chứng từ thông quan tại cửa khẩu (`CustomsClearanceProofPage`), nếu `summary.originCountry` hoặc `summary.destinationCountry` là `null` hoặc `undefined` (do API trả về hoặc mapper `backend-contract.ts` trả null), câu lệnh `summary.originCountry.toUpperCase()` lập tức ném ra ngoại lệ:
    `TypeError: Cannot read properties of null (reading 'toUpperCase')`
- **Hậu quả**: Toàn bộ trang giao diện di động của tài xế bị Uncaught Exception (màn hình trắng xóa). Tài xế không thể chụp ảnh tờ khai/Sổ ATA Carnet để gửi về trung tâm khi xe đang chờ ở cửa khẩu biên giới (UC-29a).

---

### 🔴 BUG-06: Form nộp Giấy tờ Customer bị khóa cứng nút Submit khi chọn File hợp lệ
- **Vị trí file**: [`src/features/dossier/components/DocumentSubmissionDialog.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/components/DocumentSubmissionDialog.tsx#L77-L90) và [`DocumentSubmissionDialog.tsx:L288-L296`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/components/DocumentSubmissionDialog.tsx#L288-L296)
- **Mô tả lỗi**:
  - Biến `canSubmit` phụ thuộc vào `files?.length`. Hàm `getCompletedUploadFiles` lấy file từ `snapshot.items`.
  - Trong logic xử lý `snapshot`, khi component `FileUploader` hoàn tất upload file lên Cloud Storage và trả về trạng thái `success`, state `frozenSelection` và `uploadScope` bị lệch session (`activeUploadScope.current !== uploadScope`), dẫn đến `getCompletedUploadFiles` trả về `null`.
  - Đồng thời, `form.formState.isValid` bị chặn bởi schema kiểm tra ngày hết hạn `expiryDate` do conflict giữa `serverRequiresExpiry` và `expiryPolicy`.
- **Hậu quả**: Nút "Submit Document" bị disabled vĩnh viễn dù khách hàng đã tải đầy đủ file ảnh/PDF và điền đầy đủ metadata. Khách hàng không thể nộp giấy tờ (UC-21).

---

## PHẦN 2: SAI VỚI USE CASE, API CONTRACT HOẶC STATE MACHINE
*(Mismatches with Business Rules, API Specs, Endpoints, Role Permissions)*

### ⚠️ SAI-01: Sai lệch toàn bộ Endpoint thẩm định & cập nhật Giấy tờ (Flow 2 Documents)
So chiếu trực tiếp giữa mã nguồn Frontend và tài liệu đặc tả chuẩn [`.docs/pegaxus-document/api-contract/flow2.md`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/pegaxus-document/api-contract/flow2.md):

| Chức năng | API Contract chuẩn (`flow2.md`) | Mã nguồn Frontend đang gọi ([`services.ts`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/services.ts)) | Đánh giá sai lệch |
|---|---|---|---|
| **V1/V2: Thẩm định đạt/từ chối giấy tờ** | `POST /api/v1/compliance-documents/{docId}/versions/{verId}/reviews` (phân biệt qua field `result`) | `POST /api/v1/compliance-dossiers/{dossierId}/requirements/{drId}/versions/{verId}/approve` và `/reject` (L293) | **SAI ĐƯỜNG DẪN & METHOD**. Contract gom về `compliance-documents`, FE lại gọi lồng qua `compliance-dossiers/.../approve`. |
| **V4: Chuyển hồ sơ sang READY_FOR_SUBMISSION** | `PATCH /api/v1/compliance-dossiers/{id}/ready-for-submission` | `POST /api/v1/compliance-dossiers/{id}/ready-for-submission` (L301) | **SAI HTTP METHOD**. Contract quy định `PATCH`, FE dùng `POST`. |
| **V5: Gửi nhắc nhở bổ sung giấy tờ** | `POST /api/v1/compliance-dossiers/{id}/requirements/reminders` | `POST /api/v1/compliance-dossiers/{id}/missing-document-reminders` (L276) | **SAI URI ENDPOINT**. Sai khác tên tài nguyên (`requirements/reminders` vs `missing-document-reminders`). |
| **U3: Nộp phiên bản giấy tờ mới (v2, v3)** | `POST /api/v1/compliance-documents/{docId}/versions` | `POST /api/v1/compliance-dossiers/{dossierId}/requirements/{drId}/document/versions` (L407) | **SAI ĐƯỜNG DẪN**. Contract chuẩn hóa theo thực thể `compliance-documents`. |
| **U4: Chỉnh sửa metadata giấy tờ tại chỗ** | `PATCH /api/v1/compliance-documents/{docId}` | `PATCH /api/v1/compliance-dossiers/{dossierId}/requirements/{drId}/document/metadata` (L428) | **SAI ĐƯỜNG DẪN**. Không khớp tài nguyên RESTful của backend. |
| **D2: Tạo hồ sơ chính từ mẫu** | `POST /api/v1/transports/{transportId}/compliance-dossier` | `POST /api/v1/bookings/{bookingId}/compliance-dossier` ([`dossier-services.ts:L142`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/compliance-catalog/dossier-services.ts#L142)) | **SAI TÀI NGUYÊN GẮN KẾT**. Contract quy định hồ sơ gắn với `Transport`, FE gọi theo `Booking`. |

---

### ⚠️ SAI-02: Sai lệch Trạng thái Khởi tạo Dossier (Dossier Status Lifecycle Mismatch)
- **Tài liệu quy định**: Quyết định cập nhật ngày 20/10 tại [`.docs/pegaxus-document/api-contract/flow5.md:L612-L640`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/pegaxus-document/api-contract/flow5.md#L612-L640) (Mục D7) và [`flow5-be-viec-can-sua-flow3-flow4.md:L96-L111`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/pegaxus-document/api-contract/flow5-be-viec-can-sua-flow3-flow4.md#L96-L111):
  - Khi TS áp dụng mẫu hồ sơ (`Apply Template`), hồ sơ `ComplianceDossier` (MAIN) bắt buộc phải tạo ở trạng thái **`DRAFT`** và **CHƯA** gửi thông báo cho Customer.
  - Chỉ khi TS thực hiện thẩm định khả thi pháp lý lộ trình RP7 (`isFeasible = true`), `ComplianceDossier` mới được chuyển từ `DRAFT` $\rightarrow$ **`IN_PREPARATION`**, đồng thời `RoutePlan` chuyển sang `CONFIRMED`.
- **Mã nguồn hiện tại**:
  - Tại [`src/features/compliance-catalog/dossier-services.ts:L134`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/compliance-catalog/dossier-services.ts#L134): Mock và contract mapper mặc định gán trạng thái hồ sơ ngay sau khi tạo là `IN_PREPARATION`.
  - Tại [`src/features/dossier/components/DocumentSubmissionDialog.tsx:L276`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/components/DocumentSubmissionDialog.tsx#L276): Form upload chỉ cho phép tải lên khi `["IN_PREPARATION", "REJECTED"].includes(dossier.status)`.
- **Hậu quả**: Trạng thái hồ sơ và trạng thái lộ trình bị lệch pha. Customer có thể thấy hồ sơ và tải lên giấy tờ khi lộ trình chính vẫn đang là `DRAFT` (chưa được TS thẩm định khả thi qua RP7).

---

### ⚠️ SAI-03: Ép buộc chọn chặng bị nghẽn (blockedSegments) khi Từ chối Pháp lý lộ trình (RP7)
- **Vị trí file**: [`src/features/route-plan/components/LegalFeasibilityPanel.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/components/LegalFeasibilityPanel.tsx#L123-L126)
- **Đoạn code sai**:
  ```tsx
  if (status === "NOT FEASIBLE" && !blockedSegments.length) {
    setError("Select at least one blocked segment.");
    return;
  }
  ```
- **Tài liệu quy định**:
  - Tại [`.docs/pegaxus-document/api-contract/flow5.md:L629`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/pegaxus-document/api-contract/flow5.md#L629) quy định rõ:
    *"RP7 chỉ nhận hoặc từ chối cả RoutePlan. `isFeasible` là một boolean cho toàn bộ lộ trình; `blockedSegments` (không bắt buộc) chỉ là danh sách sequenceNo để RC biết chặng nào có vấn đề, BE không duyệt từng chặng."*
- **Sai lệch**:
  - TS có thể từ chối lộ trình vì lý do pháp lý tổng thể (ví dụ: quốc gia đến cấm nhập khẩu ngựa đột xuất, lệnh trừng phạt kiểm dịch toàn khối, thiếu quota vận chuyển hàng không...) không thuộc về một chặng cụ thể nào.
  - Việc FE ép buộc TS phải tick chọn ít nhất 1 chặng bị nghẽn (`blockedSegments`) là **vi phạm use case UC-47/RP7**, ngăn cản TS đưa ra đánh giá pháp lý chính xác.

---

### ⚠️ SAI-04: Sai lệch Giới hạn Dung lượng Tệp Đính kèm Giấy tờ (5MB vs 10MB)
- **Vị trí file**: [`src/features/dossier/constants.ts`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/constants.ts#L10)
  ```ts
  export const UPLOAD_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
  ```
- **Tài liệu quy định**:
  - Quy tắc nghiệp vụ bắt buộc **`BR-039` (Dung lượng Tệp tin Đính kèm DocumentVersion)** tại [`.docs/pegaxus-document/business/business-rules.md:L243`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/pegaxus-document/business/business-rules.md#L243) quy định rõ:
    *"Dung lượng tối đa áp dụng cho mỗi tệp tin đính kèm là $\le 10\text{MB}$."*
- **Sai lệch**: Frontend giới hạn cứng 5MB khiến các tệp scan màu độ nét cao của Hộ chiếu ngựa đua (Horse Passport - chứa sơ đồ lông chi tiết Wetherbys/France Galop) có dung lượng từ 5MB đến 10MB bị chặn oan uổng ngay tại client.

---

### ⚠️ SAI-05: Khởi tạo Tuyến quay đầu (RETURN) thiếu dữ liệu Điểm bắt đầu Thực tế
- **Vị trí file**: [`src/features/route-plan/pages/CreateReturnRoutePage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/pages/CreateReturnRoutePage.tsx#L81-L90)
- **Tài liệu quy định**:
  - Quy tắc nghiệp vụ **`BR-066`** và Use Case **`UC-48` / `UC-58`**: Tuyến RETURN bắt đầu từ vị trí xảy ra sự cố / vị trí hiện tại của phương tiện trên đường (`Transport.current_location_id`) và kết thúc tại điểm xuất phát ban đầu.
- **Sai lệch**:
  - `CreateReturnRoutePage` không lấy tọa độ định vị GPS gần nhất hoặc chặng đang chạy (`Active Route Leg`) từ Flow 4 để tự động điền làm điểm bắt đầu.
  - Component để trống điểm đón, dẫn đến `RoutePlanBuilder` tự gán điểm đi = điểm đến ban đầu (thành một vòng tròn khép kín vô lý).

---

## PHẦN 3: TRẢI NGHIỆM UX CỰC KÌ KHÓ CHỊU
*(UX Friction, Confusing Feedback, Broken Navigation, Misleading States)*

### 😤 UX-01: "Mắc kẹt" tại chỗ sau khi Lưu lộ trình (No Navigation / Missing Feedback Loop)
- **Vị trí file**: [`src/features/route-plan/components/RoutePlanBuilder.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/components/RoutePlanBuilder.tsx#L1038-L1042)
- **Hiện tượng**:
  - Sau khi người dùng thiết lập xong lộ trình (Primary, Backup hoặc Return), bấm "Save Draft" hoặc "Submit for legal review", hệ thống gọi API xong chỉ cập nhật một dòng chữ nhỏ màu xanh bên dưới: `setSaveNotice("Draft saved successfully.")`.
  - Hệ thống **hoàn toàn không điều hướng** người dùng quay trở lại danh sách Lộ trình (`/admin/route-plans`) hay trang chi tiết Kế hoạch (`TransportPlan`).
  - Nút bấm không có trạng thái loading (`isSubmitting` / Spinner), người dùng không biết hệ thống đã lưu hay chưa nên thường nhấn liên tục nhiều lần gây spam request lên server.

---

### 😤 UX-02: Nút "Back to Booking" điều hướng sai lệch hoàn toàn ngữ cảnh
- **Vị trí file**: [`src/features/dossier/pages/DossierDetailsPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/pages/DossierDetailsPage.tsx#L79-L94)
- **Hiện tượng**:
  - Tiêu đề ghi nút bấm là: `← Back to Booking`.
  - Nhưng logic click:
    - Nếu là `TRANSPORT_SPECIALIST`: Bị đẩy về `/compliance-dossiers` (danh sách toàn bộ hồ sơ, không liên quan đến booking hiện tại).
    - Nếu là `LOGISTICS_MANAGER`: Bị đẩy về `/admin/transport-requests` (danh sách yêu cầu chờ duyệt, trong khi booking này đã duyệt từ lâu và đang lập kế hoạch!).
  - Người dùng bị mất dấu vết công việc đang làm dở trên chuyến xe, phải click lại từ đầu qua 3-4 màn hình.

---

### 😤 UX-03: Trải nghiệm thẩm định xong BCP / Hải quan bị bỏ rơi trên trang trắng
- **Vị trí file**: [`src/features/quarantine/pages/QuarantineReviewPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/quarantine/pages/QuarantineReviewPage.tsx#L79-L84) và [`CustomsClearanceReviewPage.tsx:L93-L98`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/clearance/pages/CustomsClearanceReviewPage.tsx#L93-L98)
- **Hiện tượng**:
  - Chuyên viên TS sau khi đối chiếu danh sách mã Microchip của từng con ngựa và bấm `Finalize Record`, hệ thống hiển thị thông báo toast thành công nhưng **giữ nguyên người dùng tại trang Review**.
  - Các ô nhập liệu bị disable do bản ghi đã chốt bất biến. Không có nút "Quay lại hồ sơ chuyến đi" (`Back to Dossier`). Nút Header duy nhất lại trỏ về `/compliance-dossiers` (mất luôn ID của hồ sơ đang thẩm định).

---

### 😤 UX-04: Bộ chuyển đổi Hồ sơ EXTRA khi xảy ra sự cố quay đầu bị chìm nghỉm
- **Vị trí file**: [`src/features/dossier/components/DossierOverview.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/dossier/components/DossierOverview.tsx#L94-L121)
- **Hiện tượng**:
  - Khi chuyến đi phát sinh quay đầu khẩn cấp, hệ thống sinh ra bộ hồ sơ thứ 2 là `EXTRA`.
  - Nút chuyển giữa 2 bộ hồ sơ `MAIN` và `EXTRA` chỉ là 2 nút text siêu nhỏ (kích thước `0.65rem`), nằm lọt thỏm bên cạnh chữ "Type" trong bảng thông tin chung.
  - Không có banner cảnh báo nổi bật: *"Chuyến xe này đã kích hoạt quay đầu khẩn cấp. Vui lòng thẩm định hồ sơ EXTRA chiều về trước khi xe đến cửa khẩu BCP"*. TS rất dễ bỏ sót và chỉ nhìn vào bộ hồ sơ MAIN đã duyệt từ trước, gây trễ giờ làm thủ tục tái nhập cảnh cho đàn ngựa.

---

### 😤 UX-05: Thao tác Xóa chặng trung gian gây "vỡ trận" lộ trình không có tính năng Tự nối điểm
- **Vị trí file**: [`src/features/route-plan/components/RoutePlanBuilder.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/components/RoutePlanBuilder.tsx#L1505)
- **Hiện tượng**:
  - Khi lập kế hoạch lộ trình đường dài có 5-7 chặng dừng nghỉ và BCP. Nếu người điều phối muốn xóa 1 trạm dừng ở giữa, component lập tức đánh dấu tất cả các chặng phía sau là `isDisconnected = true` (bị đứt chuỗi).
  - Giao diện không có tính năng "Connect to next location" hay tự động nối chặng trước với chặng sau, bắt buộc người dùng phải xóa hết toàn bộ các chặng phía sau và nhập lại từ đầu bằng tay.

---

### 😤 UX-06: Thông báo lỗi kiểm tra lý do Backup/Return hiển thị sai ngữ cảnh
- **Vị trí file**: [`src/features/route-plan/components/RoutePlanBuilder.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/route-plan/components/RoutePlanBuilder.tsx#L1008-L1010)
- **Hiện tượng**:
  - Dù đang ở màn hình **Tạo lộ trình Quay đầu khẩn cấp** (`Create Return Route`), nếu người dùng nhập lý do dưới 10 ký tự, thông báo lỗi hiện lên lại là: `"Backup reason must be at least 10 characters."`.
  - Từ ngữ không nhất quán gây hoang mang cho người điều phối, tạo cảm giác hệ thống đang xử lý nhầm loại lộ trình.

---

## 5. BẢNG MA TRẬN TỔNG HỢP & ĐỀ XUẤT THỨ TỰ KHẮC PHỤC

| Mã ID | Phân loại | Mức độ nghiêm trọng | Đối tượng bị ảnh hưởng | Tác động nghiệp vụ |
|---|---|:---:|---|---|
| **BUG-01** | Bug chương trình | 🔴 **CRITICAL** | Route Coordinator, Manager | **Chặn hoàn toàn** tính năng tạo Lộ trình Dự phòng (BACKUP) do chuỗi chặng bị gãy. |
| **BUG-02** | Bug chương trình | 🔴 **CRITICAL** | Route Coordinator, Manager | **Sai lệch nghiệp vụ**: Chỉnh sửa lộ trình RETURN bị biến thành PRIMARY, gây xung đột trạng thái lộ trình. |
| **BUG-03** | Bug chương trình | 🔴 **CRITICAL** | Transport Specialist | Gây lỗi **404 Not Found** ngay sau khi tạo hồ sơ từ mẫu (Apply Template). |
| **BUG-04** | Bug chương trình | 🔴 **HIGH** | Customer, Transport Specialist | Vô hiệu hóa tính năng kiểm tra hạn giấy tờ y tế/kiểm dịch so với ngày khởi hành. |
| **BUG-05** | Bug chương trình | 🔴 **HIGH** | Driver, Escort | Gây crash ứng dụng di động khi nộp chứng từ thông quan tại cửa khẩu. |
| **BUG-06** | Bug chương trình | 🔴 **HIGH** | Customer | Khóa nút Submit nộp giấy tờ pháp lý của khách hàng. |
| **SAI-01** | Sai API Contract | ⚠️ **HIGH** | Hệ thống, TS, Customer | Sai lệch 6 endpoints trọng yếu của Flow 2 giữa FE và BE Contract. |
| **SAI-02** | Sai State Machine | ⚠️ **MEDIUM** | TS, Customer | Dossier tạo ra đã ở `IN_PREPARATION` thay vì `DRAFT` (lệch quy tắc chốt 20/10 với RP7). |
| **SAI-03** | Sai Use Case | ⚠️ **MEDIUM** | Transport Specialist | Ép buộc chọn chặng bị chặn khi từ chối pháp lý lộ trình RP7. |
| **SAI-04** | Sai Business Rule | ⚠️ **LOW** | Customer | Giới hạn dung lượng tệp 5MB thay vì 10MB theo `BR-039`. |
| **SAI-05** | Sai Use Case | ⚠️ **MEDIUM** | Route Coordinator | Tạo RETURN route thiếu điểm đón thực tế của xe hiện trường. |
| **UX-01** | Trải nghiệm UX | 😤 **HIGH** | Route Coordinator | Lưu lộ trình không có điều hướng hoặc trạng thái phản hồi rõ ràng. |
| **UX-02** | Trải nghiệm UX | 😤 **MEDIUM** | Transport Specialist, Manager | Nút Back to Booking đưa người dùng về sai trang nghiệp vụ. |
| **UX-03** | Trải nghiệm UX | 😤 **MEDIUM** | Transport Specialist | Hoàn tất thẩm định BCP/Hải quan bị kẹt tại chỗ, không có đường về dossier. |
| **UX-04** | Trải nghiệm UX | 😤 **HIGH** | Transport Specialist | Bộ chuyển hồ sơ MAIN / EXTRA quá nhỏ, thiếu cảnh báo khẩn cấp khi xe quay đầu. |
| **UX-05** | Trải nghiệm UX | 😤 **MEDIUM** | Route Coordinator | Xóa chặng giữa làm hỏng toàn bộ chuỗi chặng, không có auto-heal. |
| **UX-06** | Trải nghiệm UX | 😤 **LOW** | Route Coordinator | Lỗi validation hiển thị nhầm "Backup reason" trên màn hình Return. |

---
*Báo cáo được trích xuất và lưu trữ tại `docs/handover.md` theo đúng quy định bàn giao dự án.*

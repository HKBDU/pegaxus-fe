# UC-32 / UC-34 / UC-35 — Transport Plan

## Phạm vi và audit

Refactor theo `pegaxus-document/api-contract/flow3.md` mới. Chỉ sửa `src/features/transport-plan/**`; router, route-config, sidebar, Flow 1, personnel và route-plan không được sửa.

Code trước refactor dùng endpoint `/approved-bookings`, schema chung sai giữa AB1/AB2, ID số, deposit/routePlanningStatus, providers/modes/quotation ở cấp plan, và tự fetch quotation/assignments trong transport-plan. Create/Edit chưa có.

### Kế hoạch và cấu trúc triển khai

- [x] Tách AB1/AB2, UUID, summary nullable; cập nhật query và response TP2/TP3.
- [x] AB1/AB2/TP1/TP4 dùng endpoint và payload mới; giữ envelope/errors, Axios/auth và query keys.
- [x] Create/Edit dùng chung `TransportPlanMetadataForm`, helper validate/UTC/prefill/dirty patch, request guard.
- [x] List/detail dùng chung `getApprovedBookingActions`, không fetch theo từng row.
- [x] Giữ đúng ba tab General / Quotation / Personnel; URL lưu tab; không gọi quotation/PS mutations.
- [x] Test schema, services, query invalidation, role guards, tabs, filters, form và chống submit lặp.
- [ ] Kiểm thử runtime với BE và visual/browser bởi người dùng/team.

## API

| API | Method / path (base /api/v1) |
| --- | --- |
| AB1 | GET /bookings/approved |
| AB2 | GET /bookings/approved/{bookingId} |
| TP1 | POST /bookings/{bookingId}/transport-plans |
| TP2 | GET /transport-plans |
| TP3 | GET /transport-plans/{transportPlanId} |
| TP4 | PUT /transport-plans/{transportPlanId} |

AB1: `pageIndex, pageSize, search, isInternational, transportPlanStatus, routePlanStatus, hasRoutePlan, hasTransportPlan, hasComplianceDossier, complianceDossierStatus, departureFrom, departureTo, sortBy`. Không gửi Booking status, depositStatus, routePlanningStatus hoặc employeeId.

TP2: `pageIndex, pageSize, search, status, routePlanStatus, sortBy`.

TP1 chỉ có `plannedStartAt, plannedEndAt, estimatedDistanceKm?, estimatedDurationMinutes?, planningNote?`. TP4 thêm `lastUpdatedAt` và `updateReason?`, gửi metadata đã thay đổi. Field số/ngày tùy chọn để trống được bỏ qua, không biến null thành 0; planningNote thay đổi thành chuỗi rỗng có thể được gửi để xóa ghi chú. Không suy đoán API clear-null cho số/ngày. Ngày nhập theo múi giờ trình duyệt, convert UTC khi gửi; token updatedAt giữ nguyên chính xác từ TP3.

Conflict `TRANSPORT_PLAN_MODIFIED` khóa Save và giữ dữ liệu đang nhập. Reload Latest Data thay baseline/token và reset form rõ ràng; background refetch không tự thay baseline. `PLAN_LOCKED` khóa Save. Duplicate TP1 refetch AB2, chỉ mở plan khi ID thật xuất hiện.

Mutation invalidates AB1 list, AB2 của booking, TP2 list, TP3 của plan; không invalidates quotation/personnel hoặc tất cả feature.

## Entry points hiện có (không sửa router)

- List: `/admin/approved-bookings`.
- Booking detail: `/admin/approved-bookings/:bookingId`.
- Create: `/admin/approved-bookings/:bookingId?action=create-plan` → cùng `CreateTransportPlanPage`.
- TP list: `/admin/transport-plans`.
- TP detail: `/admin/transport-plans/:transportPlanId`.
- Edit: `/admin/transport-plans/:transportPlanId?action=edit` → cùng `EditTransportPlanPage`.
- Tab: `?tab=general|quotation|personnel`; hỗ trợ reload/back/forward.

Các entry Create/Edit trên chạy trong route detail đã đăng ký, không giả định route mới tồn tại. Component page vẫn độc lập, dùng useParams và có guard LM riêng ở page, form, mutation hook; không dùng location.state.

## Quotation và Personnel

Giữ `TransportPlanQuotation` và `QuotationDetails` (bảng line items, currency, total, version, notes). Không còn fetch `/transport-plans/{id}/quotation`. Default chỉ có informational empty state; không tiền/status giả, không nút Issue/Pay và không đưa quotation vào TP1/TP4. Schema cũ chỉ là contract trình bày của bảng giữ lại, không dùng parse API Flow 3. Flow 6 cần adapter/DTO chính thức riêng.

`TransportPlanPersonnel` nhận `transportPlanId` và optional `panel: ComponentType<{ transportPlanId: string }>`. `TransportPlanDetails` nhận optional `personnelPanel` cùng signature. Repo chưa có `src/features/personnel`; panel hiện là boundary thông báo rõ, không triển khai UC-36 hay gọi PS1/PS2/PS5.

## Bàn giao team

### Uyên — router/sidebar và personnel

- Thêm TRANSPORT_SPECIALIST vào `APPROVED_BOOKINGS_ACCESS`; hiện router vẫn chỉ cho LM/RC mở UC-32.
- Routes hiện tại AB list/detail và TP list/detail giữ nguyên.
- Nếu cần URL standalone: đăng ký `/admin/transport-plans/new/:bookingId` → default export `pages/CreateTransportPlanPage.tsx`, LM-only; `/admin/transport-plans/:transportPlanId/edit` → default export `pages/EditTransportPlanPage.tsx`, LM-only. Update navigation helper trong transport-plan sau khi route được merge; không tạo page/form thứ hai.
- Có thể đăng ký `/admin/personnel-assignment/:transportPlanId` LM-only khi feature sẵn sàng. Hiện Manage Personnel dùng TP Detail `?tab=personnel`.
- Xuất `PersonnelAssignmentPanel` thật; gắn vào prop `panel/personnelPanel` hoặc wrapper hiện có của transport-plan. Personnel sở hữu quyền, PS2, điều kiện Phase 1 và PS1/PS5.
- Sidebar: mục Approved Bookings cho LM/RC/TS, Transport Plans cho LM/RC/TS; không mở quyền các trang admin khác.

### Flow 1 owner

Reuse `getApprovedBookingActions` qua adapter AB summary/detail, `createTransportPlanPath(bookingId)`, TP detail và `?tab=personnel`. Không gắn TS/RC ở bước tạo. Code Flow 1 chưa bị sửa.

### Khuyên — Route Plan

Repo chưa có route-plan/route-view hoặc route đăng ký. Create/View Route Plan action có targetId thật nhưng disabled với lý do; không dùng đường dẫn đoán. Khi team merge, nối href bằng route helper được xác nhận. RC chỉ tạo khi TP APPROVED và chưa có primary route chưa hủy; TS View Route / Legal Review phụ thuộc public feature của team.

### Flow 2 owner

TS Apply Template đi tới route hiện có `/compliance-dossiers/new/:bookingId?transportId=:transportId`; D1 giữ bookingId và ngữ cảnh D2 giữ transportId. View dossier dùng `dossierDetail` đã đăng ký. ApplyTemplatePage hiện đọc bookingId; dossier-services cũ còn create theo Booking và Flow 2 cần cập nhật D2 sang `POST /transports/{transportId}/compliance-dossier` theo contract mới. Transport-plan không sửa/gọi mutation Flow 2.

## File thay đổi

Mới: `components/ApprovedBookingActionMenu.tsx`, `components/TransportPlanMetadataForm.tsx`, `pages/CreateTransportPlanPage.tsx`, `pages/EditTransportPlanPage.tsx`, `transport-plan.form.ts`, `flow3.test.mjs`.

Sửa:

- API/DTO: `schemas.ts`, `types.ts`, `services.ts`, `transport-plan.schemas.ts`, `transport-plan.types.ts`, `transport-plan.services.ts`.
- Query/action/filter: `hooks/useApprovedBookings.ts`, `hooks/useTransportPlans.ts`, `approved-booking-actions.ts`, `constants.ts`, `transport-plan.constants.ts`.
- Page: `pages/ApprovedBookingsPage.tsx`, `pages/ApprovedBookingDetailsPage.tsx`, `pages/TransportPlanDetailsPage.tsx`.
- Components: `ApprovedBookingBadge.tsx`, `ApprovedBookingDetails.tsx`, `ApprovedBookingFilters.tsx`, `ApprovedBookingPlanningAction.tsx`, `ApprovedBookingsTable.tsx`, `TransportPlanFilters.tsx`, `TransportPlanGeneral.tsx`, `TransportPlanQuotation.tsx`, `TransportPlanPersonnel.tsx`, `TransportPlansTable.tsx`.
- Tài liệu: `README.md`.

Không xóa file; loại bỏ types/schema deposit/route-planning/assignments cũ, giữ component Quotation và bảng line items.

## Kiểm thử

```powershell
node --test --test-concurrency=1 src/features/transport-plan/flow3.test.mjs
corepack pnpm exec tsc -b --pretty false
corepack pnpm run lint
corepack pnpm run build
git diff --check
git status --short
```

Test dùng Node/Vite SSR và Axios adapter chỉ trong test, không gọi mạng thật và không có mock production. SSR không thay thế kiểm tra visual/browser.

Manual:

1. LM mở Approved Bookings, search/filter/sort/page size; Network phải dùng AB1 mới, filter thay đổi đưa pageIndex về 1.
2. Mở booking không có plan → Create; nhập dates, thử end <= start và số invalid; để trống optional numeric rồi Save.
3. Xác nhận POST TP1 metadata-only, response DRAFT/UUID thật, chuyển tới detail; AB1/AB2 cập nhật, không còn Create.
4. Detail phải có General / Quotation / Personnel; reload từng URL tab và kiểm tra back/forward.
5. Edit DRAFT/PENDING/APPROVED: kiểm tra prefill local time, PUT có lastUpdatedAt gốc và chỉ field thay đổi. Nhấn Save nhanh hai lần chỉ có một mutation.
6. Mở hai tab Edit cùng plan, lưu tab A rồi tab B: B giữ form, hiển thị conflict, khóa Save; Reload Latest Data thay token đúng rồi mới lưu lại.
7. Thử PLAN_LOCKED, duplicate TP1, 404/403 và errors[] validation; không làm giả ID.
8. Plan APPROVED có Manage Personnel; DRAFT/PENDING không có. Personnel hiện thông báo chờ UC-36.
9. RC/TS không có Create/Edit/Manage Personnel; TS UC-32 chỉ test được sau khi Uyên bổ sung route access.
10. Quotation chưa có dữ liệu: không request quotation, không hiển thị tiền giả. Kiểm tra desktop/mobile toolbar/table overflow và keyboard/popovers.

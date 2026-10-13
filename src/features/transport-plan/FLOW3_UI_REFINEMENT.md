# Flow 3 — Kế hoạch tinh chỉnh UI

## Phạm vi và ràng buộc

Branch kiểm tra: `feat/87-refine-ui`; working tree ban đầu sạch. Chỉ sửa presentation trong `transport-plan` và `route-view`. Giữ nguyên API, schema, hook, policy, mutation, navigation, mock và tích hợp Personnel/Invoice/Dossier. Không sửa router, shared map/timeline/compare hoặc module của owner khác. Không chạy/tạo tests hoặc browser automation; không commit/push.

## Audit source và kế hoạch

| Màn hình | Vấn đề xác nhận từ source | Thay đổi presentation |
| --- | --- | --- |
| Approved Bookings / Transport Plans | Toolbar grid tách hàng trên tablet, View riêng; bảng thiếu numeric alignment | Toolbar gọn có overflow ngang, View cùng hàng; số căn phải, ngày tabular; giữ column visibility và server pagination |
| Booking Detail / TP Detail | Section `rounded-xl`, padding 20–24px, icon lớn; overview grid stretch | Surface 2px, padding 16px, heading rõ; metric tự nhiên với `items-start`; booking references và actions giữ nguyên |
| Create / Edit TP | Field layout chưa có phân nhóm schedule/estimates; dialog bo mặc định | Heading và divider trong fieldset, hai cặp field; dùng nguyên DatePicker + Select; footer actions wrap trên mobile |
| LM / RC / TS Workspace | Cùng nhiều surface bo lớn, planning reference lồng panel | Header accent nhẹ, section gọn, disclosure focus rõ; giữ riêng role và toàn bộ action/blocked reason |
| Route Detail / Overview / Alternatives | `h-full`, `mt-auto`, card bo lớn, heading lớn | Surface 2–4px, natural height, số 24px, tabs gọn; giữ BACKUP replacement scope |
| Map / Segments / Legal | Map bo 12px; timeline spacing và status không đồng nhất | Chỉ chỉnh wrapper owned, giữ chiều cao map có mục đích; status/impact pill; giữ mọi dữ liệu và shared viewer |
| EC1 / EC2 / EC3 / EC4 | Dialog/CTA bo lớn, grid stretch; comparison có nhiều panel | Góc 2–4px, `items-start`, spacing 12–16px, phân biệt proposed/current; không đổi handler, guard, resource hoặc confirmation |

## Các bước thực thi

1. Chỉnh `Section`, `Field`, overview, badge trong transport-plan: radius nhỏ, nhóm thông tin 12–16px, section 20px, accent/gradient nhẹ trên identity và metrics. Static card không nâng khi hover.
2. Chỉnh list/filter/table và form: giữ component shared; đổi class/wrapper và heading, không đổi giá trị/validation/query.
3. Chỉnh route-view độc lập: card/dialog/tab/control, dense metrics và comparison; giữ shared integration và semantics PRIMARY/BACKUP/RETURN.
4. Rà diff để bảo đảm không thay business/ownership; chạy `corepack pnpm run lint`, `corepack pnpm run build`, `git diff --check`, `git diff --stat`, `git status --short`.

## Nghiệm thu thủ công

Đăng nhập bằng role thật LM/RC/TS, dùng IDs API thực hoặc Flow 3 mock hiện có (`VITE_ENABLE_FLOW3_MOCKS=true`, chỉ development). Kiểm list/filter/sort/pagination, detail tabs, form/picker/errors, role actions, route alternatives và partial replacement, map/timeline, confirmation và trạng thái stale/loading/error/empty. Kiểm 1440px, 768px, 375px; keyboard focus và reduced motion. Không đổi auth để xem UI.

Source audit không thay thế visual verification. Shared ErrorState/EmptyState không nhận `className` và có padding/radius riêng; Personnel/Invoice và shared map giữ UI của owner, không selector override sâu.


## File đã chỉnh và trách nhiệm

### Transport Plan — 22 file source

- `components/ApprovedBookingActionMenu.tsx`
- `components/ApprovedBookingBadge.tsx`
- `components/ApprovedBookingDetails.tsx`
- `components/ApprovedBookingFilters.tsx`
- `components/ApprovedBookingsTable.tsx`
- `components/BookingTransportPlanAction.tsx`
- `components/DepartureDateRangeFilter.tsx`
- `components/Flow3MockIndicator.tsx`
- `components/TransportOverview.tsx`
- `components/TransportPlanFilters.tsx`
- `components/TransportPlanGeneral.tsx`
- `components/TransportPlanMetadataForm.tsx`
- `components/TransportPlanQuotation.tsx`
- `components/TransportPlanStatusBadge.tsx`
- `components/TransportPlansTable.tsx`
- `components/TransportWorkspace.tsx`
- `pages/ApprovedBookingDetailsPage.tsx`
- `pages/ApprovedBookingsPage.tsx`
- `pages/CreateTransportPlanPage.tsx`
- `pages/EditTransportPlanPage.tsx`
- `pages/TransportPlanDetailsPage.tsx`
- `pages/TransportPlansPage.tsx`

Các pages: shell/header gọn; filters/tables: toolbar, alignment, hover; Section/Field/overview: density; badge: pill; MetadataForm và BookingTransportPlanAction: nhóm field/dialog; Workspace và Quotation: bố cục container, không sửa tích hợp nghiệp vụ.

### Route View — 19 file source

- `components/RouteContingencyTab.tsx`
- `components/RouteLegalReview.tsx`
- `components/RoutePlanDetails.tsx`
- `components/RoutePlanHeader.tsx`
- `components/RoutePlanMap.tsx`
- `components/RoutePlanMapPanel.tsx`
- `components/RoutePlanOverview.tsx`
- `components/RoutePlansTable.tsx`
- `components/RoutePlansWorkspace.tsx`
- `components/RouteSegmentList.tsx`
- `components/emergency/BackupActivationRequestDialog.tsx`
- `components/emergency/DriverNoticeDialog.tsx`
- `components/emergency/EmergencyActionBar.tsx`
- `components/emergency/EmergencyChangeSummary.tsx`
- `components/emergency/EmergencyFeedback.tsx`
- `components/emergency/ReturnActivationPanel.tsx`
- `components/emergency/RouteChangeComparison.tsx`
- `components/emergency/RouteChangeDecisionPanel.tsx`
- `pages/RoutePlanDetailPage.tsx`

Chỉ chỉnh class/layout wrapper, metric, tabs, timeline, dialog và feedback. Map height, props, dữ liệu geometry, replacement scope và toàn bộ decision/request/activation/notice handler giữ nguyên.

### Tài liệu

- `FLOW3_UI_REFINEMENT.md`: audit, kế hoạch, phạm vi, file map và nghiệm thu.

## URL nghiệm thu trên Vite local

Giả sử Vite chạy tại `http://localhost:5173`; dùng port thực Vite in ra nếu khác.

| UI | URL / cách mở | Role |
| --- | --- | --- |
| UC-32 list/detail | `/admin/approved-bookings`, `/admin/approved-bookings/{bookingId}` | RC/TS theo router hiện tại |
| TP list/detail | `/admin/transport-plans`, `/admin/transport-plans/{transportPlanId}` | LM/RC/TS, đúng assignment |
| UC-34 dialog | `/admin/transport-requests/{bookingId}` → Create Transport Plan | LM; Booking APPROVED có Transport, chưa có TP |
| UC-35 form | `/admin/transport-plans/{transportPlanId}?action=edit` | LM; policy hiện có cho phép edit |
| UC-38 | `/admin/route-plans/{routePlanId}` | LM/RC/TS |
| UC-48 decision | `/admin/route-plans/{routePlanId}/change-decision` | LM; route/transport đúng trạng thái |
| UC-48 activation | `/admin/route-plans/{routePlanId}/return-activation` | LM; RETURN đủ điều kiện |
| EC1 / EC4 | Route Detail → Request Backup Activation / Notify Driver | RC; action hiện theo policy hiện có |

Fixture development hiện có: TP DRAFT `00000003-0000-4000-8000-000000000002`; TP APPROVED `00000003-0000-4000-8000-000000000006`; route PRIMARY `00000004-0000-4000-8000-000000000006`; BACKUP `00000004-0000-4000-8000-000000000009`; partial BACKUP `00000004-0000-4000-8000-00000000000a`. IDs fixture sử dụng số hex ở phần đuôi. Mock chỉ thay data source Flow 3, không mock authentication hoặc API Booking Detail của Flow 1: khi thử Create từ Booking Detail, dùng booking thật hợp lệ.

## Giới hạn / handoff

- UC-32 route hiện chỉ RC/TS; LM vào Booking Detail và TP List theo kiến trúc hiện tại. Không mở rộng quyền/router trong task visual.
- Shared ErrorState/EmptyState có `rounded-lg p-10`, shared DatePicker calendar/popover và filter badge dùng style riêng; không sửa shared hoặc dùng selector ghi đè sâu. Muốn thống nhất toàn app cần handoff owner shared.
- PersonnelAssignmentPanel và InvoicesPanel giữ nội bộ UI của owner. Map controls/timeline/compare shared giữ nguyên.
- Chưa mở/render browser: **NOT VISUALLY VERIFIED**. Cần kiểm trực tiếp responsive, popup/focus, vùng map và các trạng thái ít/nhiều dữ liệu.

## Validation lần cuối trong task

- `corepack pnpm run lint`: exit 0, 0 errors, 49 warnings. Có warning `react(incompatible-library)` tại `ApprovedBookingsTable.tsx` do `useReactTable` đã tồn tại; không sửa hook để xử lý warning trong task visual.
- `corepack pnpm run build`: exit 0; gồm `tsc -b` và Vite production build. Vẫn có warning chunk > 500kB và `INEFFECTIVE_DYNAMIC_IMPORT` ở `AddHorsePage` ngoài scope.
- `git diff --check`: đạt; Git thông báo chuẩn hóa LF/CRLF, không có lỗi whitespace.
- `git diff --stat` / `git status --short`: 41 file source modified + tài liệu này untracked; tất cả trong hai thư mục được phép, không staged.
- Review độc lập source/diff: sửa overflow của filter ở nhánh API lỗi; không còn issue critical/important được xác nhận. Đây không phải nghiệm thu browser.
- Không chạy/tạo tests, không browser automation, không commit/push hoặc thao tác branch/history.

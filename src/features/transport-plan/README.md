# UC-32 — Approved Bookings

## Phạm vi

Hai màn hình chỉ đọc dùng AB1/AB2 theo Flow 3 contract:

- `/admin/approved-bookings`
- `/admin/approved-bookings/:bookingId`

Chỉ `LOGISTICS_MANAGER` và `FLEET_ROUTE_COORDINATOR` được truy cập. Nhánh route riêng dùng `AdminLayout` và `ProtectedRoute` hiện có; quyền của các trang `/admin` khác không thay đổi. `TRANSPORT_SPECIALIST` không có mục menu hoặc quyền UC-32.

## API và dữ liệu

- AB1: `GET /api/v1/approved-bookings`; không gửi `status=APPROVED`.
- AB2: `GET /api/v1/approved-bookings/{bookingId}`; lấy ID từ URL, không dùng `location.state`.
- Dùng Axios/auth sẵn có, kiểm tra envelope và giá trị bằng Zod, TanStack Query và AbortSignal.
- Search debounce 300 ms; filter/sort/page size đưa về trang 1. Search/filter/sort/pagination đều do server thực hiện.
- Không gọi thêm API TransportPlan cho từng dòng; không có mutation hay mock fallback.

## Phụ thuộc chưa có trong repo tại thời điểm triển khai

1. BE hiện có `GET /api/v1/bookings/approved` với policy TS/RC và DTO `customerName`, `complianceDossier`, `routePlan`. Đây **không phải** AB1/AB2 dành cho LM/RC: chưa có `/api/v1/approved-bookings` hoặc endpoint detail tương ứng. Không dùng API cũ làm fallback. BE cần bổ sung read model theo contract trước khi kiểm thử dữ liệu thật.
2. Chưa có trang/route UC-34 tạo/xem TransportPlan hay UC-33 tạo/xem RoutePlan. `approved-booking-actions.ts` xác định đúng hành động và ID đích; UI vô hiệu hóa điều hướng với lý do cụ thể đến khi các route thật được đăng ký. Không liên kết đến mục sidebar `/admin/transport-plans` đang chưa có trang.
3. Không khai báo lại enum RoutePlan. Chỉ dùng `CANCELLED` đã đối chiếu `Pegaxus.Repository/Enum/RoutePlanEnum.cs` để loại tuyến PRIMARY đã hủy; những trạng thái khác hiển thị theo dữ liệu API.

## Kiểm thử

```powershell
node --test --test-concurrency=1 src/features/transport-plan/approved-bookings.test.mjs
corepack pnpm exec tsc -b --pretty false
corepack pnpm run lint
corepack pnpm run build
git diff --check
```

Fixture/adapter chỉ nằm trong test; không truy cập mạng hoặc thông tin đăng nhập thật. Các test render HTML không thay thế kiểm tra trực quan trên trình duyệt.

Sau khi BE có AB1/AB2, kiểm tra thủ công:

1. Đăng nhập LM rồi RC, mở **Approved Bookings** và kiểm tra list/detail; tải lại URL detail trực tiếp.
2. Search theo booking code/customer, chọn scope/deposit/planning/date range; kiểm tra query Network đúng và pageIndex về 1.
3. Thử bốn cách sort, đổi trang, đổi Rows per page và Reset. Kiểm tra không có request theo từng dòng.
4. Thử danh sách rỗng, filter không khớp, lỗi mạng/Retry, 404 và 409 detail.
5. LM: chưa có plan → Create Transport Plan; đã có → View Transport Plan. Hiện nút có lý do chưa có route UC-34.
6. RC: chưa có plan → chờ LM; plan chưa APPROVED → chờ duyệt/thanh toán; plan APPROVED không có PRIMARY còn hiệu lực → Create Route Plan; có PRIMARY → View Route Plan. Hiện điều hướng chờ route UC-33.
7. Đăng nhập TS: không có menu Approved Bookings; mở trực tiếp hai URL phải chuyển đến unauthorized. RC vẫn không được mở các trang admin vốn chỉ dành cho LM.
8. Kiểm tra desktop/mobile, cuộn ngang bảng, keyboard/focus và dropdown/date picker.

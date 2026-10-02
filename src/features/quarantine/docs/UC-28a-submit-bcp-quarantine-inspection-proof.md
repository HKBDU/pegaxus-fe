# UC-28a: Nộp nhanh bằng chứng kiểm dịch tại trạm (Submit BCP Quarantine Inspection Proof)

## Metadata

- **Story**: Là Horse Escort (người đi cùng xe) hoặc Driver, tôi muốn chụp ảnh/tải lên nhanh Tờ khai thông quan thú y (BCP Clearance Sheet) và chọn kết quả sơ bộ (PASSED, HOLDBACK, FAILED) ngay tại trạm kiểm dịch BCP để hệ thống kịp thời cập nhật chứng từ mà không làm ngưng trệ hành trình xe.
- **Context**: Khi xe tải chở ngựa đến Trạm Kiểm soát Biên giới (BCP như Calais, Coquelles, Dublin), Bác sĩ thú y chính thức (OV) tại BCP thực hiện kiểm tra thực tế và cấp tờ khai thông quan. Escort/Driver là người trực tiếp nhận tờ khai này. Để tránh việc xe phải dừng chờ lâu, Escort/Driver thực hiện nộp nhanh bằng chứng hình ảnh và kết quả sơ bộ.
- **Sprint**: 2
- **Priority**: Must
- **Status**: Todo
- **Creator**: HoangNT20
- **Assignee**:
  - Mobile/Backend: Nguyễn Tiến Hoàng
  - QA: Đội ngũ QA SWP391

## Conditions

### Preconditions

- Chuyến xe đang diễn ra và đã đến trạm kiểm soát BCP.
- `ComplianceDossier` (CDos) của chuyến đi đã ở trạng thái hợp lệ trước đó (`APPROVED`).
- Escort / Driver đã đăng nhập vào hệ thống Pegaxus trên trình duyệt di động (Responsive Web).

### Trigger

- Escort hoặc Driver nhấp chọn "Submit BCP Quarantine Proof" trên giao diện di động khi đang ở trạm kiểm dịch.

## Flow

### Main Flow: Nộp nhanh bằng chứng kiểm dịch Đạt (PASSED)

1. Escort/Driver mở màn hình "Chuyến đi hiện tại" trên giao diện Responsive Web di động, chọn điểm dừng trạm BCP.
2. Escort/Driver bấm chọn "Quick Submit BCP Proof".
3. Hệ thống hiển thị biểu mẫu nộp nhanh tối giản:
   - Trạm BCP (Hệ thống tự gợi ý theo vị trí GPS hoặc lộ trình chuyến đi).
   - Kết quả sơ bộ từ Bác sĩ thú y (Quick Outcome: `PASSED`, `HOLDBACK_REINSPECT`, `FAILED`).
   - Tệp ảnh đính kèm (Yêu cầu chụp trực tiếp từ camera điện thoại: Tờ khai BCP Clearance Sheet).
   - Ghi chú nhanh (Tùy chọn).
4. Escort/Driver chụp ảnh tờ khai BCP, chọn kết quả `PASSED` và nhấn "Submit Proof".
5. Hệ thống lưu bản ghi nộp sơ bộ vào bảng **Proof** (bản ghi minh chứng kiểm dịch) gắn với CDos của chuyến đi.
6. Hệ thống cập nhật trạng thái minh chứng trong bảng **Proof** thành `PENDING_VERIFICATION` (ho  ặc `SUBMITTED`), giữ nguyên trạng thái tổng thể của `ComplianceDossier` ở `APPROVED`.
7. Hệ thống tự động phát cảnh báo trên Web Dashboard và gửi Email cho Transport Specialist (TS) để tiến hành thẩm định chính thức.
8. Màn hình di động hiển thị thông báo thành công: "Quarantine proof submitted successfully. Awaiting TS Verification."

### Alternative Flow

#### ALT-01: Ngựa bị giữ lại kiểm tra/theo dõi thêm (HOLDBACK_REINSPECT)

1. Bác sĩ thú y tại BCP giữ lại 1 con ngựa để theo dõi.
2. Escort chọn `HOLDBACK_REINSPECT`, chọn con ngựa bị ảnh hưởng trong danh sách và chụp ảnh giấy báo giữ lại của BCP.
3. Hệ thống cập nhật trạng thái bản ghi trong bảng **Proof** thành `HOLDBACK`, giữ nguyên CDos ở `APPROVED` và gửi cảnh báo khẩn cấp tới TS và Fleet Coordinator để chuẩn bị phương án điều chỉnh ETA.

### Exception Flow

#### EXC-01: Tải ảnh thất bại / Ảnh mờ không hợp lệ

1. Tệp ảnh chụp bị lỗi mạng hoặc quá mờ.
2. Hệ thống cảnh báo: "Upload failed or image unclear. Please retake the photo."
3. Escort/Driver chụp lại và bấm nộp lại.

## Acceptance Criteria

#### AC-001: Nộp chứng nhận kiểm dịch PASSED trên Mobile App thành công

- **Given**: Xe đang dừng tại BCP Calais và Escort nhận được Tờ khai BCP Clearance Sheet.
- **When**: Escort chụp ảnh tờ khai, chọn `PASSED` và bấm Submit Proof.
- **Then**: Hệ thống tạo bản ghi trong bảng **Proof** với trạng thái `PENDING_VERIFICATION`, giữ nguyên `ComplianceDossier` ở `APPROVED` và gửi thông báo thẩm định gấp cho TS dưới 2 giây.

#### AC-002: Tối ưu hóa tệp ảnh chụp trực tiếp

- **Given**: Escort chụp ảnh tờ khai BCP từ camera thiết bị di động.
- **When**: Ứng dụng nộp dữ liệu lên máy chủ.
- **Then**: Ứng dụng tự động nén dung lượng ảnh (tối đa 5MB) đảm bảo tải nhanh ngay cả trong điều kiện sóng 3G/4G yếu tại biên giới.

## References

### TDDs

- TDD-002: Kiến trúc Quản lý Hồ sơ Pháp lý & Kiểm dịch (Legal & Document Management Architecture)
- TDD-005: Ứng dụng Di động cho Driver & Escort (Mobile Driver/Escort App Integration)

### Rules

- BR-019: Quy định Định danh & Cấu trúc Mã Passport & Microchip Ngựa đua
- BR-034: Quy định nghỉ ngơi và thông quan tại trạm biên giới Châu Âu

## Non-Functional

- Performance: Thời gian tải ảnh và tạo bản ghi sơ bộ $\le 3$ giây trên kết nối di động.
- Usability: Giao diện Mobile cực kỳ đơn giản, hoàn thành thao tác trong tối đa 3 lần chạm (clicks).

## Out of Scope

- Thẩm định pháp lý chi tiết và chốt bản ghi bất biến (Thuộc phạm vi UC-28b).

---

## Rationale & Business Context (Lý do cần UC-28a)

1. **Loại bỏ điểm nghẽn thông tin thời gian thực (Zero Bottleneck):** Escort/Driver là người có mặt trực tiếp tại trạm BCP cùng Bác sĩ thú y. Việc cho phép họ nộp ngay bằng chứng hình ảnh giúp hệ thống ghi nhận dữ liệu tức thì, loại bỏ tình trạng xe bị ngưng trệ do phải chờ đợi liên lạc thủ công.
2. **Tối ưu trải nghiệm di động trên đường (Mobile UX Optimization):** Driver và Escort có nhiệm vụ chính là tập trung lái xe an toàn và chăm sóc sức khỏe cho ngựa. Form nộp nhanh được thiết kế tối giản (1 chụp ảnh + 1 chọn status), hoàn thành dưới 30 giây, không gây phiền hà hay quá tải thao tác cho nhân sự vận hành trên đường.
3. **Kích hoạt quy trình thẩm định sớm:** Tạo tiền đề bằng chứng để Transport Specialist (TS) tại văn phòng nhận được tài liệu ngay lập tức và tiến hành soi kỹ hồ sơ ở UC-28b.

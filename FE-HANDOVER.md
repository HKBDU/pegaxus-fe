# BÁO CÁO BÀN GIAO YÊU CẦU KỸ THUẬT CHO ĐỘI NGŨ FRONTEND (FE-HANDOVER.md)
## TASK SPECIFICATION: TỐI ƯU HÓA MOCK GPS (STEALTH MODE), RESET CHUYẾN ĐI & KIỂM TOÁN TÀI LIỆU DỰ ÁN

> **Dự án:** Pegaxus - Cross-Border Racehorse Transport System (`SWP391`)  
> **Thời điểm lập:** 12/11/2026  
> **Người giao việc / Quản lý:** Project Lead  
> **Người tiếp nhận thực hiện:** Frontend Development Team (`pegaxus-fe`)  
> **Mục tiêu:** Chuẩn bị tối ưu cho buổi bảo vệ đồ án trước Hội đồng chấm thi, che giấu hoàn toàn các công cụ giả lập trên giao diện người dùng, cung cấp kịch bản khôi phục dữ liệu tức thì và dọn dẹp kho tài liệu dự án.

---

## 1. TỔNG QUAN PHÂN CÔNG NHIỆM VỤ

| Mã Task | Tên nhiệm vụ | Mức độ ưu tiên | Trạng thái hiện tại | Người chịu trách nhiệm |
|:---:|---|:---:|:---:|:---:|
| **FE-TASK-01** | **Che giấu bộ công cụ Mock GPS (Stealth Mode)**<br>Chỉ render khi có Query param hoặc kích hoạt qua thao tác ẩn | 🔴 **Cao (P1)** | **Cần thực hiện (To-Do)** | **Frontend Dev** |
| **FE-TASK-02** | **Bộ công cụ SQL / Script Reset Chuyến đi 1-Click**<br>Khôi phục chuyến đi về `IN_TRANSIT`/`READY` khi cần demo lại | 🟢 **Đã hoàn thành** | **Sẵn sàng sử dụng** | Dev Lead / Presenter |
| **FE-TASK-03** | **Kiểm toán & Dọn dẹp Tài liệu Dự án**<br>Chuyển tài liệu đã xong vào `.docs/archive/` | 🟢 **Đã hoàn thành** | **Đã lưu trữ** | Documentation |

---

## 2. CHI TIẾT TASK CẦN THỰC HIỆN: FE-TASK-01 (MOCK GPS STEALTH MODE)

### 2.1. Bối cảnh & Vấn đề (Problem Statement)
Hiện tại trên màn hình chia sẻ vị trí của tài xế ([`DriverLocationSharingPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/location-sharing/pages/DriverLocationSharingPage.tsx)):
1. **Nút nổi lộ liễu**: Nút `[⚡ GPS Simulator]` với icon sóng vô tuyến nhấp nháy nằm cố định ở góc dưới màn hình (`GpsSimulatorDrawer.tsx`).
2. **Khung điều khiển choán nửa màn hình**: Trên desktop, component `GpsSimulatorWidget` chiếm trọn cột bên phải với các nhãn *"Driver GPS Simulator"*, *"DEMO MODE"*, *"DEMO TOOLS"*.
3. **Ảnh hưởng khi bảo vệ**: Khi chiếu màn hình tài xế cho Hội đồng xem, giao diện trông như một trang test kỹ thuật của lập trình viên thay vì ứng dụng nghiệp vụ thực tế của tài xế ngoài đời.

### 2.2. Yêu cầu Nghiệp vụ & Kỹ thuật chi tiết (Requirements)
Yêu cầu đội ngũ Frontend chỉnh sửa code để **mặc định ẩn 100% công cụ Mock GPS**. Giao diện Driver phải sạch sẽ 100% như app thương phẩm, và **CHỈ render công cụ khi thỏa mãn một trong các điều kiện sau**:

#### Điều kiện 1: URL Query Parameter
- Tự động hiển thị khi URL trình duyệt có chứa các tham số dev:
  - `?dev=1`
  - `?simulator=true`
  - `?sim=1`
  - Hoặc `?demo=1`

#### Điều kiện 2: Phím tắt bí mật toàn cục (Hotkey)
- Lắng nghe sự kiện bàn phím toàn cục: **`Ctrl + Shift + G`** (hoặc `Cmd + Shift + G` trên macOS).
- Khi người thuyết trình bấm tổ hợp phím này:
  - Toggle trạng thái bật/tắt hiển thị công cụ Simulator.
  - Lưu trạng thái vào `localStorage` (key: `pegaxus_simulator_visible`) để khi F5 / Reload trang không bị mất.

#### Điều kiện 3: Cử chỉ chạm bí mật (Secret Gesture cho Mobile/Tablet)
- Khi demo trên điện thoại di động hoặc máy tính bảng không có bàn phím cứng:
  - Hỗ trợ **nhấp nhanh 3 lần liên tiếp** (trong vòng 800ms) vào một trong hai vị trí:
    1. **Avatar của tài xế** ở góc trên bên phải thanh điều hướng ([`ProfileDropdown.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/shared/components/ProfileDropdown.tsx)).
    2. **Biểu tượng vị trí `MapPin`** trên tiêu đề trang chia sẻ vị trí ([`DriverLocationSharingPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/location-sharing/pages/DriverLocationSharingPage.tsx)).
  - Sau 3 lần nhấp nhanh, tự động kích hoạt hiển thị bộ công cụ Simulator.

#### Điều kiện 4: Tự động co giãn Layout trang Driver
- **Khi Simulator bị ẨN**:
  - Không render `GpsSimulatorWidget` ở cột bên phải.
  - Không render nút nổi `GpsSimulatorDrawer`.
  - Khung chia sẻ vị trí (`LocationSharingControl`) tự động co về giữa màn hình với độ rộng chuẩn (`max-w-3xl mx-auto`), thanh thoát và chuẩn giao diện ứng dụng nghiệp vụ thực tế.
- **Khi Simulator được BẬT**:
  - Mở rộng layout 2 cột trên desktop (`max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]`) hiển thị widget, hoặc hiển thị nút nổi mở Sheet Drawer.

### 2.3. Hướng dẫn Triển khai Mã nguồn Tham khảo (Implementation Guide)

Đội Frontend nên tạo một custom hook tái sử dụng tại:  
`src/features/location-sharing/simulator/useSimulatorVisibility.ts`

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "pegaxus_simulator_visible";
const EVENT_NAME = "pegaxus:toggle-simulator";

export function useSimulatorVisibility() {
  const [searchParams] = useSearchParams();

  const hasQueryParam =
    searchParams.get("dev") === "1" ||
    searchParams.get("simulator") === "true" ||
    searchParams.get("sim") === "1" ||
    searchParams.get("demo") === "1";

  const [isPersistedVisible, setIsPersistedVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const isVisible = hasQueryParam || isPersistedVisible;

  const toggleVisibility = useCallback(() => {
    setIsPersistedVisible((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { visible: next } }));
      return next;
    });
  }, []);

  // Lắng nghe Hotkey Ctrl + Shift + G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "G" || e.key === "g")) {
        e.preventDefault();
        toggleVisibility();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleVisibility]);

  // Bộ đếm click 3 lần trong 800ms
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSecretTripleClick = useCallback(() => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      toggleVisibility();
    } else {
      clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 800);
    }
  }, [toggleVisibility]);

  return { isVisible, hasQueryParam, toggleVisibility, handleSecretTripleClick };
}
```

**Các file cần gắn hook**:
1. [`GpsSimulatorDrawer.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/location-sharing/simulator/GpsSimulatorDrawer.tsx): Chỉ render `trigger` button khi `isVisible === true`.
2. [`GpsSimulatorWidget.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/location-sharing/simulator/GpsSimulatorWidget.tsx): Trả về `null` nếu `!isVisible`.
3. [`DriverLocationSharingPage.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/features/location-sharing/pages/DriverLocationSharingPage.tsx): Gắn `handleSecretTripleClick` vào icon `MapPin` trên Header và ẩn `<aside>` khi `!isVisible`.
4. [`ProfileDropdown.tsx`](file:///f:/@FPT/SWP391/pegaxus-fe/src/shared/components/ProfileDropdown.tsx): Gắn `handleSecretTripleClick` vào nút Avatar tài xế.

---

## 3. BỘ CÔNG CỤ RESET CHUYẾN ĐI 1-CLICK (FE-TASK-02 - ĐÃ SẴN SÀNG)

Khi demo tính năng định vị xe chạy đến trạm dừng, Backend sẽ kích hoạt **Geofence 500m** và tự động chốt `actual_arrival_at`, ghi nhận hoàn thành chặng/chuyến. Để giúp nhóm thuyết trình có thể diễn lại kịch bản lần 2 cho thành viên Hội đồng khác xem mà không bị khóa dữ liệu, hệ thống đã chuẩn bị sẵn bộ công cụ:

* **File SQL**: [`scripts/reset-trip.sql`](file:///f:/@FPT/SWP391/scripts/reset-trip.sql)
  - Đưa `Transport.status` về `IN_TRANSIT` (hoặc `READY`), cập nhật giờ xuất phát cách đây 15 phút, xóa `actual_arrival_at` và `completed_at`.
  - Khôi phục các chặng `RoutePlanRoute`: Chặng 1 về `IN_TRANSIT`, các chặng sau về `PLANNED`, xóa sạch mốc giờ đến do Geofence kích hoạt.
  - Xóa toàn bộ các biên bản bàn giao (`HandoverRecord`) sinh ra trong quá trình chạy thử.
* **File chạy nhanh 1-Click trên Windows**: [`reset-trip.bat`](file:///f:/@FPT/SWP391/reset-trip.bat)
  - Người demo chỉ cần click đúp vào file `reset-trip.bat` ngoài thư mục gốc là chuyến đi được khôi phục ngay lập tức.
  - Hoặc mở file `scripts/reset-trip.sql` trong pgAdmin / DBeaver và nhấn `F5`.

---

## 4. BÁO CÁO KIỂM TOÁN TÀI LIỆU DỰ ÁN (FE-TASK-03 - ĐÃ LƯU TRỮ)

Toàn bộ các tài liệu kỹ thuật đã hoàn thành mục tiêu nhiệm vụ đã được di chuyển an toàn vào thư mục lưu trữ [`pegaxus-fe/.docs/archive/`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/archive/):

### 4.1. Danh sách file đã được đưa vào Archive:
1. `fe-fix-transport-audit-schema.md`: Bản mô tả lỗi Zod schema của Transport Audit $\rightarrow$ Phía FE đã sửa xong trong `src/features/transport-audit/schemas.ts`.
2. `price-list-plan.md`: Kế hoạch xây dựng Bảng giá $\rightarrow$ Đã triển khai xong toàn bộ các component và page tại `src/features/price-list/`.
3. `legal-fix-plan.md` & `submit-fix-plan.md`: Kế hoạch đồng bộ hợp đồng RoutePlan trạng thái DRAFT $\rightarrow$ Đã xử lý xong.
4. `202610161705handover.md` & `20261061705handover.md`: Biên bản bàn giao kỹ thuật đợt cũ tháng 10.
5. `BE-handover.md` & `2026-11-05-BE-handover.md`: Biên bản bàn giao backend các giai đoạn trước.
6. `handover.md`: Báo cáo bàn giao cũ.
7. `estimate.md` & `caythumuc.txt`: Bảng ước lượng khối lượng công việc và cây thư mục cũ.
8. `handover-vehicle-bug.md` & `finalize-proof.md`: Kế hoạch vá lỗi các tính năng đã chốt.

### 4.2. Danh sách tài liệu hiện hành được giữ lại:
- [`alignment.md`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/pegaxus-document/alignment.md): Báo cáo đối chiếu và kiểm toán toàn diện mã nguồn ngày 10/11/2026.
- [`present.md`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/pegaxus-document/present.md): Kịch bản thuyết trình và phân vai bảo vệ đồ án.
- [`demo-checklist-horse-left-behind.md`](file:///f:/@FPT/SWP391/pegaxus-fe/.docs/pegaxus-document/demo-checklist-horse-left-behind.md): Kịch bản kiểm thử tình huống khẩn cấp ngựa bị bỏ lại.

---

## 5. TIÊU CHÍ NGHIỆM THU CHO ĐỘI FRONTEND (ACCEPTANCE CRITERIA)

Khi đội Frontend triển khai xong `FE-TASK-01`, cần kiểm tra theo checklist sau:

- [ ] **Test Case 1 (Mặc định)**: Đăng nhập tài khoản Driver, mở trang `/crew/transports/:id/location`. Giao diện chỉ có thẻ chia sẻ vị trí căn giữa, **hoàn toàn không có nút "GPS Simulator" hay widget nào ở cột bên phải**.
- [ ] **Test Case 2 (Query Param)**: Thêm `?dev=1` vào URL $\rightarrow$ Nút nổi hoặc widget Simulator xuất hiện.
- [ ] **Test Case 3 (Phím tắt)**: Ở trang bình thường, bấm `Ctrl + Shift + G` $\rightarrow$ Simulator xuất hiện. Bấm lần nữa $\rightarrow$ Simulator biến mất.
- [ ] **Test Case 4 (Cử chỉ chạm)**: Nhấp nhanh 3 lần vào Avatar hoặc icon MapPin $\rightarrow$ Simulator xuất hiện / ẩn đi.
- [ ] **Test Case 5 (F5 Reload)**: Bật Simulator bằng phím tắt, reload trang $\rightarrow$ Simulator vẫn duy trì trạng thái bật (nhờ localStorage). Bấm phím tắt tắt đi, reload $\rightarrow$ vẫn ẩn.

---
*Tài liệu bàn giao nhiệm vụ chính thức dành cho đội ngũ Frontend dự án Pegaxus.*

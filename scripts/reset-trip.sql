-- ==============================================================================
-- PEGAXUS TRIP RESET SCRIPT (Phục vụ diễn tập và Demo bảo vệ đồ án SWP391)
-- ==============================================================================
-- Mục đích:
--   Khôi phục tức thì một chuyến vận chuyển (Transport) về trạng thái IN_TRANSIT
--   (hoặc READY), xóa bỏ các mốc thời gian hoàn thành chặng (ActualArrivalAt) do
--   Mock GPS Geofence đã kích hoạt trước đó, giúp diễn lại kịch bản mượt mà.
--
-- Cách dùng:
--   1. Mở pgAdmin / DBeaver / Navicat / VS Code Database Client.
--   2. Kết nối tới database Pegaxus PostgreSQL.
--   3. Thay đổi giá trị biến v_transport_code ở bên dưới nếu muốn reset mã khác.
--   4. Nhấn Execute (F5 / Ctrl+Enter). Toàn bộ chuyến đi được reset trong 0.1s!
-- ==============================================================================

DO $$
DECLARE
    -- ==========================================
    -- CẤU HÌNH RESET TẠI ĐÂY
    -- ==========================================
    -- Nhập mã chuyến đi cần reset (VD: 'TR-20261010-0005', 'TR-20261010-0004', hoặc mã bất kỳ)
    v_transport_code VARCHAR(50) := 'TR-20261010-0005';

    -- Mục tiêu trạng thái chuyến: 'IN_TRANSIT' hoặc 'READY'
    v_target_status VARCHAR(20) := 'IN_TRANSIT';

    -- Biến tạm
    v_transport_id UUID;
    v_route_plan_id UUID;
    v_first_segment_id UUID;
    v_segment_count INT := 0;
    v_handover_count INT := 0;
BEGIN
    -- 1. Tìm Transport theo mã
    SELECT transport_id INTO v_transport_id
    FROM "Transport"
    WHERE transport_code = v_transport_code;

    IF v_transport_id IS NULL THEN
        RAISE EXCEPTION '❌ Không tìm thấy chuyến đi có mã "%" trong bảng Transport!', v_transport_code;
    END IF;

    RAISE NOTICE '🚀 Bắt đầu khôi phục chuyến đi: % (ID: %)', v_transport_code, v_transport_id;

    -- 2. Cập nhật bảng "Transport"
    IF v_target_status = 'IN_TRANSIT' THEN
        UPDATE "Transport"
        SET
            status = 'IN_TRANSIT'::transport_status,
            actual_departure_at = NOW() - INTERVAL '15 minutes',
            actual_arrival_at = NULL,
            completed_at = NULL,
            cancelled_at = NULL,
            cancellation_reason = NULL,
            updated_at = NOW()
        WHERE transport_id = v_transport_id;
        RAISE NOTICE '  ✔ Bảng Transport: Đã đưa về IN_TRANSIT (Khởi hành cách đây 15 phút).';
    ELSE
        UPDATE "Transport"
        SET
            status = 'READY'::transport_status,
            actual_departure_at = NULL,
            actual_arrival_at = NULL,
            completed_at = NULL,
            cancelled_at = NULL,
            cancellation_reason = NULL,
            updated_at = NOW()
        WHERE transport_id = v_transport_id;
        RAISE NOTICE '  ✔ Bảng Transport: Đã đưa về READY (Sẵn sàng khởi hành).';
    END IF;

    -- 3. Tìm RoutePlan của Transport này
    SELECT rp.route_plan_id INTO v_route_plan_id
    FROM "RoutePlan" rp
    JOIN "TransportPlan" tp ON rp.transport_plan_id = tp.transport_plan_id
    WHERE tp.transport_id = v_transport_id
      AND rp.status IN ('CONFIRMED'::route_plan_status, 'ACTIVE'::route_plan_status, 'COMPLETED'::route_plan_status)
    ORDER BY rp.created_at DESC
    LIMIT 1;

    -- 4. Reset các chặng (RoutePlanRoute)
    IF v_route_plan_id IS NOT NULL THEN
        -- Tìm chặng đầu tiên
        SELECT route_plan_route_id INTO v_first_segment_id
        FROM "RoutePlanRoute"
        WHERE route_plan_id = v_route_plan_id
          AND superseded_at IS NULL
        ORDER BY sequence_no ASC
        LIMIT 1;

        -- Đếm số chặng
        SELECT COUNT(*) INTO v_segment_count
        FROM "RoutePlanRoute"
        WHERE route_plan_id = v_route_plan_id
          AND superseded_at IS NULL;

        IF v_target_status = 'IN_TRANSIT' THEN
            -- Chặng đầu tiên: Đặt là IN_TRANSIT, có giờ xuất phát, chưa có giờ đến
            UPDATE "RoutePlanRoute"
            SET
                status = 'IN_TRANSIT'::route_segment_status,
                actual_departure_at = NOW() - INTERVAL '15 minutes',
                actual_arrival_at = NULL,
                updated_at = NOW()
            WHERE route_plan_route_id = v_first_segment_id;

            -- Các chặng sau: Đặt về PLANNED, xóa toàn bộ giờ thực tế
            UPDATE "RoutePlanRoute"
            SET
                status = 'PLANNED'::route_segment_status,
                actual_departure_at = NULL,
                actual_arrival_at = NULL,
                updated_at = NOW()
            WHERE route_plan_id = v_route_plan_id
              AND route_plan_route_id <> v_first_segment_id
              AND superseded_at IS NULL;

            RAISE NOTICE '  ✔ Đã reset % chặng: Chặng 1 chuyển IN_TRANSIT, các chặng sau chuyển PLANNED.', v_segment_count;
        ELSE
            -- Nếu về READY: Toàn bộ chặng về PLANNED
            UPDATE "RoutePlanRoute"
            SET
                status = 'PLANNED'::route_segment_status,
                actual_departure_at = NULL,
                actual_arrival_at = NULL,
                updated_at = NOW()
            WHERE route_plan_id = v_route_plan_id
              AND superseded_at IS NULL;

            RAISE NOTICE '  ✔ Đã reset toàn bộ % chặng về PLANNED.', v_segment_count;
        END IF;
    ELSE
        RAISE NOTICE '  ℹ Chuyến đi chưa gắn RoutePlan nào (chỉ cập nhật bảng Transport).';
    END IF;

    -- 5. Xóa/Hủy các biên bản bàn giao (HandoverRecord) sinh ra trong lúc test
    SELECT COUNT(*) INTO v_handover_count
    FROM "HandoverRecord"
    WHERE transport_id = v_transport_id;

    IF v_handover_count > 0 THEN
        DELETE FROM "HandoverRecord"
        WHERE transport_id = v_transport_id;
        RAISE NOTICE '  ✔ Đã dọn dẹp % biên bản bàn giao phát sinh trong quá trình chạy thử.', v_handover_count;
    END IF;

    -- 6. Dọn dẹp sự cố test phát sinh (nếu có)
    DELETE FROM "IncidentReport"
    WHERE transport_id = v_transport_id
      AND description ILIKE '%test%';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '🎉 HOÀN TẤT RESET CHUYẾN ĐI [%] THÀNH CÔNG!', v_transport_code;
    RAISE NOTICE 'Bạn có thể mở ứng dụng Driver và Admin để bắt đầu demo lại ngay lập tức.';
    RAISE NOTICE '=======================================================';
END $$;

import { Link, useLocation } from "react-router-dom";
import { formatUtcDateTime } from "@/shared/utils/datetime";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { handoverPaths } from "@/features/handover/constants";
import { useTransportSegments } from "@/features/ongoing-transport/hooks/useTransportSegments";
import { isSameDriverBoundary } from "@/features/ongoing-transport/timeline";
import { useDriverLocationSession } from "../hooks/useDriverLocationSession";
import { driverLocationSharingPath } from "../navigation";
import { FEATURES } from "../features";
import { useSegmentArrival } from "../hooks/useSegmentArrival";

export function LocationWorkflowDialogs({
  transportId,
}: {
  transportId: string;
}) {
  const {
    state,
    gate,
    canStart,
    start,
    stop,
    dismissArrival,
    freshPosition,
    reload,
    source,
  } = useDriverLocationSession();
  const { pathname } = useLocation();
  const arrival = state.arrival;
  const {
    busy,
    failure,
    confirm: confirmArrival,
    close: dismiss,
  } = useSegmentArrival({
    transportId,
    arrival,
    locked: gate.locked,
    active: state.active,
    freshPosition,
    dismiss: dismissArrival,
    reload,
  });
  const segments = useTransportSegments(
    transportId,
    undefined,
    "crew",
    "data",
    source === "real" && Boolean(arrival?.handoverRequired),
  );
  const boundary =
    !segments.isError && !segments.isFetching
      ? segments.data?.handoverBoundaries.find(
          (item) =>
            item.boundaryNo === arrival?.boundaryNo &&
            item.fromRoutePlanRouteId === arrival.fromRoutePlanRouteId &&
            item.toRoutePlanRouteId === arrival.toRoutePlanRouteId,
        )
      : undefined;
  const record = boundary?.existingHandover ?? arrival?.existingHandover;
  const handoverLink =
    record && (record.status === "PLANNED" || record.status === "IN_PROGRESS")
      ? handoverPaths.record("crew", transportId, record.handoverRecordId)
      : !record &&
          boundary?.handoverRequired === true &&
          !isSameDriverBoundary(boundary, segments.data?.segments ?? []) &&
          boundary.canCreate &&
          boundary.createModes?.includes("START_NOW")
        ? handoverPaths.start("crew", transportId, {
            from: arrival?.fromRoutePlanRouteId,
            to: arrival?.toRoutePlanRouteId,
            handoverType:
              boundary.allowedHandoverTypes.length === 1
                ? boundary.allowedHandoverTypes[0]
                : undefined,
          })
        : null;
  if (gate.applicable && gate.locked && pathname !== "/crew")
    return (
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="rounded-xs"
        >
          <DialogHeader>
            <DialogTitle>Bật chia sẻ vị trí để bắt đầu chặng</DialogTitle>
            <DialogDescription>
              Chặng hiện tại cần vị trí của bạn. Chỉ mở khóa sau khi máy chủ trả
              accepted=true; quyền GPS hoặc ACK legacy chưa đủ.
            </DialogDescription>
          </DialogHeader>
          <p
            role={state.permissionStatus === "denied" ? "alert" : "status"}
            className={
              state.permissionStatus === "denied"
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {state.message ?? "Bấm bật chia sẻ vị trí khi xe đã đỗ an toàn."}
          </p>
          {state.notification !== "none" ? (
            <p className="text-sm" role="status">
              {state.notification === "notified"
                ? "Máy chủ đã thông báo điều phối viên."
                : state.notification === "sending"
                  ? "Đang báo quyền vị trí bị từ chối…"
                  : state.notification === "not_notified"
                    ? "Máy chủ không gửi thông báo mới."
                    : "Chưa xác nhận được thông báo cho điều phối viên."}
            </p>
          ) : null}
          <DialogFooter>
            {!pathname.endsWith("/location") ? (
              <Button asChild variant="outline">
                <Link to={driverLocationSharingPath(transportId)}>
                  Mở màn chia sẻ vị trí
                </Link>
              </Button>
            ) : null}
            <Button onClick={reload} variant="outline">
              Tải lại thông tin chặng
            </Button>
            {state.active ? (
              <Button onClick={stop} variant="outline">
                Dừng chia sẻ
              </Button>
            ) : (
              <Button disabled={!canStart} onClick={start}>
                Bật chia sẻ vị trí
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  return (
    <>
      {state.acceptance === "rejected" ? (
        <p
          role="status"
          className="mx-auto max-w-4xl px-4 py-3 text-sm text-muted-foreground"
        >
          {state.message}
        </p>
      ) : null}
      {gate.status === "waiting_current_segment" && source === "real" ? (
        <div
          className="mx-auto max-w-4xl px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          C9 đang chờ Backend xác nhận currentSegment.isMine. Chưa xác nhận đã
          mở khóa; vẫn có thể xem hành trình và mở màn chia sẻ vị trí.
        </div>
      ) : null}
      <Dialog
        open={Boolean(arrival)}
        onOpenChange={(open) => {
          if (!open) dismiss();
        }}
      >
        <DialogContent
          className="rounded-xs"
          showCloseButton={!busy}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {arrival?.handoverRequired ? "Điểm bàn giao" : "Cập nhật giờ đến"}
            </DialogTitle>
            <DialogDescription>
              Ranh giới {arrival?.boundaryNo} · {arrival?.location.locationName}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            {arrival?.handoverRequired
              ? "Cần biên bản bàn giao. GPS không xác nhận hoàn tất bàn giao hoặc ghi giờ chính thức."
              : `Giờ đến tạm do máy chủ ghi: ${arrival?.arrivalAt ? formatUtcDateTime(arrival.arrivalAt) : "Chưa có"}. Đóng cửa sổ sẽ giữ nguyên giờ máy chủ đã ghi.`}
          </p>
          {state.arrivalWarning ? (
            <p role="status" className="text-sm text-amber-800">
              Xe đang rời điểm đến ({state.arrivalWarning.distanceMeters} m).{" "}
              {state.arrivalWarning.secondsRemaining !== null
                ? `Ước tính còn ${state.arrivalWarning.secondsRemaining} giây trong bán kính.`
                : "Sẽ đóng khi ra khỏi bán kính cho phép."}
            </p>
          ) : null}
          {failure ? (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={dismiss}>
              Đóng
            </Button>
            {arrival?.handoverRequired ? (
              handoverLink ? (
                <Button asChild onClick={dismiss}>
                  <Link to={handoverLink}>
                    {record?.status === "PLANNED"
                      ? "Bắt đầu bàn giao"
                      : record?.status === "IN_PROGRESS"
                        ? "Mở biên bản"
                        : "Tạo biên bản"}
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" onClick={dismiss}>
                  <Link to={handoverPaths.list("crew", transportId)}>
                    Xem tab Handovers
                  </Link>
                </Button>
              )
            ) : (
              <Button
                disabled={
                  busy ||
                  !FEATURES.segmentArrival ||
                  !arrival?.fromRoutePlanRouteId ||
                  !arrival.toRoutePlanRouteId ||
                  !arrival.arrivalAt ||
                  !freshPosition()
                }
                onClick={() => void confirmArrival()}
              >
                {busy
                  ? "Đang xác nhận…"
                  : FEATURES.segmentArrival
                    ? "Xác nhận giờ đến"
                    : "HO7 chờ Backend triển khai"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

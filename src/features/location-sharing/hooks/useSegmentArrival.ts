import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { handoverPaths } from "@/features/handover/constants";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { FEATURES } from "../features";
import { getArrivalError, locationSharingService } from "../services";
import type { ArrivalBoundaryEvent, DriverLocationRequest } from "../types";

export function useSegmentArrival({
  transportId,
  arrival,
  locked,
  active,
  freshPosition,
  dismiss,
  reload,
}: {
  transportId: string;
  arrival: ArrivalBoundaryEvent | null;
  locked: boolean;
  active: boolean;
  freshPosition: () => DriverLocationRequest | null;
  dismiss: () => void;
  reload: () => void;
}) {
  const navigate = useNavigate();
  const key = arrival
    ? JSON.stringify([
        transportId,
        arrival.boundaryNo,
        arrival.fromRoutePlanRouteId,
        arrival.toRoutePlanRouteId,
      ])
    : null;
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<{
    key: string | null;
    controller: AbortController;
  } | null>(null);
  const [problem, setProblem] = useState<{
    key: string | null;
    message: string;
  } | null>(null);
  const mutation = useMutation({
    mutationKey: ["segment-arrival", transportId],
    mutationFn: ({
      segmentId,
      sample,
      controller,
    }: {
      segmentId: string;
      sample: DriverLocationRequest;
      controller: AbortController;
    }) =>
      locationSharingService.confirmArrival(
        transportId,
        segmentId,
        sample,
        controller.signal,
      ),
    retry: false,
    networkMode: "always",
    // Coordinates must not remain in the mutation cache after its observer leaves.
    gcTime: 0,
  });
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [key, locked],
  );
  useEffect(
    () =>
      useAuthStore.subscribe((auth, previous) => {
        if (
          !auth.accessToken ||
          auth.principal?.id !== previous.principal?.id ||
          auth.sessionVersion !== previous.sessionVersion ||
          !canAccess(auth.principal, { anyRole: ["DRIVER"] })
        )
          request.current?.abort();
      }),
    [],
  );
  const busy =
    key !== null && pending?.key === key && !pending.controller.signal.aborted;
  const close = () => {
    request.current?.abort();
    request.current = null;
    setPending(null);
    dismiss();
  };
  async function confirm() {
    if (
      request.current ||
      !arrival ||
      arrival.handoverRequired ||
      !arrival.fromRoutePlanRouteId ||
      !arrival.toRoutePlanRouteId ||
      !FEATURES.segmentArrival ||
      !active ||
      locked
    )
      return;
    const sample = freshPosition();
    if (!sample) {
      setProblem({
        key,
        message: "Đang chờ vị trí GPS mới. Không thể dùng điểm cũ để xác nhận.",
      });
      return;
    }
    const controller = new AbortController();
    const auth = useAuthStore.getState();
    const stillAuthorized = () => {
      const current = useAuthStore.getState();
      return (
        Boolean(current.accessToken) &&
        current.principal?.id === auth.principal?.id &&
        current.sessionVersion === auth.sessionVersion &&
        canAccess(current.principal, { anyRole: ["DRIVER"] })
      );
    };
    request.current = controller;
    setPending({ key, controller });
    setProblem(null);
    try {
      const result = await mutation.mutateAsync({
        segmentId: arrival.fromRoutePlanRouteId,
        sample,
        controller,
      });
      if (controller.signal.aborted || !stillAuthorized()) return;
      if (
        result.boundaryNo !== arrival.boundaryNo ||
        result.to.routePlanRouteId !== arrival.toRoutePlanRouteId
      )
        throw new Error("Arrival response does not match this boundary.");
      dismiss();
      toast.success("Đã cập nhật giờ đến theo xác nhận của máy chủ.");
      reload();
    } catch (error) {
      if (controller.signal.aborted || !stillAuthorized()) return;
      const failure = getArrivalError(error);
      if (
        [
          "ARRIVAL_LOCKED",
          "NOT_IN_ARRIVAL_RADIUS",
          "HANDOVER_REQUIRED",
        ].includes(failure.code ?? "")
      ) {
        dismiss();
        toast.info(
          failure.code === "ARRIVAL_LOCKED"
            ? "Giờ đến đã khóa. Giữ nguyên thời gian GPS do máy chủ ghi."
            : failure.code === "NOT_IN_ARRIVAL_RADIUS"
              ? "Xe không còn trong bán kính cho phép. Không cập nhật giờ đến."
              : "Ranh giới này cần biên bản. Tiếp tục tại tab Handovers.",
        );
        reload();
        if (failure.code === "HANDOVER_REQUIRED")
          navigate(handoverPaths.list("crew", transportId));
      } else
        setProblem({
          key,
          message: failure.network
            ? "Mất kết nối. Chưa xác nhận giờ đến; không tự gửi lại."
            : failure.message,
        });
    } finally {
      if (!request.current || request.current === controller) mutation.reset();
      if (request.current === controller) request.current = null;
      setPending((current) =>
        current?.controller === controller ? null : current,
      );
    }
  }
  return {
    busy,
    failure: problem?.key === key ? problem.message : null,
    confirm,
    close,
  };
}

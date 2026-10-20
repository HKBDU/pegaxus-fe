import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { locationSharingService } from "../services";
import type { AssignedLocationContext, LocationSharingState } from "../types";

export const LOCATION_ACCEPTANCE_MAX_AGE_MS = 60_000;

export function useAssignedDriverContext(real: boolean) {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  return useQuery({
    queryKey: ["driver-location-assignment", principal?.id, sessionVersion],
    queryFn: ({ signal }) => locationSharingService.assigned(signal),
    enabled: real && signedIn && canAccess(principal, { anyRole: ["DRIVER"] }),
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

export type LocationGateStatus =
  | "not_applicable"
  | "waiting_current_segment"
  | "requires_permission"
  | "starting"
  | "waiting_first_acceptance"
  | "active_fresh"
  | "stale"
  | "handed_over";

// The caller supplies OT2, never guessed ownership from OT3 or permission state.
export function useLocationGate({
  driver,
  assignment,
  state,
  start,
  observedSegmentId,
}: {
  driver: boolean;
  assignment: AssignedLocationContext | undefined;
  state: LocationSharingState;
  start: () => void;
  observedSegmentId?: string;
}) {
  const accountId = useAuthStore((auth) => auth.principal?.id);
  const sessionVersion = useAuthStore((auth) => auth.sessionVersion);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const segment = assignment?.currentSegment;
  const consistent =
    observedSegmentId === undefined ||
    observedSegmentId === segment?.routePlanRouteId;
  const applicable =
    driver &&
    state.acceptance !== "rejected" &&
    assignment?.myRole === "DRIVER" &&
    assignment.status === "IN_TRANSIT" &&
    segment?.isMine === true;
  const fresh =
    applicable &&
    consistent &&
    state.active &&
    state.acceptance === "accepted" &&
    state.acceptanceScope?.transportId === assignment?.transportId &&
    state.acceptanceScope?.accountId === accountId &&
    state.acceptanceScope?.sessionVersion === sessionVersion &&
    state.acceptedSegmentId === segment?.routePlanRouteId &&
    state.lastAcceptedAt !== null &&
    now >= state.lastAcceptedAt &&
    now - state.lastAcceptedAt < LOCATION_ACCEPTANCE_MAX_AGE_MS;
  const status: LocationGateStatus = !driver
    ? "not_applicable"
    : state.acceptance === "rejected"
      ? "handed_over"
      : !assignment ||
          !consistent ||
          (assignment.status === "IN_TRANSIT" &&
            (!segment || segment.isMine === undefined))
        ? "waiting_current_segment"
        : !applicable
          ? "not_applicable"
          : fresh
            ? "active_fresh"
            : state.permissionStatus === "denied" ||
                state.permissionStatus === "not_requested"
              ? "requires_permission"
              : state.active && state.acceptance === "accepted"
                ? "stale"
                : state.active && state.permissionStatus === "granted"
                  ? "waiting_first_acceptance"
                  : "starting";
  return {
    status,
    applicable,
    locked:
      driver &&
      (status === "waiting_current_segment" || (applicable && !fresh)),
    ownershipKnown: Boolean(
      assignment &&
      (assignment.status !== "IN_TRANSIT" ||
        typeof segment?.isMine === "boolean"),
    ),
    start,
  };
}

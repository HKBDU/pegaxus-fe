import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { LocationSender } from "../sender";
import type { DriverLocationSharingPageProps } from "../types";
import { useLocationSharingEnvironment } from "./useLocationSharingEnvironment";

export function useLocationSharing(props: DriverLocationSharingPageProps) {
  const [sender] = useState(() => new LocationSender());
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  const driver = canAccess(principal, { anyRole: ["DRIVER"] });
  const environment = useLocationSharingEnvironment();
  const eligible =
    signedIn &&
    driver &&
    props.source === "real" &&
    props.context.kind === "available" &&
    props.context.transport.transportId === props.transportId &&
    props.context.transport.status === "IN_TRANSIT";
  const revision =
    props.context.kind === "available"
      ? props.context.transport.serverTime
      : undefined;
  useLayoutEffect(() => {
    sender.configure({
      transportId: props.transportId,
      accountId: principal?.id,
      sessionVersion,
      eligible,
      revision,
      onReload: props.onReloadContext,
    });
  }, [
    sender,
    props.transportId,
    principal?.id,
    sessionVersion,
    eligible,
    revision,
    props.onReloadContext,
  ]);
  useLayoutEffect(() => sender.mount(), [sender]);
  const state = useSyncExternalStore(
    sender.subscribe,
    sender.getSnapshot,
    sender.getSnapshot,
  );
  return {
    state: { ...state, networkStatus: environment.network },
    environment,
    canStart:
      eligible &&
      !state.restartBlocked &&
      environment.network === "online" &&
      environment.capability === "available",
    start: sender.start,
    stop: sender.stop,
  };
}

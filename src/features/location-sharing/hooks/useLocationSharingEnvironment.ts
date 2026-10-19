import { useSyncExternalStore } from "react";
import type { LocationCapability, NetworkStatus } from "../types";

function subscribeNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getNetwork = (): NetworkStatus =>
  typeof navigator === "undefined"
    ? "unknown"
    : navigator.onLine
      ? "online"
      : "offline";
const getCapability = (): LocationCapability => {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return "unknown";
  if (!window.isSecureContext) return "insecure";
  // Presence detection only: do not request permission, inspect permission state or acquire coordinates.
  return "geolocation" in navigator ? "available" : "unsupported";
};
const subscribeCapability = () => () => {};

export function useLocationSharingEnvironment() {
  const network = useSyncExternalStore(
    subscribeNetwork,
    getNetwork,
    () => "unknown" as const,
  );
  const capability = useSyncExternalStore(
    subscribeCapability,
    getCapability,
    () => "unknown" as const,
  );
  return { network, capability };
}

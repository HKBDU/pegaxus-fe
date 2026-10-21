import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { isOngoingTransportMockMode } from "../source";

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const getVisibility = () =>
  typeof document !== "undefined" && document.visibilityState === "visible";
const subscribeOnline = (onChange: () => void) =>
  onlineManager.subscribe(onChange);
const getOnline = () => onlineManager.isOnline();

export function useTransportQueryContext(real = false) {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  const visible = useSyncExternalStore(
    subscribeVisibility,
    getVisibility,
    () => false,
  );
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  const mode = !real && isOngoingTransportMockMode() ? "mock" : "real";
  return {
    scope: [mode, principal?.id, principal?.roles, sessionVersion] as const,
    mode,
    enabled: signedIn && Boolean(principal?.id),
    visible,
    online,
  };
}

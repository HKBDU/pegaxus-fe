import { useSyncExternalStore } from "react";
import { onlineManager, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { getOngoingTransportError, ongoingTransportService } from "../services";
import { isOngoingTransportMockMode } from "../source";
import type { OverviewScenario, TransportAudience } from "../types";

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const getVisibility = () =>
  typeof document !== "undefined" && document.visibilityState === "visible";
const subscribeOnline = (onChange: () => void) =>
  onlineManager.subscribe(onChange);
const getOnline = () => onlineManager.isOnline();

export function useTransportOverview(
  transportId: string | undefined,
  bookingId: string | undefined,
  audience: TransportAudience,
  scenario: OverviewScenario,
) {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  const visible = useSyncExternalStore(
    subscribeVisibility,
    getVisibility,
    () => false,
  );
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  const mode = isOngoingTransportMockMode() ? "mock" : "real";
  const query = useQuery({
    queryKey: [
      "ongoing-transports",
      "overview",
      mode,
      principal?.id,
      principal?.roles,
      sessionVersion,
      audience,
      bookingId,
      transportId,
      mode === "mock" ? scenario : "data",
    ],
    queryFn: ({ signal }) =>
      ongoingTransportService.overview(
        transportId!,
        audience,
        scenario,
        signal,
      ),
    enabled: signedIn && Boolean(principal?.id) && transportId !== undefined,
    refetchInterval: visible ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    retry: (count, error) =>
      count < 1 && getOngoingTransportError(error, "overview").retryable,
  });
  return { ...query, online };
}

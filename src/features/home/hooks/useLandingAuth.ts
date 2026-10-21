import { useSyncExternalStore } from "react";
import { useAuthStore } from "@/features/auth/store";
import { getTransportCta } from "../lib/landing-navigation";

function subscribeHydration(listener: () => void) {
  const start = useAuthStore.persist.onHydrate(listener);
  const finish = useAuthStore.persist.onFinishHydration(listener);
  return () => {
    start();
    finish();
  };
}

export function useLandingAuth() {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
  const token = useAuthStore((state) => state.accessToken);
  const principal = useAuthStore((state) => state.principal);
  const user = useAuthStore((state) => state.user);
  const pending = !hydrated || Boolean(token && !principal);
  return {
    pending,
    guest: !pending && !token,
    cta: pending
      ? null
      : getTransportCta(
          Boolean(token && principal),
          principal?.roles ?? [],
          user?.role,
        ),
  };
}

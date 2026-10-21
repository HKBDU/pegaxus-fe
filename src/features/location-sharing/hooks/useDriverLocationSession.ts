import { createContext, useContext } from "react";
import type { useLocationSharing } from "./useLocationSharing";
import type { useLocationGate } from "./useLocationGate";
import type { DriverTransportReadState } from "../types";

export type DriverLocationSession = ReturnType<typeof useLocationSharing> & {
  gate: ReturnType<typeof useLocationGate>;
  context: DriverTransportReadState;
  source: "real" | "mock";
  reload: () => void;
};
export const DriverLocationSessionContext =
  createContext<DriverLocationSession | null>(null);
export function useDriverLocationSession() {
  const session = useContext(DriverLocationSessionContext);
  if (!session)
    throw new Error(
      "Driver location sharing requires the Crew transport session.",
    );
  return session;
}

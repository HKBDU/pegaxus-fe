import { useAssignedDriverContext } from "@/features/location-sharing/hooks/useLocationGate";

export function useAssignedTransports() {
  return useAssignedDriverContext(true, true);
}

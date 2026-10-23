import { create } from "zustand"

interface AlertsDrawerState {
  open: boolean
  setOpen: (open: boolean) => void
}

/** Open state of the alerts drawer, shared by the banner's "All alerts" button and the alert host. */
export const useAlertsDrawerStore = create<AlertsDrawerState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

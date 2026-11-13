import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useSyncExternalStore, useState } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  Radio,
  Wifi,
  WifiOff,
  Navigation,
  Gauge,
  Target,
  Repeat,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet"
import {
  demoActions,
  getDemoState,
  subscribeDemo,
  loadDemoPath,
  demoTotalMeters,
  DEMO_STOPS,
} from "./demo"

const SPEED_PRESETS = [
  { label: "60 km/h (Normal)", value: 60 },
  { label: "120 km/h (2x)", value: 120 },
  { label: "300 km/h (5x Fast)", value: 300 },
  { label: "600 km/h (10x Turbo)", value: 600 },
]

export default function DemoPanel() {
  const state = useSyncExternalStore(subscribeDemo, getDemoState)
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [totalDistance, setTotalDistance] = useState(0)

  useEffect(() => {
    let active = true
    void loadDemoPath().then((path) => {
      if (active) setTotalDistance(demoTotalMeters(path))
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["transport-tracking"] })
  }, [queryClient, state.phase, state.silent])

  const progressPercent = totalDistance > 0 ? Math.min(100, (state.distanceM / totalDistance) * 100) : 0

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
    return `${Math.round(meters)} m`
  }

  const fromName = DEMO_STOPS[0]?.name ?? "Origin"
  const toName = DEMO_STOPS.at(-1)?.name ?? "Destination"

  return (
    <>
      {/* 1. Unobtrusive Floating Trigger Button (Bottom-Right) */}
      <div className="fixed bottom-4 right-4 z-40 print:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-indigo-500/40 bg-background/95 px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-all hover:border-indigo-500 hover:bg-background"
          aria-label="Open GPS Simulator Controls"
        >
          <Radio className="size-3.5 animate-pulse text-indigo-500" />
          <span className="font-semibold">GPS Simulator</span>
          <Badge
            variant="default"
            className={`h-4.5 px-1.5 text-[9px] font-semibold text-white ${
              state.silent
                ? "bg-amber-600"
                : state.phase === "IN_TRANSIT"
                  ? state.isPaused
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                  : state.phase === "COMPLETED"
                    ? "bg-blue-600"
                    : "bg-slate-700"
            }`}
          >
            {state.silent
              ? `CUT (${state.signalLossSeconds}s)`
              : state.phase === "IN_TRANSIT"
                ? state.isPaused
                  ? "PAUSED"
                  : `${state.speedKmh} km/h`
                : state.phase}
          </Badge>
        </Button>
      </div>

      {/* 2. Slide-over Sheet Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto border-l border-border bg-background p-5 text-foreground"
        >
          <SheetHeader className="p-0 border-b border-border/60 pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xs bg-indigo-500/15 text-indigo-500">
                  <SlidersHorizontal className="size-4" />
                </span>
                <SheetTitle className="text-base font-bold">
                  Ongoing Transport GPS Simulator
                </SheetTitle>
              </div>
              <Badge
                variant="outline"
                className="border-indigo-500/40 bg-indigo-500/10 text-[10px] font-semibold text-indigo-500"
              >
                DEMO TOOLS
              </Badge>
            </div>
            <SheetDescription className="mt-1.5 text-xs text-muted-foreground">
              {fromName} → {toName} (
              {totalDistance > 0 ? formatDistance(totalDistance) : "Loading route..."}
              )
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4 text-xs">
            {/* Status indicator badge */}
            <div className="flex items-center justify-between rounded-xs border border-border p-3 bg-card">
              <div>
                <span className="font-semibold text-foreground">Simulation Status:</span>
                <p className="m-0 text-[11px] text-muted-foreground">
                  Controls live movement on MapLibre map
                </p>
              </div>
              <Badge
                variant="default"
                className={
                  state.silent
                    ? "bg-amber-600 text-white"
                    : state.phase === "IN_TRANSIT"
                      ? state.isPaused
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white"
                      : state.phase === "COMPLETED"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-white"
                }
              >
                {state.silent
                  ? `SIGNAL CUT (${state.signalLossSeconds}s)`
                  : state.phase === "IN_TRANSIT"
                    ? state.isPaused
                      ? "PAUSED"
                      : "IN TRANSIT"
                    : state.phase}
              </Badge>
            </div>

            {/* Progress Scrubber */}
            <div className="space-y-1.5 rounded-xs border border-border p-3 bg-card">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>
                  Progress: {progressPercent.toFixed(1)}% ({formatDistance(state.distanceM)})
                </span>
                <span>
                  Remaining: {formatDistance(Math.max(0, totalDistance - state.distanceM))}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progressPercent}
                onChange={(e) => void demoActions.seekRatio(Number(e.target.value) / 100)}
                disabled={totalDistance === 0}
                className="h-1.5 w-full cursor-pointer accent-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* Primary Controls Row */}
            <div className="flex flex-wrap items-center gap-2">
              {state.phase === "READY" ? (
                <Button
                  type="button"
                  size="sm"
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={demoActions.start}
                >
                  <Play className="mr-1.5 size-3.5" />
                  Start Trip
                </Button>
              ) : state.phase === "IN_TRANSIT" ? (
                state.isPaused ? (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={demoActions.resume}
                  >
                    <Play className="mr-1.5 size-3.5" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-600 text-white hover:bg-amber-700"
                    onClick={demoActions.pause}
                  >
                    <Pause className="mr-1.5 size-3.5" />
                    Pause
                  </Button>
                )
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={demoActions.reset}
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>

              <Button
                type="button"
                variant={state.loop ? "secondary" : "outline"}
                size="sm"
                onClick={() => demoActions.setLoop(!state.loop)}
              >
                <Repeat className="mr-1.5 size-3.5" />
                Loop: {state.loop ? "On" : "Off"}
              </Button>
            </div>

            {/* Speed Presets */}
            <div className="space-y-1.5 rounded-xs border border-border p-3 bg-card">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Gauge className="size-3 text-muted-foreground" />
                Simulation Speed:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPEED_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    size="sm"
                    variant={state.speedKmh === preset.value ? "default" : "outline"}
                    className={`h-7 px-2.5 text-[11px] ${
                      state.speedKmh === preset.value ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""
                    }`}
                    onClick={() => demoActions.setSpeed(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Committee Demo Test Scenarios */}
            <div className="space-y-2 rounded-xs border border-border p-3 bg-card">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Demo Test Scenarios
              </span>
              <div className="grid grid-cols-1 gap-2">
                {/* Scenario 1: Signal Loss */}
                <Button
                  type="button"
                  variant={state.silent ? "destructive" : "outline"}
                  size="sm"
                  disabled={state.phase !== "IN_TRANSIT"}
                  onClick={() => demoActions.setSilent(!state.silent)}
                  className="justify-start text-xs"
                >
                  {state.silent ? (
                    <>
                      <Wifi className="mr-1.5 size-3.5 animate-pulse text-white" />
                      Restore GPS Signal
                    </>
                  ) : (
                    <>
                      <WifiOff className="mr-1.5 size-3.5 text-amber-500" />
                      Simulate Signal Loss (Cut GPS)
                    </>
                  )}
                </Button>

                {/* Scenario 2: Geofence Jump */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void demoActions.jumpNearEnd(350)}
                  className="justify-start text-xs hover:border-emerald-500/50 hover:bg-emerald-500/10"
                >
                  <Target className="mr-1.5 size-3.5 text-emerald-500" />
                  Jump Near Station (350m to test Geofence)
                </Button>
              </div>

              {/* Signal Loss Explanation Box */}
              {state.silent ? (
                <div className="rounded-xs border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                  <p className="m-0 font-medium">
                    Signal Cut Duration: {state.signalLossSeconds}s
                  </p>
                  <p className="mt-1 mb-0 text-[10px] text-amber-600/90 dark:text-amber-300/80">
                    {state.signalLossSeconds < 30
                      ? "• Signal chip displays LIVE (< 30s elapsed)"
                      : state.signalLossSeconds <= 120
                        ? "• Signal chip displays DELAYED (amber warning badge, 30s - 2min)"
                        : "• Signal chip displays LOST (red alert) & dashed GapLayer appears on the map (> 2min)!"}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Live Telemetry HUD */}
            {state.lastSample ? (
              <div className="space-y-1 rounded-xs bg-slate-900 p-3 font-mono text-[11px] text-slate-300">
                <div className="flex items-center justify-between text-slate-400">
                  <span>LIVE TELEMETRY HUD</span>
                  <span className="text-emerald-400 font-semibold">
                    {state.phase === "IN_TRANSIT" && !state.isPaused ? `${state.speedKmh} km/h` : "0 km/h"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                  <div>
                    LAT: <strong className="text-white">{state.lastSample.latitude.toFixed(4)}</strong>
                  </div>
                  <div>
                    LON: <strong className="text-white">{state.lastSample.longitude.toFixed(4)}</strong>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation
                      className="size-3 text-indigo-400 transition-transform"
                      style={{ transform: `rotate(${state.lastSample.headingDegrees}deg)` }}
                    />
                    <span>{state.lastSample.headingDegrees}°</span>
                  </div>
                  <div className="text-slate-400 font-sans">
                    LEG: {state.lastSample.routePlanRouteId}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

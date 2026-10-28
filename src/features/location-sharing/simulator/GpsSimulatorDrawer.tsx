import { useState, useRef, type ChangeEvent } from "react";
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
  FileCode,
  Sparkles,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import {
  useGpsSimulator,
  type SegmentEndpoint,
} from "./useGpsSimulator";

export interface GpsSimulatorDrawerProps {
  currentSegment?: {
    fromLocation: SegmentEndpoint | null;
    toLocation: SegmentEndpoint | null;
    routePlanRouteId?: string;
  } | null;
  sharingActive?: boolean;
  onStartSharing?: () => void;
  /** Custom trigger element if the caller wants to provide their own */
  trigger?: React.ReactNode;
}

const SPEED_PRESETS = [
  { label: "60 km/h (Normal)", value: 60 },
  { label: "120 km/h (2x)", value: 120 },
  { label: "300 km/h (5x Fast)", value: 300 },
  { label: "600 km/h (10x Turbo)", value: 600 },
];

export function GpsSimulatorDrawer({
  currentSegment,
  sharingActive,
  onStartSharing,
  trigger,
}: GpsSimulatorDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showGeoJsonSection, setShowGeoJsonSection] = useState(false);
  const [customJsonText, setCustomJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulator = useGpsSimulator(
    currentSegment
      ? {
          fromLocation: currentSegment.fromLocation,
          toLocation: currentSegment.toLocation,
        }
      : undefined,
  );

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as unknown;
        const success = simulator.loadCustomGeoJson(parsed);
        if (success) {
          setShowGeoJsonSection(false);
          setJsonError(null);
        } else {
          setJsonError("File does not contain valid LineString coordinates.");
        }
      } catch {
        setJsonError("Invalid JSON file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleApplyCustomJson = () => {
    try {
      const parsed = JSON.parse(customJsonText) as unknown;
      const success = simulator.loadCustomGeoJson(parsed);
      if (success) {
        setShowGeoJsonSection(false);
        setJsonError(null);
      } else {
        setJsonError("No valid LineString or Feature coordinates found.");
      }
    } catch {
      setJsonError("Invalid JSON syntax.");
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  const fromName = currentSegment?.fromLocation?.locationName ?? "Origin";
  const toName = currentSegment?.toLocation?.locationName ?? "Destination";

  return (
    <>
      {/* 1. Unobtrusive Trigger Button (Floating or custom) */}
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
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
            {simulator.isEnabled ? (
              <Badge
                variant="default"
                className={`h-4.5 px-1.5 text-[9px] font-semibold text-white ${
                  simulator.isSignalLoss
                    ? "bg-amber-600"
                    : simulator.status === "running"
                      ? "bg-emerald-600"
                      : "bg-indigo-600"
                }`}
              >
                {simulator.isSignalLoss
                  ? `CUT (${simulator.signalLossSec}s)`
                  : simulator.status === "running"
                    ? `${simulator.speedKmh} km/h`
                    : "ARMED"}
              </Badge>
            ) : null}
          </Button>
        </div>
      )}

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
                  Driver GPS Simulator
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
              {simulator.totalDistance > 0
                ? formatDistance(simulator.totalDistance)
                : "Calculating route..."}
              )
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4 text-xs">
            {/* Master Switch */}
            <div className="flex items-center justify-between rounded-xs border border-indigo-500/30 bg-indigo-500/5 p-3">
              <div>
                <p className="m-0 font-semibold text-foreground">
                  Enable Mock GPS
                </p>
                <p className="m-0 text-[11px] text-muted-foreground">
                  Overrides browser Geolocation with simulated telemetry
                </p>
              </div>
              <Switch
                checked={simulator.isEnabled}
                onCheckedChange={simulator.toggleEnable}
                aria-label="Toggle Mock GPS"
              />
            </div>

            {/* Sharing status shortcut */}
            {onStartSharing && !sharingActive ? (
              <div className="flex items-center justify-between rounded-xs border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Driver sharing is stopped.
                </span>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
                  onClick={onStartSharing}
                >
                  Start Sharing
                </Button>
              </div>
            ) : null}

            {simulator.isEnabled ? (
              <>
                {/* Progress Scrubber */}
                <div className="space-y-1.5 rounded-xs border border-border p-3 bg-card">
                  <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                    <span>
                      Progress: {simulator.progressPercent}% (
                      {formatDistance(simulator.distanceTraveled)})
                    </span>
                    <span>
                      Remaining:{" "}
                      {formatDistance(
                        Math.max(
                          0,
                          simulator.totalDistance - simulator.distanceTraveled,
                        ),
                      )}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={simulator.progressPercent}
                    onChange={(e) => simulator.seek(Number(e.target.value))}
                    disabled={simulator.totalDistance === 0}
                    className="h-1.5 w-full cursor-pointer accent-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* Playback Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {simulator.status === "running" ? (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-amber-600 text-white hover:bg-amber-700"
                      onClick={simulator.pause}
                    >
                      <Pause className="mr-1.5 size-3.5" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={simulator.start}
                    >
                      <Play className="mr-1.5 size-3.5" />
                      {simulator.status === "paused"
                        ? "Resume"
                        : "Start Trip"}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={simulator.reset}
                  >
                    <RotateCcw className="mr-1.5 size-3.5" />
                    Reset
                  </Button>

                  <Button
                    type="button"
                    variant={simulator.loop ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => simulator.setLoop(!simulator.loop)}
                  >
                    <Repeat className="mr-1.5 size-3.5" />
                    Loop: {simulator.loop ? "On" : "Off"}
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
                        variant={
                          simulator.speedKmh === preset.value
                            ? "default"
                            : "outline"
                        }
                        className={`h-7 px-2.5 text-[11px] ${
                          simulator.speedKmh === preset.value
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : ""
                        }`}
                        onClick={() => simulator.setSpeedKmh(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Demo Test Scenarios */}
                <div className="space-y-2 rounded-xs border border-border p-3 bg-card">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Committee Test Scenarios
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Scenario 1: Signal Loss */}
                    <Button
                      type="button"
                      variant={simulator.isSignalLoss ? "destructive" : "outline"}
                      size="sm"
                      onClick={simulator.toggleSignalLoss}
                      className="justify-start text-xs"
                    >
                      {simulator.isSignalLoss ? (
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
                      onClick={() => simulator.jumpNearStation(350)}
                      className="justify-start text-xs hover:border-emerald-500/50 hover:bg-emerald-500/10"
                    >
                      <Target className="mr-1.5 size-3.5 text-emerald-500" />
                      Jump Near Station (350m to test Geofence)
                    </Button>
                  </div>

                  {/* Signal Loss Explanation Box */}
                  {simulator.isSignalLoss ? (
                    <div className="rounded-xs border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                      <p className="m-0 font-medium">
                        Signal Cut Duration: {simulator.signalLossSec}s
                      </p>
                      <p className="mt-1 mb-0 text-[10px] text-amber-600/90 dark:text-amber-300/80">
                        {simulator.signalLossSec < 30
                          ? "• Admin chip shows LIVE (<30s)"
                          : simulator.signalLossSec <= 120
                            ? "• Admin chip turns DELAYED (amber badge, 30s - 2min)"
                            : "• Admin chip turns LOST (red badge) & GapLayer renders on map (>2min)!"}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Telemetry HUD */}
                {simulator.currentPoint ? (
                  <div className="space-y-1 rounded-xs bg-slate-900 p-3 font-mono text-[11px] text-slate-300">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>LIVE TELEMETRY HUD</span>
                      <span className="text-emerald-400 font-semibold">
                        {simulator.status === "running"
                          ? `${simulator.speedKmh} km/h`
                          : "0 km/h"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                      <div>
                        LAT:{" "}
                        <strong className="text-white">
                          {simulator.currentPoint.latitude.toFixed(4)}
                        </strong>
                      </div>
                      <div>
                        LON:{" "}
                        <strong className="text-white">
                          {simulator.currentPoint.longitude.toFixed(4)}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <Navigation
                          className="size-3 text-indigo-400 transition-transform"
                          style={{
                            transform: `rotate(${simulator.currentPoint.heading}deg)`,
                          }}
                        />
                        <span>{simulator.currentPoint.heading}°</span>
                      </div>
                      <div className="text-slate-400">
                        ROUTE: {simulator.routeSource.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Collapsible GeoJSON Upload */}
                <div className="border-t border-border/60 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGeoJsonSection(!showGeoJsonSection)}
                    className="h-7 w-full justify-start p-0 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <FileCode className="mr-1.5 size-3" />
                    {showGeoJsonSection ? "Hide Custom GeoJSON" : "Load Custom GeoJSON Route"}
                  </Button>

                  {showGeoJsonSection ? (
                    <div className="mt-2 space-y-2 rounded-xs border border-border p-2.5">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".geojson,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs"
                        >
                          Upload .geojson
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleApplyCustomJson}
                          className="text-xs"
                        >
                          <Sparkles className="mr-1 size-3" />
                          Apply Paste
                        </Button>
                      </div>
                      <textarea
                        rows={3}
                        value={customJsonText}
                        onChange={(e) => setCustomJsonText(e.target.value)}
                        placeholder='Paste {"type": "LineString", "coordinates": [[lon, lat], ...]}'
                        className="w-full rounded-xs border border-input bg-background p-1.5 font-mono text-[10px]"
                      />
                      {jsonError ? (
                        <p className="m-0 text-[10px] text-destructive">
                          {jsonError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="rounded-xs border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                <Radio className="mx-auto mb-2 size-6 text-muted-foreground/60" />
                <p className="font-medium text-foreground">
                  Simulator is currently inactive
                </p>
                <p className="mt-1 text-[11px]">
                  Turn on <strong>Enable Mock GPS</strong> above to inject
                  simulated driving movement into this journey.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

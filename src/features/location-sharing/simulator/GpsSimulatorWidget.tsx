import { useState, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Radio,
  Wifi,
  WifiOff,
  Navigation,
  Gauge,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileCode,
  Sparkles,
  Target,
  Repeat,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import {
  useGpsSimulator,
  type SegmentEndpoint,
} from "./useGpsSimulator";

export interface GpsSimulatorWidgetProps {
  currentSegment?: {
    fromLocation: SegmentEndpoint | null;
    toLocation: SegmentEndpoint | null;
    routePlanRouteId?: string;
  } | null;
  sharingActive?: boolean;
  onStartSharing?: () => void;
  onMockGpsEnabled?: () => void;
  onMockGpsDisabled?: () => void;
}

const SPEED_PRESETS = [
  { label: "30 km/h", value: 30 },
  { label: "60 km/h (Normal)", value: 60 },
  { label: "120 km/h (2x)", value: 120 },
  { label: "300 km/h (5x Fast)", value: 300 },
  { label: "600 km/h (10x Turbo)", value: 600 },
];

export function GpsSimulatorWidget({
  currentSegment,
  sharingActive,
  onStartSharing,
  onMockGpsEnabled,
  onMockGpsDisabled,
}: GpsSimulatorWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showGeoJsonModal, setShowGeoJsonModal] = useState(false);
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

  const handleMockGpsChange = (enabled: boolean) => {
    if (enabled) {
      simulator.enableMockGps();
      onMockGpsEnabled?.();
    } else {
      simulator.disableMockGps();
      onMockGpsDisabled?.();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const success = simulator.loadCustomGeoJson(parsed);
        if (success) {
          setShowGeoJsonModal(false);
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
      const parsed = JSON.parse(customJsonText);
      const success = simulator.loadCustomGeoJson(parsed);
      if (success) {
        setShowGeoJsonModal(false);
        setJsonError(null);
      } else {
        setJsonError("No valid LineString or Feature coordinates found.");
      }
    } catch {
      setJsonError("Invalid JSON syntax.");
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <Card className="mt-4 border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-background to-background p-4 shadow-md transition-all sm:p-5">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xs bg-indigo-500/15 text-indigo-500">
            <Radio className="size-4 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-foreground">
                Driver GPS Simulator
              </span>
              <Badge
                variant="outline"
                className="border-indigo-500/40 bg-indigo-500/10 text-xs font-semibold text-indigo-400"
              >
                DEMO MODE
              </Badge>
              {simulator.isEnabled ? (
                <Badge
                  variant="default"
                  className={
                    simulator.isSignalLoss
                      ? "bg-amber-600 text-white"
                      : simulator.status === "running"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-white"
                  }
                >
                  {simulator.isSignalLoss
                    ? `Signal Lost (${simulator.signalLossSec}s)`
                    : simulator.status === "running"
                      ? "Running"
                      : "Ready"}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs text-muted-foreground">
                  Disabled
                </Badge>
              )}
            </div>
            <p className="mt-0.5 mb-0 text-xs text-muted-foreground">
              Simulate realistic vehicle movement along road network from laptop browser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {simulator.isEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={simulator.isEnabled}
              onCheckedChange={handleMockGpsChange}
              aria-label="Toggle Mock GPS Simulator"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          {/* Reminder if Driver GPS Sharing button isn't active yet */}
          {simulator.isEnabled && !sharingActive && onStartSharing ? (
            <div className="flex items-center justify-between rounded-xs border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="size-3.5" />
                Tip: Click &quot;Turn on GPS&quot; above to start transmitting coordinates to server.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-amber-500/40 bg-amber-500/20 text-xs font-semibold text-amber-900 hover:bg-amber-500/30 dark:text-amber-100"
                onClick={onStartSharing}
              >
                Start Sharing Now
              </Button>
            </div>
          ) : null}

          {/* Route Info & Source Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xs bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="size-3.5 shrink-0 text-indigo-400" />
              <span className="font-semibold text-foreground">Route:</span>
              <span className="truncate">
                {currentSegment?.fromLocation?.locationName ?? "Origin"}
                {" → "}
                {currentSegment?.toLocation?.locationName ?? "Destination"}
              </span>
              <Badge variant="outline" className="ml-1 text-[10px] uppercase">
                {simulator.routeSource}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                Total Distance: {formatDistance(simulator.totalDistance)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-indigo-400 hover:text-indigo-300"
                onClick={() => setShowGeoJsonModal(true)}
              >
                <FileCode className="mr-1 size-3" />
                Load GeoJSON
              </Button>
            </div>
          </div>

          {/* Progress Scrubbing Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">
                Traveled: {formatDistance(simulator.distanceTraveled)} (
                {simulator.progressPercent}%)
              </span>
              <span className="text-muted-foreground">
                Remaining:{" "}
                {formatDistance(
                  Math.max(0, simulator.totalDistance - simulator.distanceTraveled),
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
              disabled={!simulator.isEnabled || simulator.totalDistance === 0}
              className="h-2 w-full cursor-pointer accent-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Primary Controls Row: Play, Pause, Reset, Loop */}
          <div className="flex flex-wrap items-center gap-2">
            {simulator.status === "running" ? (
              <Button
                type="button"
                variant="default"
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
                variant="default"
                size="sm"
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={!simulator.isEnabled}
                onClick={simulator.start}
              >
                <Play className="mr-1.5 size-3.5" />
                Start Trip
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!simulator.isEnabled}
              onClick={simulator.reset}
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Reset to Start
            </Button>

            <Button
              type="button"
              variant={simulator.loop ? "secondary" : "outline"}
              size="sm"
              onClick={() => simulator.setLoop(!simulator.loop)}
              className="text-xs"
            >
              <Repeat className="mr-1.5 size-3.5" />
              Loop Route: {simulator.loop ? "Enabled" : "Disabled"}
            </Button>
          </div>

          {/* Speed Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Gauge className="size-3.5 text-muted-foreground" />
              Simulation Speed:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SPEED_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={
                    simulator.speedKmh === preset.value ? "default" : "outline"
                  }
                  className={`h-7 px-2.5 text-xs ${
                    simulator.speedKmh === preset.value
                      ? "bg-indigo-600 text-white"
                      : ""
                  }`}
                  onClick={() => simulator.setSpeedKmh(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Special Demo Scenarios */}
          <div className="space-y-2 rounded-xs border border-border/80 bg-background/60 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Test Scenarios
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Scenario 1: Signal Loss */}
              <Button
                type="button"
                variant={simulator.isSignalLoss ? "destructive" : "outline"}
                size="sm"
                disabled={!simulator.isEnabled}
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
                    Simulate Signal Loss
                  </>
                )}
              </Button>

              {/* Scenario 2: Jump to Station */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!simulator.isEnabled || simulator.totalDistance === 0}
                onClick={() => simulator.jumpNearStation(350)}
                className="justify-start text-xs hover:border-emerald-500/50 hover:bg-emerald-500/10"
              >
                <Target className="mr-1.5 size-3.5 text-emerald-500" />
                Jump Near Station (Test Geofence)
              </Button>
            </div>

            {/* Explanation badge when signal loss is active */}
            {simulator.isSignalLoss ? (
              <div className="mt-2 rounded-xs border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                <p className="m-0 font-medium">
                  📶 Signal Lost: {simulator.signalLossSec} seconds
                </p>
                <p className="mt-1 mb-0 text-[11px] text-amber-600/90 dark:text-amber-300/80">
                  {simulator.signalLossSec < 30
                    ? "• Coordinator status remains LIVE (< 30s elapsed)"
                    : simulator.signalLossSec <= 120
                      ? "• Coordinator status turns DELAYED (amber warning, 30s - 2min)"
                      : "• Coordinator status turns LOST (red alert) & dashed GapLayer appears (> 2min)!"}
                </p>
              </div>
            ) : null}
          </div>

          {/* Live GPS Telemetry HUD */}
          {simulator.currentPoint ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xs bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-300">
              <div className="flex items-center gap-3">
                <span>
                  LAT:{" "}
                  <strong className="text-white">
                    {simulator.currentPoint.latitude.toFixed(4)}
                  </strong>
                </span>
                <span>
                  LON:{" "}
                  <strong className="text-white">
                    {simulator.currentPoint.longitude.toFixed(4)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Navigation
                    className="size-3 text-indigo-400 transition-transform"
                    style={{
                      transform: `rotate(${simulator.currentPoint.heading}deg)`,
                    }}
                  />
                  {simulator.currentPoint.heading}°
                </span>
                <span className="text-emerald-400">
                  {simulator.status === "running" ? `${simulator.speedKmh} km/h` : "0 km/h"}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Modal / Dialog for Custom GeoJSON Input */}
      {showGeoJsonModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg space-y-4 border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-base font-semibold text-foreground">
                Load Custom GeoJSON Route
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowGeoJsonModal(false);
                  setJsonError(null);
                }}
              >
                ✕
              </Button>
            </div>

            <p className="m-0 text-xs text-muted-foreground">
              Upload a `.geojson` file (e.g. from geojson.io) or paste a LineString JSON below:
            </p>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.geojson"
                onChange={handleFileUpload}
                className="text-xs"
              />
              <textarea
                rows={6}
                value={customJsonText}
                onChange={(e) => setCustomJsonText(e.target.value)}
                placeholder='{"type": "LineString", "coordinates": [[106.66, 10.76], [106.67, 10.77]]}'
                className="w-full rounded-xs border border-border bg-background p-2 font-mono text-xs text-foreground focus:outline-hidden"
              />
              {jsonError ? (
                <p className="m-0 text-xs text-destructive">{jsonError}</p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowGeoJsonModal(false);
                  setJsonError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={handleApplyCustomJson}
              >
                Apply Route
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}

import { HANDOVER_GEOFENCE_METERS } from "../constants";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { distanceMeters, formatDistance } from "../utils";

interface Props {
  target: {
    latitude: number;
    longitude: number;
    name?: string;
    radiusMeters?: number;
  } | null;
  onValidityChange?: (valid: boolean) => void;
}

type State =
  | { kind: "idle" | "loading" }
  | { kind: "done"; meters: number; accuracy: number; near: boolean }
  | { kind: "error"; message: string };
const MAX_AGE_MS = 15_000;

/** One explicit position read, without starting a GPS watcher or storing device coordinates. */
export function LocationCheck({ target, onValidityChange }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const generation = useRef(0);
  const mounted = useRef(false);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latitude = target?.latitude;
  const longitude = target?.longitude;
  const radius = target?.radiusMeters ?? HANDOVER_GEOFENCE_METERS;

  useEffect(() => {
    mounted.current = true;
    const invalidate = () => {
      generation.current += 1;
      if (expiry.current) clearTimeout(expiry.current);
      expiry.current = null;
      onValidityChange?.(false);
      setState({ kind: "idle" });
    };
    invalidate();
    const visibility = () => {
      if (document.hidden) invalidate();
    };
    window.addEventListener("offline", invalidate);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted.current = false;
      generation.current += 1;
      if (expiry.current) clearTimeout(expiry.current);
      window.removeEventListener("offline", invalidate);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [latitude, longitude, radius, onValidityChange]);

  const check = () => {
    if (latitude == null || longitude == null || state.kind === "loading")
      return;
    const current = ++generation.current;
    if (expiry.current) clearTimeout(expiry.current);
    onValidityChange?.(false);
    if (!navigator.geolocation || !navigator.onLine || document.hidden) {
      setState({
        kind: "error",
        message:
          "Open this page online and allow location access to check your position.",
      });
      return;
    }
    setState({ kind: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current || current !== generation.current) return;
        const age = Date.now() - position.timestamp;
        const coords = position.coords;
        if (
          !navigator.onLine ||
          document.hidden ||
          !Number.isFinite(position.timestamp) ||
          age < 0 ||
          age >= MAX_AGE_MS ||
          !Number.isFinite(coords.latitude) ||
          !Number.isFinite(coords.longitude) ||
          Math.abs(coords.latitude) > 90 ||
          Math.abs(coords.longitude) > 180
        ) {
          setState({
            kind: "error",
            message:
              "Your position is no longer fresh. Check again before completing.",
          });
          return;
        }
        const meters = distanceMeters(coords, { latitude, longitude });
        const near = meters <= radius;
        setState({ kind: "done", meters, accuracy: coords.accuracy, near });
        onValidityChange?.(near);
        expiry.current = setTimeout(() => {
          if (!mounted.current || current !== generation.current) return;
          onValidityChange?.(false);
          setState({
            kind: "error",
            message: "Position check expired. Check again before completing.",
          });
        }, MAX_AGE_MS - age);
      },
      (error) => {
        if (!mounted.current || current !== generation.current) return;
        setState({
          kind: "error",
          message:
            error.code === 1
              ? "Allow location access to check your position."
              : "Could not read your position. Try again.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
    );
  };

  return (
    <section
      aria-label="Position check"
      className="rounded-[2px] border border-slate-300 bg-white p-3 sm:p-4"
    >
      <p className="font-heading text-xs font-semibold tracking-[0.06em] text-gray-800 uppercase">
        Handover point
      </p>
      <p className="text-sm text-gray-600">
        {target?.name ?? "The handover point will be verified when you submit."}
      </p>
      {target ? (
        <Button
          type="button"
          variant="outline"
          onClick={check}
          disabled={state.kind === "loading"}
          className="mt-3 min-h-12 gap-2 rounded-[2px] sm:min-h-9"
        >
          <LocateFixed aria-hidden="true" className="size-4" />
          {state.kind === "loading"
            ? "Locating…"
            : state.kind === "idle"
              ? "Check my position"
              : "Check again"}
        </Button>
      ) : null}
      {state.kind === "done" ? (
        <p role="status" className="mt-2 text-sm text-gray-700">
          {state.near
            ? `You are within the handover radius (about ${formatDistance(state.meters)} away).`
            : `You are about ${formatDistance(state.meters)} away, outside the ${radius} m handover radius.`}
          {state.accuracy > radius
            ? ` GPS accuracy is low (±${formatDistance(state.accuracy)}).`
            : ""}
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-gray-600">
        Completing requires location access and both signatures. Stay within{" "}
        {target?.radiusMeters ?? HANDOVER_GEOFENCE_METERS} m of the handover
        point. Completion time ends the previous leg and starts the next leg.
      </p>
    </section>
  );
}

import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, RefreshCw, TriangleAlert } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/common";
import { LocationSharingControl } from "../components/LocationSharingControl";
import {
  LocationSharingStatus,
  LocationPermissionGuidance,
} from "../components/LocationSharingDetails";
import { useLocationSharingEnvironment } from "../hooks/useLocationSharingEnvironment";
import { driverTransportOverviewPath } from "../navigation";
import type {
  DriverLocationSharingPageProps,
  LocationSharingState,
} from "../types";
import "../ui.css";

export default function DriverLocationSharingPage({
  transportId,
  context,
  refreshing,
  source,
  onReloadContext,
}: DriverLocationSharingPageProps) {
  const environment = useLocationSharingEnvironment();
  // No start/stop controller in Phase 1: network changes never turn sharing on.
  const state: LocationSharingState = {
    sharingStatus: "stopped",
    permissionStatus: "not_requested",
    networkStatus: environment.network,
    lastSuccessfulTransmissionAt: null,
  };
  const transport = context.kind === "available" ? context.transport : null;
  const statusLabel =
    transport?.status === "IN_TRANSIT"
      ? "In transit"
      : transport?.status === "READY"
        ? "Ready"
        : "Completed";
  const retryable =
    context.kind === "error"
      ? context.retryable
      : context.kind === "unavailable";
  return (
    <main className="location-sharing-ui px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full min-w-0 max-w-4xl space-y-4">
        <header>
          {transportId !== undefined ? (
            <Button
              asChild
              variant="ghost"
              className="mb-2 -ml-2 min-h-12 rounded-xs px-2 text-base"
            >
              <Link to={driverTransportOverviewPath(transportId)}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Transport Overview
              </Link>
            </Button>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mt-0 mb-1 font-medium text-slate-500">
                Driver workspace
              </p>
              <h1 className="location-sharing-title">Location Sharing</h1>
            </div>
            <Badge
              variant="outline"
              className="rounded-xs border-primary/30 bg-primary/10 text-slate-800"
            >
              Phase 1 · Preview
            </Badge>
          </div>
          <p className="mt-2 mb-0 leading-relaxed text-slate-600">
            Review your journey and prepare for browser-based location sharing.
          </p>
        </header>
        {source === "mock" ? (
          <div
            role="status"
            className="location-sharing-notice border-amber-200 bg-amber-50 text-amber-900"
          >
            MOCK DATA · Journey context uses the existing Flow 4 preview. Driver
            assignment is not verified against the backend. No GPS data is
            collected or sent.
          </div>
        ) : null}
        <section
          className="location-sharing-panel min-h-36"
          aria-label="Transport context"
          aria-busy={refreshing}
        >
          {context.kind === "loading" ? (
            <div
              aria-label="Loading transport information"
              className="space-y-3"
            >
              <Skeleton className="h-6 w-44 animate-none rounded-xs" />
              <Skeleton className="h-5 w-full animate-none rounded-xs" />
              <Skeleton className="h-5 w-3/4 animate-none rounded-xs" />
            </div>
          ) : transport ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="location-sharing-heading break-words">
                  {transport.transportCode}
                </h2>
                <Badge
                  variant="outline"
                  className={`rounded-xs ${transport.status === "IN_TRANSIT" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-300 bg-slate-50 text-slate-700"}`}
                >
                  {statusLabel}
                </Badge>
              </div>
              {transport.currentLeg ? (
                <p className="mt-3 mb-0 flex flex-wrap items-center gap-2 font-medium text-slate-800">
                  <span>
                    Leg {transport.currentLeg.displayOrder}:{" "}
                    {transport.currentLeg.from}
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                  <span className="sr-only">to</span>
                  <span>{transport.currentLeg.to}</span>
                </p>
              ) : (
                <p className="mt-3 mb-0 text-slate-600">
                  No current segment available.
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <span className="text-slate-500">
                  {context.kind === "available" && context.stale
                    ? "Cached journey context"
                    : "Journey context loaded"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={refreshing || environment.network === "offline"}
                  onClick={onReloadContext}
                  className="min-h-12 rounded-xs text-base"
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  {refreshing ? "Refreshing…" : "Refresh journey"}
                </Button>
              </div>
            </>
          ) : context.kind === "error" ? (
            <ErrorState
              message={context.message}
              onRetry={
                retryable && environment.network !== "offline"
                  ? onReloadContext
                  : undefined
              }
            />
          ) : (
            <div role="status">
              <p className="mt-0 mb-3 text-slate-700">
                {context.kind === "unavailable"
                  ? context.message
                  : "Transport information is missing."}
              </p>
              {retryable ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 rounded-xs text-base"
                  disabled={refreshing || environment.network === "offline"}
                  onClick={onReloadContext}
                >
                  Reload journey
                </Button>
              ) : null}
            </div>
          )}
        </section>
        {context.kind === "available" && context.stale ? (
          <div
            role="status"
            className="location-sharing-notice border-amber-200 bg-amber-50 text-amber-900"
          >
            Journey information was last loaded at{" "}
            {new Intl.DateTimeFormat(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(context.transport.serverTime))}
            . It is not live location data.
          </div>
        ) : null}
        {transport && transport.status !== "IN_TRANSIT" ? (
          <div
            role="status"
            className="location-sharing-notice border-amber-200 bg-amber-50 text-amber-900"
          >
            Location updates are only allowed while the transport is IN_TRANSIT.
            This journey is {statusLabel.toLowerCase()}; sharing remains
            unavailable.
          </div>
        ) : null}
        {environment.network === "offline" ? (
          <div
            role="status"
            className="location-sharing-notice border-amber-200 bg-amber-50 text-amber-900"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-1 size-4 shrink-0"
            />
            You are offline. No location is collected, queued or replayed.
          </div>
        ) : null}
        {environment.capability === "insecure" ||
        environment.capability === "unsupported" ? (
          <div
            role="status"
            className="location-sharing-notice border-amber-200 bg-amber-50 text-amber-900"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-1 size-4 shrink-0"
            />
            {environment.capability === "insecure"
              ? "This page is not in a secure browser context. Future location sharing requires HTTPS or a browser-trusted localhost context."
              : "This browser does not expose the Geolocation API. Future sharing requires a supported browser."}
          </div>
        ) : null}
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <LocationSharingControl />
          <LocationSharingStatus state={state} />
        </div>
        <LocationPermissionGuidance />
      </div>
    </main>
  );
}

import { AlertCircle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { MapLocation } from "@/shared/components/map";

type RoutePlanEndpointsStepProps = {
  from: MapLocation;
  to: MapLocation;
  returnMode?: boolean;
  locations?: MapLocation[];
  onFromChange?: (location: MapLocation) => void;
  onToChange?: (location: MapLocation) => void;
  isFromResolved?: boolean;
  isToResolved?: boolean;
  unresolvedOriginAddress?: string;
  unresolvedDestinationAddress?: string;
};

export function RoutePlanEndpointsStep({
  from,
  to,
  returnMode = false,
  locations = [],
  onFromChange,
  onToChange,
  isFromResolved = true,
  isToResolved = true,
  unresolvedOriginAddress,
  unresolvedDestinationAddress,
}: RoutePlanEndpointsStepProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {returnMode ? (
        <div className="rounded-[2px] border bg-card p-4">
          <label className="grid gap-2 text-sm font-semibold">
            Current location / return origin
            <Select
              value={String(from.id) === "unknown-location" ? "" : String(from.id)}
              onValueChange={(val) => {
                const location = locations.find((item) => String(item.id) === val);
                if (location) onFromChange?.(location);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-[2px] border bg-white px-3 font-normal *:data-[slot=select-value]:truncate">
                <SelectValue placeholder="Select current location" />
              </SelectTrigger>
              <SelectContent className="max-w-[420px] max-h-60 text-sm">
                {locations.map((location) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.name} — {location.city}, {location.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="font-normal text-muted-foreground">
              RC selects the location where the transport currently is.
            </span>
          </label>
        </div>
      ) : (
        <EndpointCard
          label="Origin"
          location={from}
          iconClassName="text-emerald-600"
          isResolved={isFromResolved}
          unresolvedAddress={unresolvedOriginAddress}
          locations={locations}
          onSelect={onFromChange}
        />
      )}
      <EndpointCard
        label="Destination"
        location={to}
        iconClassName="text-red-600"
        isResolved={isToResolved}
        unresolvedAddress={unresolvedDestinationAddress}
        locations={locations}
        onSelect={onToChange}
      />
      <p className="text-sm text-muted-foreground lg:col-span-2">
        {returnMode
          ? "Destination is the Transport Plan origin. Return origin is selected from existing locations."
          : "Origin and destination come from the approved Transport Plan. You can adjust the exact facility if needed."}
      </p>
    </div>
  );
}

function EndpointCard({
  label,
  location,
  iconClassName,
  isResolved = true,
  unresolvedAddress,
  locations = [],
  onSelect,
}: {
  label: string;
  location?: MapLocation | null;
  iconClassName: string;
  isResolved?: boolean;
  unresolvedAddress?: string;
  locations?: MapLocation[];
  onSelect?: (loc: MapLocation) => void;
}) {
  return (
    <Card className="rounded-[2px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-start gap-3">
          <MapPin className={`mt-1 size-5 shrink-0 ${iconClassName}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{location?.name ?? "Location not resolved"}</p>
            <p className="text-sm text-muted-foreground">
              {location ? `${location.city ?? ""}, ${location.country ?? ""}` : "No map coordinates found"}
            </p>
          </div>
        </div>

        {!isResolved && (
          <div className="rounded-[2px] border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="size-4 text-amber-600" />
              <span>Unmatched Booking Address</span>
            </div>
            {unresolvedAddress && (
              <p className="mt-1 text-muted-foreground">
                Original text: <span className="font-medium text-slate-800">{unresolvedAddress}</span>
              </p>
            )}
            <label className="mt-2 block">
              <span className="font-semibold text-slate-800">Select matching system location:</span>
              <Select
                value={location?.id ? String(location.id) : ""}
                onValueChange={(val) => {
                  const found = locations.find((item) => String(item.id) === val);
                  if (found) onSelect?.(found);
                }}
              >
                <SelectTrigger className="mt-1 h-9 w-full rounded-[2px] border border-slate-200 bg-white px-2 text-xs font-normal text-slate-900 *:data-[slot=select-value]:truncate">
                  <SelectValue placeholder="Select location from system" />
                </SelectTrigger>
                <SelectContent className="max-w-[420px] max-h-60 text-xs">
                  {locations.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)} className="text-xs">
                      {item.name} — {item.city}, {item.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { MapLocation } from "@/shared/components/map";

type RoutePlanEndpointsStepProps = {
  from: MapLocation;
  to: MapLocation;
  returnMode?: boolean;
  locations?: MapLocation[];
  onFromChange?: (location: MapLocation) => void;
};

export function RoutePlanEndpointsStep({
  from,
  to,
  returnMode = false,
  locations = [],
  onFromChange,
}: RoutePlanEndpointsStepProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {returnMode ? (
        <div className="rounded-[2px] border bg-card p-4">
          <label className="grid gap-2 text-sm font-semibold">
            Current location / return origin
            <select
              className="h-10 rounded border bg-white px-3 font-normal"
              value={String(from.id) === "unknown-location" ? "" : String(from.id)}
              onChange={(event) => {
                const location = locations.find(
                  (item) => String(item.id) === event.target.value,
                );
                if (location) onFromChange?.(location);
              }}
            >
              <option value="">Select current location</option>
              {locations.map((location) => (
                <option key={location.id} value={String(location.id)}>
                  {location.name} — {location.city}, {location.country}
                </option>
              ))}
            </select>
            <span className="font-normal text-muted-foreground">
              RC selects the location where the transport currently is.
            </span>
          </label>
        </div>
      ) : (
        <EndpointCard label="Origin" location={from} iconClassName="text-emerald-600" />
      )}
      <EndpointCard label="Destination" location={to} iconClassName="text-red-600" />
      <p className="text-sm text-muted-foreground lg:col-span-2">
        {returnMode
          ? "Destination is the Transport Plan origin. Return origin is selected from existing locations."
          : "Origin and destination come from the approved Transport Plan. They are display-only in this step."}
      </p>
    </div>
  );
}

function EndpointCard({
  label,
  location,
  iconClassName,
}: {
  label: string;
  location?: MapLocation | null;
  iconClassName: string;
}) {
  return (
    <Card className="rounded-[2px]">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <MapPin className={`mt-1 ${iconClassName}`} />
          <div>
            <p className="text-xl font-semibold">{location?.name ?? "Location not resolved"}</p>
            <p className="text-sm text-muted-foreground">
              {location ? `${location.city ?? ""}, ${location.country ?? ""}` : "No map coordinates found"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

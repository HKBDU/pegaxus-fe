import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import type {
  ReturnResourceOverride,
  SegmentResourceOptions,
} from "../../activation-resources";
import type { RouteSegment } from "../../types";

export function ReturnResourceSelection({
  segment,
  value,
  options,
  disabled,
  error,
  onChange,
}: {
  segment: RouteSegment;
  value?: ReturnResourceOverride;
  options?: SegmentResourceOptions;
  disabled: boolean;
  error?: string;
  onChange: (value: ReturnResourceOverride | undefined) => void;
}) {
  const id = `return-resources-${segment.routePlanRouteId}`;
  const mode = value?.outsourcing ? "provider" : value ? "vehicles" : "keep";
  const selected = value?.vehicleIds ?? [];
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-2 border-b border-slate-200 py-3 last:border-0 disabled:opacity-60"
    >
      <legend className="pt-2 text-xs font-semibold">
        Segment {segment.sequenceNo}: {segment.fromLocation.locationName} →{" "}
        {segment.toLocation.locationName}
      </legend>
      <p className="text-xs text-slate-500">
        {segment.route.transportMode} ·{" "}
        {segment.isOutsourced
          ? `Provider: ${segment.outsourcing?.provider.providerName ?? "Not provided"}`
          : `Vehicles: ${segment.vehicles.map((vehicle) => vehicle.licensePlate || vehicle.vehicleCode).join(", ") || "Not assigned"}`}
      </p>
      <Label htmlFor={id}>Resource choice</Label>
      <Select
        value={mode}
        disabled={disabled}
        onValueChange={(choice) =>
          onChange(
            choice === "keep"
              ? undefined
              : {
                  routePlanRouteId: segment.routePlanRouteId,
                  ...(choice === "provider"
                    ? {
                        outsourcing: {
                          transportProviderId: "",
                          note: undefined,
                        },
                      }
                    : { vehicleIds: [] }),
                },
          )
        }
      >
        <SelectTrigger
          id={id}
          className="h-9 w-full rounded-[2px]"
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="keep">Keep existing resources</SelectItem>
          {!segment.isOutsourced ? (
            <SelectItem
              value="vehicles"
              disabled={!options || Boolean(options.vehicleIssue)}
            >
              Choose vehicles
            </SelectItem>
          ) : null}
          <SelectItem
            value="provider"
            disabled={!options || Boolean(options.providerIssue)}
          >
            Choose transport provider
          </SelectItem>
        </SelectContent>
      </Select>
      {options?.vehicleIssue ? (
        <p className="text-xs text-slate-500">
          {options.vehicleIssue} You can still keep existing resources.
        </p>
      ) : null}
      {options?.providerIssue ? (
        <p role="alert" className="text-xs text-destructive">
          Provider choices unavailable: {options.providerIssue}
        </p>
      ) : null}
      {value?.outsourcing ? (
        <>
          <Label htmlFor={`${id}-provider`}>Transport provider</Label>
          <Select
            value={value.outsourcing?.transportProviderId || undefined}
            disabled={disabled}
            onValueChange={(transportProviderId) =>
              onChange({
                routePlanRouteId: segment.routePlanRouteId,
                outsourcing: {
                  transportProviderId,
                  note: value.outsourcing?.note,
                },
              })
            }
          >
            <SelectTrigger
              id={`${id}-provider`}
              className="h-9 w-full rounded-[2px]"
            >
              <SelectValue placeholder="Select an active provider" />
            </SelectTrigger>
            <SelectContent>
              {options?.providers.map((provider) => (
                <SelectItem
                  key={provider.transportProviderId}
                  value={provider.transportProviderId}
                >
                  {provider.providerName} ({provider.providerCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!options?.providers.length ? (
            <p className="text-xs text-slate-500">
              No eligible providers returned. Keep existing resources or reload.
            </p>
          ) : null}
          <Label htmlFor={`${id}-note`}>Provider note (optional)</Label>
          <Textarea
            id={`${id}-note`}
            maxLength={4000}
            value={value.outsourcing?.note ?? ""}
            onChange={(event) =>
              onChange({
                routePlanRouteId: segment.routePlanRouteId,
                outsourcing: {
                  transportProviderId:
                    value.outsourcing?.transportProviderId ?? "",
                  note: event.target.value,
                },
              })
            }
            className="min-h-16 rounded-[2px]"
          />
        </>
      ) : value ? (
        <div
          className="max-h-48 space-y-2 overflow-y-auto rounded-[2px] border p-3"
          role="group"
          aria-label={`Vehicle overrides for segment ${segment.sequenceNo}`}
        >
          {options?.vehicles.map((vehicle) => (
            <label
              key={vehicle.vehicleId}
              className="flex items-center gap-2 text-xs"
            >
              <Checkbox
                disabled={disabled}
                checked={selected.includes(vehicle.vehicleId)}
                onCheckedChange={(checked) =>
                  onChange({
                    routePlanRouteId: segment.routePlanRouteId,
                    vehicleIds:
                      checked === true
                        ? [...new Set([...selected, vehicle.vehicleId])]
                        : selected.filter(
                            (vehicleId) => vehicleId !== vehicle.vehicleId,
                          ),
                  })
                }
              />
              {vehicle.licensePlate || vehicle.vehicleCode} ·{" "}
              {vehicle.capacityHorses == null
                ? "Capacity unavailable"
                : `${vehicle.capacityHorses} horses`}
            </label>
          ))}
          {!options?.vehicles.length ? (
            <p className="text-xs text-slate-500">
              No eligible vehicles returned. Keep existing resources or reload.
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

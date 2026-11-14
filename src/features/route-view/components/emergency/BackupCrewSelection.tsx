import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DateTimeUtc } from "@/shared/components/DateTimeUtc";
import { toUtcIso } from "@/shared/utils/datetime";
import { personnelService } from "@/features/personnel/services";
import { getVehicles } from "@/features/route-plan/services";
import type {
  BackupCrewOverride,
  BackupCrewPlan,
  BackupCrewSegment,
} from "../../types";
import { effectiveCrew } from "../../backup-crew";

type Person = { employeeId: string; employeeCode?: string | null; fullName: string };
type VehicleOption = {
  vehicleId: string;
  vehicleCode: string;
  licensePlate?: string | null;
  capacityHorses?: number | null;
};

/** ISO instant to the value of a datetime-local input, in the viewer's time zone. */
function toLocalInput(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

const shiftIso = (iso: string, deltaMs: number) =>
  new Date(new Date(iso).getTime() + deltaMs).toISOString();

export function BackupCrewSelection({
  plan,
  transportPlanId,
  startAt,
  overrides,
  errors,
  disabled,
  onStartAtChange,
  onChange,
}: {
  plan: BackupCrewPlan;
  transportPlanId: string;
  startAt: string;
  overrides: Record<string, BackupCrewOverride>;
  errors: Record<string, string>;
  disabled: boolean;
  onStartAtChange: (value: string) => void;
  onChange: (routePlanRouteId: string, value: BackupCrewOverride) => void;
}) {
  const first = plan.segments[0]?.segment.plannedDepartureAt;
  const delta = first ? new Date(startAt).getTime() - new Date(first).getTime() : 0;
  const deltaMinutes = Math.round(delta / 60_000);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="backup-start-at">Backup start time *</Label>
        <Input
          id="backup-start-at"
          type="datetime-local"
          disabled={disabled}
          value={toLocalInput(startAt)}
          onChange={(event) => {
            const iso = toUtcIso(event.target.value);
            if (iso) onStartAtChange(iso);
          }}
          className="h-9 max-w-xs rounded-[2px]"
        />
        <p className="text-xs text-slate-500">
          UTC: <DateTimeUtc value={startAt} compact />.{" "}
          {deltaMinutes === 0
            ? "Backup segments keep their planned times."
            : `Every backup segment moves ${deltaMinutes > 0 ? "later" : "earlier"} by ${Math.floor(Math.abs(deltaMinutes) / 60)} h ${Math.abs(deltaMinutes) % 60} min. The committed arrival of the transport plan does not change.`}
        </p>
      </div>
      {plan.segments.map((item) => (
        <SegmentCrew
          key={item.segment.routePlanRouteId}
          item={item}
          transportPlanId={transportPlanId}
          deltaMs={delta}
          override={overrides[item.segment.routePlanRouteId]}
          error={errors[item.segment.routePlanRouteId]}
          disabled={disabled}
          onChange={(value) => onChange(item.segment.routePlanRouteId, value)}
        />
      ))}
    </div>
  );
}

function SegmentCrew({
  item,
  transportPlanId,
  deltaMs,
  override,
  error,
  disabled,
  onChange,
}: {
  item: BackupCrewSegment;
  transportPlanId: string;
  deltaMs: number;
  override?: BackupCrewOverride;
  error?: string;
  disabled: boolean;
  onChange: (value: BackupCrewOverride) => void;
}) {
  const { segment } = item;
  const id = `backup-crew-${segment.routePlanRouteId}`;
  const internal = segment.executionType === "INTERNAL";
  const from = shiftIso(segment.plannedDepartureAt, deltaMs);
  const to = shiftIso(segment.plannedArrivalAt, deltaMs);
  const crew = effectiveCrew(item, override);
  const slot = { segmentId: segment.routePlanRouteId, from, to, transportPlanId, enabled: internal };
  const drivers = useAssignablePeople("DRIVER", segment.driver, slot);
  const escorts = useAssignablePeople("ESCORT", segment.escort, slot);
  const vehicles = useQuery({
    queryKey: ["route-view", "backup-vehicles", segment.routePlanRouteId, from, to],
    queryFn: async () => {
      const page = await getVehicles({
        pageIndex: 1, pageSize: 100, transportMode: segment.route.transportMode,
        availableFrom: from.slice(0, 10), availableTo: to.slice(0, 10), transportPlanId,
      });
      const list = new Map<string, VehicleOption>(
        segment.vehicles.map((vehicle) => [vehicle.vehicleId, vehicle]),
      );
      for (const vehicle of page.items) list.set(vehicle.vehicleId, vehicle);
      return [...list.values()];
    },
    enabled: internal,
    retry: false,
  });
  const update = (patch: Partial<BackupCrewOverride>) =>
    onChange({ ...override, routePlanRouteId: segment.routePlanRouteId, ...patch });
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
        {segment.route.transportMode} · <DateTimeUtc value={from} compact /> →{" "}
        <DateTimeUtc value={to} compact /> ·{" "}
        {internal
          ? item.suggestedFromRoutePlanRouteId
            ? "Crew suggested from the PRIMARY route"
            : "No PRIMARY crew to take over"
          : `Outsourced to ${segment.outsourcing?.provider.providerName ?? "the provider"}: book it with them, no crew needed`}
      </p>
      {internal && (
        <div className="grid gap-3 sm:grid-cols-2">
          <PersonSelect
            id={`${id}-driver`}
            label="Driver *"
            value={crew.driverId}
            options={drivers.data}
            loading={drivers.isPending}
            failed={drivers.isError}
            disabled={disabled}
            onChange={(driverEmployeeId) => update({ driverEmployeeId })}
          />
          <PersonSelect
            id={`${id}-escort`}
            label="Escort *"
            value={crew.escortId}
            options={escorts.data}
            loading={escorts.isPending}
            failed={escorts.isError}
            disabled={disabled}
            onChange={(escortEmployeeId) => update({ escortEmployeeId })}
          />
          <div
            className="max-h-40 space-y-2 overflow-y-auto rounded-[2px] border p-3 sm:col-span-2"
            role="group"
            aria-label={`Vehicles for segment ${segment.sequenceNo}`}
          >
            {vehicles.isPending && <p className="text-xs text-slate-500">Loading vehicles…</p>}
            {vehicles.isError && (
              <p role="alert" className="text-xs text-destructive">Unable to load vehicles. Reload the page.</p>
            )}
            {vehicles.data?.map((vehicle) => (
              <label key={vehicle.vehicleId} className="flex items-center gap-2 text-xs">
                <Checkbox
                  disabled={disabled}
                  checked={crew.vehicleIds.includes(vehicle.vehicleId)}
                  onCheckedChange={(checked) =>
                    update({
                      vehicleIds:
                        checked === true
                          ? [...new Set([...crew.vehicleIds, vehicle.vehicleId])]
                          : crew.vehicleIds.filter((vehicleId) => vehicleId !== vehicle.vehicleId),
                    })
                  }
                />
                {vehicle.licensePlate || vehicle.vehicleCode} ·{" "}
                {vehicle.capacityHorses == null ? "Capacity unavailable" : `${vehicle.capacityHorses} horses`}
              </label>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Drivers or escorts free during the (shifted) segment slot. */
function useAssignablePeople(
  role: "DRIVER" | "ESCORT",
  suggested: Person | null | undefined,
  slot: { segmentId: string; from: string; to: string; transportPlanId: string; enabled: boolean },
) {
  return useQuery({
    queryKey: ["route-view", "backup-crew", role, slot.segmentId, slot.from, slot.to],
    queryFn: async () => {
      const page = await personnelService.assignable({
        role,
        availableFrom: slot.from,
        availableTo: slot.to,
        transportPlanId: slot.transportPlanId,
        pageSize: 100,
      });
      const list: Person[] = [...page.items];
      // The suggested person is shown even when busy elsewhere: the BE re-checks the schedule on approval.
      if (suggested && !list.some((person) => person.employeeId === suggested.employeeId))
        list.unshift(suggested);
      return list;
    },
    enabled: slot.enabled,
    retry: false,
  });
}

function PersonSelect({
  id,
  label,
  value,
  options,
  loading,
  failed,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  options?: Person[];
  loading: boolean;
  failed: boolean;
  disabled: boolean;
  onChange: (employeeId: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? undefined} disabled={disabled || loading || failed} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-9 w-full rounded-[2px]">
          <SelectValue placeholder={loading ? "Loading…" : failed ? "Unable to load" : "Select a person"} />
        </SelectTrigger>
        <SelectContent>
          {options?.map((person) => (
            <SelectItem key={person.employeeId} value={person.employeeId}>
              {person.fullName}
              {person.employeeCode ? ` (${person.employeeCode})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

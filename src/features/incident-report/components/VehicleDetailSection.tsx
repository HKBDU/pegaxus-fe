import { useState } from "react";

import {
  INCIDENT_ACTION,
  INCIDENT_ACTION_LABELS,
} from "@/shared/constants/incident";
import type {
  IncidentAction,
  IncidentMutationResponse,
  SupplementVehicleRequest,
  VehicleIncidentDetail,
} from "@/shared/types/incident";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { useIncidentMutations } from "../hooks/useIncidentMutations";

export interface VehicleDetailSectionProps {
  incidentReportId: string;
  detail: VehicleIncidentDetail;
  availableActions: IncidentAction[];
  onChanged?: (response: IncidentMutationResponse) => void;
}

export function VehicleDetailSection({
  incidentReportId,
  detail,
  availableActions,
  onChanged,
}: VehicleDetailSectionProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => ({
    vehicleCondition: detail.vehicleCondition ?? "",
    damageDescription: detail.damageDescription ?? "",
    repairNote: detail.repairNote ?? "",
    estimatedRepairCost:
      detail.estimatedRepairCost == null
        ? ""
        : String(detail.estimatedRepairCost),
    estimatedRepairHours:
      detail.estimatedRepairHours == null
        ? ""
        : String(detail.estimatedRepairHours),
    vehicleOperable: detail.vehicleOperable,
    repairRequired: detail.repairRequired,
    towingRequired: detail.towingRequired,
    replacementVehicleRequired: detail.replacementVehicleRequired,
  }));
  const mutation = useIncidentMutations().vehicleDetails;
  const canSupplement = availableActions.includes(
    INCIDENT_ACTION.SUPPLEMENT_VEHICLE,
  );
  const update = (field: keyof typeof value, next: string | boolean) =>
    setValue((current) => ({ ...current, [field]: next }));

  const submit = () => {
    const input: SupplementVehicleRequest = {
      lastUpdatedAt: detail.updatedAt,
      vehicleCondition: value.vehicleCondition || undefined,
      damageDescription: value.damageDescription || undefined,
      repairNote: value.repairNote || undefined,
      estimatedRepairCost: value.estimatedRepairCost
        ? Number(value.estimatedRepairCost)
        : undefined,
      estimatedRepairHours: value.estimatedRepairHours
        ? Number(value.estimatedRepairHours)
        : undefined,
      vehicleOperable: value.vehicleOperable,
      repairRequired: value.repairRequired,
      towingRequired: value.towingRequired,
      replacementVehicleRequired: value.replacementVehicleRequired,
    };
    mutation.mutate(
      { incidentReportId, input },
      {
        onSuccess: (response) => {
          setOpen(false);
          onChanged?.(response);
        },
      },
    );
  };

  return (
    <section
      className="space-y-4 border border-slate-200 bg-white p-4 sm:p-5"
      aria-label="Vehicle incident detail"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Vehicle detail
          </p>
          <h2 className="mt-1 font-heading text-lg font-bold text-[#181818]">
            {detail.vehicle.vehicleCode}
          </h2>
          <p className="text-sm text-slate-600">
            {detail.vehicle.licensePlate ?? "No license plate"}
          </p>
        </div>
        {canSupplement && (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-12 rounded-[2px] bg-[#f39200] text-[#181818] hover:bg-[#d97f00]"
          >
            {INCIDENT_ACTION_LABELS.SUPPLEMENT_VEHICLE}
          </Button>
        )}
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Incident type</dt>
          <dd className="font-semibold">{detail.incidentType}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Vehicle operable</dt>
          <dd className="font-semibold">
            {detail.vehicleOperable ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Repair required</dt>
          <dd className="font-semibold">
            {detail.repairRequired ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Damage</dt>
          <dd className="font-semibold">{detail.damageDescription ?? "—"}</dd>
        </div>
      </dl>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[2px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Supplement vehicle detail</DialogTitle>
            <DialogDescription>
              Update the vehicle information returned by the incident API.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              Vehicle condition
              <Input
                value={value.vehicleCondition}
                onChange={(event) =>
                  update("vehicleCondition", event.target.value)
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Damage description
              <Textarea
                value={value.damageDescription}
                onChange={(event) =>
                  update("damageDescription", event.target.value)
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Estimated cost
                <Input
                  type="number"
                  min="0"
                  value={value.estimatedRepairCost}
                  onChange={(event) =>
                    update("estimatedRepairCost", event.target.value)
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Repair hours
                <Input
                  type="number"
                  min="0"
                  value={value.estimatedRepairHours}
                  onChange={(event) =>
                    update("estimatedRepairHours", event.target.value)
                  }
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Repair note
              <Textarea
                value={value.repairNote}
                onChange={(event) => update("repairNote", event.target.value)}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  "vehicleOperable",
                  "repairRequired",
                  "towingRequired",
                  "replacementVehicleRequired",
                ] as const
              ).map((field) => (
                <label
                  key={field}
                  className="flex min-h-12 items-center gap-3 border border-slate-200 px-3 text-sm font-semibold"
                >
                  <Checkbox
                    checked={value[field]}
                    onCheckedChange={(checked) =>
                      update(field, checked === true)
                    }
                  />
                  <span>{field.replace(/([A-Z])/g, " $1")}</span>
                </label>
              ))}
            </div>
          </div>
          {mutation.error instanceof Error && (
            <p role="alert" className="text-sm text-red-600">
              {mutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending}
              onClick={submit}
              className="bg-[#f39200] text-[#181818] hover:bg-[#d97f00]"
            >
              {mutation.isPending ? "Saving…" : "Save detail"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

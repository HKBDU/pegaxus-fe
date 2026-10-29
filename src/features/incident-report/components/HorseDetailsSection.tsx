import { useState } from "react";

import {
  HORSE_INCIDENT_TYPE,
  HORSE_INCIDENT_TYPE_LABELS,
  INCIDENT_ACTION,
  INCIDENT_ACTION_LABELS,
} from "@/shared/constants/incident";
import type {
  HorseIncidentDetail,
  IncidentAction,
  IncidentMutationResponse,
} from "@/shared/types/incident";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DatePicker } from "@/shared/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { TimePicker } from "@/shared/components/ui/time-picker";
import { toUtcIso } from "@/shared/utils/datetime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { useIncidentMutations } from "../hooks/useIncidentMutations";

export interface HorseDetailsSectionProps {
  incidentReportId: string;
  details: HorseIncidentDetail[];
  availableActions: IncidentAction[];
  onChanged?: (response: IncidentMutationResponse) => void;
}

export function HorseDetailsSection({
  incidentReportId,
  details,
  availableActions,
  onChanged,
}: HorseDetailsSectionProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "follow-up">("follow-up");
  const [selectedHorseId, setSelectedHorseId] = useState(
    details[0]?.horse.horseId ?? "",
  );
  const [incidentType, setIncidentType] = useState<
    HorseIncidentDetail["incidentType"]
  >(HORSE_INCIDENT_TYPE.INJURY);
  const [conditionDescription, setConditionDescription] = useState("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [medicationGiven, setMedicationGiven] = useState("");
  const [veterinarianInstruction, setVeterinarianInstruction] = useState("");
  const [veterinarianContactedAt, setVeterinarianContactedAt] = useState("");
  const [horseTransportable, setHorseTransportable] = useState<boolean | null>(
    null,
  );
  const contactedDate = veterinarianContactedAt.split("T")[0] ?? "";
  const contactedTime =
    veterinarianContactedAt.split("T")[1]?.slice(0, 5) ?? "";
  const updateContactedDate = (date: string) =>
    setVeterinarianContactedAt(
      date ? `${date}T${contactedTime || "00:00"}` : "",
    );
  const updateContactedTime = (time: string) =>
    setVeterinarianContactedAt(
      time
        ? `${contactedDate}T${time}`
        : contactedDate
          ? `${contactedDate}T`
          : "",
    );
  const mutations = useIncidentMutations();
  const canAdd = availableActions.includes(INCIDENT_ACTION.ADD_HORSE_DETAIL);
  const canFollowUp = availableActions.includes(
    INCIDENT_ACTION.FOLLOW_UP_HORSE,
  );

  const openDialog = (nextMode: "add" | "follow-up", horseId?: string) => {
    setMode(nextMode);
    setSelectedHorseId(horseId ?? details[0]?.horse.horseId ?? "");
    setOpen(true);
  };

  const submit = () => {
    if (mode === "add") {
      mutations.horseDetails.mutate(
        {
          incidentReportId,
          input: {
            horses: [
              {
                horseId: selectedHorseId,
                incidentType,
                conditionDescription,
                veterinarianRequired: false,
              },
            ],
          },
        },
        {
          onSuccess: (response) => {
            setOpen(false);
            onChanged?.(response);
          },
        },
      );
      return;
    }
    const detail =
      details.find(
        (item) => item.horseHealthIncidentDetailId === selectedHorseId,
      ) ?? details.find((item) => item.horse.horseId === selectedHorseId);
    if (!detail) return;
    mutations.veterinaryOutcome.mutate(
      {
        incidentReportId,
        horseHealthIncidentDetailId: detail.horseHealthIncidentDetailId,
        input: {
          lastUpdatedAt: detail.updatedAt,
          outcomeNote: outcomeNote || undefined,
          medicationGiven: medicationGiven || undefined,
          veterinarianInstruction: veterinarianInstruction || undefined,
          veterinarianContactedAt: toUtcIso(veterinarianContactedAt),
          horseTransportable,
        },
      },
      {
        onSuccess: (response) => {
          setOpen(false);
          onChanged?.(response);
        },
      },
    );
  };

  return (
    <section className="space-y-4" aria-label="Horse incident details">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Horse details
          </p>
          <h2 className="mt-1 font-heading text-lg font-bold text-[#181818]">
            Health and veterinary follow-up
          </h2>
        </div>
        {canAdd && (
          <Button
            type="button"
            onClick={() => openDialog("add")}
            className="min-h-12 rounded-[2px] bg-[#f39200] text-[#181818] hover:bg-[#d97f00]"
          >
            {INCIDENT_ACTION_LABELS.ADD_HORSE_DETAIL}
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {details.map((detail) => (
          <article
            key={detail.horseHealthIncidentDetailId}
            className="space-y-3 border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-[#181818]">
                  {detail.horse.horseName}
                </h3>
                <p className="text-xs text-slate-500">
                  {detail.horse.microchipNumber ?? "No microchip"}
                </p>
              </div>
              {canFollowUp && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openDialog("follow-up", detail.horse.horseId)}
                  className="min-h-12 rounded-[2px]"
                >
                  {INCIDENT_ACTION_LABELS.FOLLOW_UP_HORSE}
                </Button>
              )}
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Incident type</dt>
                <dd className="font-semibold">{detail.incidentType}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Condition</dt>
                <dd className="font-semibold">{detail.conditionDescription}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Veterinarian</dt>
                <dd className="font-semibold">
                  {detail.veterinarianRequired ? "Required" : "Not required"}
                </dd>
              </div>
            </dl>
            {detail.vitalWarnings.length > 0 && (
              <ul className="space-y-1 border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
                {detail.vitalWarnings.map((warning) => (
                  <li key={warning}>⚠ {warning}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[2px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "add" ? "Add horse detail" : "Veterinary follow-up"}
            </DialogTitle>
            <DialogDescription>
              {mode === "add"
                ? "Add a horse detail returned by the available incident action."
                : "Update veterinary outcome with optimistic concurrency."}
            </DialogDescription>
          </DialogHeader>
          {mode === "add" ? (
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Horse
                <Select
                  value={selectedHorseId}
                  onValueChange={setSelectedHorseId}
                >
                  <SelectTrigger className="min-h-12 w-full">
                    <SelectValue placeholder="Select horse" />
                  </SelectTrigger>
                  <SelectContent>
                    {details.map((detail) => (
                      <SelectItem
                        key={detail.horse.horseId}
                        value={detail.horse.horseId}
                      >
                        {detail.horse.horseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Incident type
                <Select
                  value={incidentType}
                  onValueChange={(value) =>
                    setIncidentType(
                      value as HorseIncidentDetail["incidentType"],
                    )
                  }
                >
                  <SelectTrigger className="min-h-12 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(HORSE_INCIDENT_TYPE).map((type) => (
                      <SelectItem key={type} value={type}>
                        {HORSE_INCIDENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Condition description
                <Textarea
                  value={conditionDescription}
                  onChange={(event) =>
                    setConditionDescription(event.target.value)
                  }
                />
              </label>
            </div>
          ) : (
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Outcome note
                <Textarea
                  value={outcomeNote}
                  onChange={(event) => setOutcomeNote(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Medication given
                <Textarea
                  value={medicationGiven}
                  onChange={(event) => setMedicationGiven(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Veterinarian instruction
                <Textarea
                  value={veterinarianInstruction}
                  onChange={(event) =>
                    setVeterinarianInstruction(event.target.value)
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Contacted at
                <div className="@container grid min-w-0 gap-2 @min-[20rem]:grid-cols-[minmax(0,1fr)_9rem]">
                  <DatePicker
                    value={contactedDate}
                    onChange={updateContactedDate}
                    placeholder="DD / MM / YYYY"
                    className="h-9 rounded-[2px] text-sm"
                  />
                  <TimePicker
                    value={contactedTime}
                    onChange={updateContactedTime}
                    label="Veterinarian contacted time"
                    labelClassName="sr-only"
                    className="h-9 rounded-[2px] text-sm"
                  />
                </div>
              </label>
              <label className="flex min-h-12 items-center gap-3 border border-slate-200 px-3 text-sm font-semibold">
                <Checkbox
                  checked={horseTransportable === true}
                  onCheckedChange={(checked) =>
                    setHorseTransportable(checked === true ? true : null)
                  }
                />
                Horse is transportable
              </label>
            </div>
          )}
          {(mutations.horseDetails.error ??
            mutations.veterinaryOutcome.error) instanceof Error && (
            <p role="alert" className="text-sm text-red-600">
              {
                (
                  (mutations.horseDetails.error ??
                    mutations.veterinaryOutcome.error) as Error
                ).message
              }
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
              disabled={
                mutations.horseDetails.isPending ||
                mutations.veterinaryOutcome.isPending
              }
              onClick={submit}
              className="bg-[#f39200] text-[#181818] hover:bg-[#d97f00]"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

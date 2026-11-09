import { useState } from "react";
import { HeartPulse, Activity, Stethoscope, Thermometer, Wind } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/lib/utils";
import { DateTimeUtc } from "@/shared/components/DateTimeUtc";
import type { AuditHorseHealthLog, AuditHorseItem } from "../../types";
import { BlockCard, CopyValue, StatusPill } from "./block-utils";

type Tone = "success" | "warning" | "danger" | "neutral";

function getTempTone(temp: number): { tone: Tone; label: string } {
  if (temp < 37.5) return { tone: "warning", label: "Low temp" };
  if (temp <= 38.5) return { tone: "success", label: "Normal" };
  if (temp <= 39.0) return { tone: "warning", label: "Elevated" };
  return { tone: "danger", label: "Fever alert" };
}

const HEALTH_STATUS_TONES: Record<string, Tone> = {
  NORMAL: "success",
  OBSERVATION_REQUIRED: "warning",
  AT_RISK: "danger",
  CRITICAL: "danger",
};

const humanize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

const healthTone = (status: string): Tone =>
  HEALTH_STATUS_TONES[status] ?? "neutral";

const needsAttention = (log: AuditHorseHealthLog) =>
  log.healthStatus !== "NORMAL" ||
  log.veterinarianRequired ||
  (log.temperatureCelsius ?? 0) > 38.5;

const byCheckedAt = (a: AuditHorseHealthLog, b: AuditHorseHealthLog) =>
  a.checkedAt.localeCompare(b.checkedAt);

const formatMeasure = (value: number | null | undefined, unit: string) =>
  value == null ? "—" : `${value} ${unit}`;

function getLogNotes(log: AuditHorseHealthLog) {
  return [
    ["Symptoms", log.symptomNote],
    ["Injury", log.injuryNote],
    ["Treatment", log.treatmentProvided],
    ["Medication", log.medicationGiven],
    ["Veterinarian note", log.veterinarianNote],
    ["General note", log.generalNote],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
}

export function AuditHorsesBlock({ data }: { data?: AuditHorseItem[] }) {
  const horses = (data ?? []).map((horse) => ({
    ...horse,
    healthLogs: [...horse.healthLogs].sort(byCheckedAt),
  }));
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mode, setMode] = useState<"separated" | "table">("separated");

  if (!horses.length) {
    return <BlockCard title="Racehorses & Health Records" empty />;
  }

  const activeHorse = horses[selectedIdx] ?? horses[0];

  return (
    <div className="space-y-3.5">
      {/* View Switcher & Counter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-[#e5e2d9] bg-white px-3.5 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Transport Manifest: {horses.length} Racehorses
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 px-2.5 text-xs font-semibold rounded-[2px] transition-colors",
              mode === "separated"
                ? "bg-[#222834] text-[#f8fafc] shadow-xs hover:bg-[#2b3342] hover:text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            )}
            onClick={() => setMode("separated")}
          >
            Per-Horse Trajectory
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 px-2.5 text-xs font-semibold rounded-[2px] transition-colors",
              mode === "table"
                ? "bg-[#222834] text-[#f8fafc] shadow-xs hover:bg-[#2b3342] hover:text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            )}
            onClick={() => setMode("table")}
          >
            All Horses Manifest
          </Button>
        </div>
      </div>

      {mode === "separated" ? (
        <>
          {/* HORSE SELECTOR TABS */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {horses.map((horse, idx) => {
              const isSelected = idx === selectedIdx;
              const hasAlert = horse.healthLogs.some(needsAttention);

              return (
                <button
                  type="button"
                  key={horse.horseId}
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    "flex flex-col text-left p-3 rounded-[2px] border transition-all text-xs cursor-pointer",
                    isSelected
                      ? "border-[#f39200] bg-amber-500/[0.06] shadow-sm ring-1 ring-[#f39200]/50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 truncate">
                      {horse.name}
                    </span>
                    {hasAlert ? (
                      <span className="size-2 rounded-full bg-amber-500 shrink-0" title="Health checkpoint needs attention" />
                    ) : (
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" title="Health normal" />
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatMeasure(horse.weightKg, "kg")}</span>
                    <span>
                      {horse.healthLogs.length}{" "}
                      {horse.healthLogs.length === 1 ? "log" : "logs"}
                    </span>
                  </div>

                  <div className="mt-1.5 font-mono text-[10px] text-slate-400 truncate">
                    {horse.microchipNumber ? `#${horse.microchipNumber.slice(-8)}` : "—"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIVE HORSE DOSSIER & HEALTH CHECKPOINTS */}
          <BlockCard
            title={`Health Trajectory · ${activeHorse.name}`}
            headerExtra={
              <StatusPill
                status={`${activeHorse.healthLogs.length} Checkpoints recorded`}
                tone="brand"
                dot
              />
            }
          >
            {/* Quick Horse Identification Strip */}
            <div className="mb-4 grid gap-2.5 rounded-[2px] bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200/70 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Microchip</span>
                <div className="mt-0.5">
                  {activeHorse.microchipNumber ? <CopyValue value={activeHorse.microchipNumber} /> : "—"}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passport</span>
                <div className="mt-0.5">
                  {activeHorse.passportNumber ? <CopyValue value={activeHorse.passportNumber} /> : "—"}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight</span>
                <p className="mt-0.5 font-medium text-slate-800">
                  {formatMeasure(activeHorse.weightKg, "kg")}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Height</span>
                <p className="mt-0.5 font-medium text-slate-800">
                  {formatMeasure(activeHorse.heightCm, "cm")}
                </p>
              </div>
            </div>

            {/* Chronological Health Checkpoints for THIS Horse */}
            {!activeHorse.healthLogs.length ? (
              <p className="py-4 text-center text-xs text-slate-500">
                No health checkpoints recorded for this horse.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <HeartPulse className="size-3.5 text-[#f39200]" />
                    Health checkpoints log (chronological)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Normal baselines: Temp 37.5–38.5°C · Pulse 28–44 bpm · Resp 8–16 rpm
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeHorse.healthLogs.map((log, lIdx) => {
                    const temp =
                      log.temperatureCelsius == null
                        ? null
                        : getTempTone(log.temperatureCelsius);
                    const notes = getLogNotes(log);

                    return (
                      <div
                        key={log.healthLogId}
                        className={cn(
                          "rounded-[2px] border p-3 transition-colors text-xs",
                          needsAttention(log)
                            ? "border-rose-200 bg-rose-50/20"
                            : "border-slate-200 bg-white hover:bg-slate-50/50",
                        )}
                      >
                        {/* Checkpoint Type & Timestamp */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">
                              {lIdx + 1}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {humanize(log.logType)}
                            </span>
                            <span className="text-slate-300">•</span>
                            <DateTimeUtc value={log.checkedAt} className="text-slate-500" />
                          </div>

                          <div className="flex items-center gap-2">
                            {log.photoCount > 0 ? (
                              <span className="text-[11px] text-slate-500">
                                {log.photoCount} {log.photoCount === 1 ? "photo" : "photos"}
                              </span>
                            ) : null}
                            <StatusPill
                              status={humanize(log.healthStatus)}
                              tone={healthTone(log.healthStatus)}
                              dot
                            />
                          </div>
                        </div>

                        {/* Vital Metrics Grid */}
                        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="flex items-center gap-2 rounded-[2px] bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                            <Thermometer className="size-4 text-amber-600 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">Body Temp</p>
                              <p className="font-bold text-slate-800">
                                {formatMeasure(log.temperatureCelsius, "°C")}
                                {temp ? (
                                  <span className={cn("text-[10px] font-medium ml-1", temp.tone === "success" ? "text-emerald-600" : temp.tone === "danger" ? "text-rose-600" : "text-amber-600")}>
                                    ({temp.label})
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-[2px] bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                            <Activity className="size-4 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">Heart Rate</p>
                              <p className="font-bold text-slate-800">
                                {formatMeasure(log.heartRateBpm, "bpm")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-[2px] bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                            <Wind className="size-4 text-sky-600 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">Respiration</p>
                              <p className="font-bold text-slate-800">
                                {formatMeasure(log.respiratoryRateBpm, "rpm")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-[2px] bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                            <Stethoscope className="size-4 text-slate-600 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">Veterinarian</p>
                              <p className={cn("font-bold", log.veterinarianRequired ? "text-rose-700" : "text-slate-800")}>
                                {log.veterinarianRequired ? "Required" : "Not required"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Clinical Notes */}
                        {notes.length ? (
                          <dl className="mt-2 space-y-1 rounded-[2px] border border-amber-200/50 bg-amber-50/50 p-2 text-[11px] text-slate-600">
                            {notes.map(([label, value]) => (
                              <div key={label}>
                                <dt className="inline font-semibold text-slate-800">{label}: </dt>
                                <dd className="inline">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </BlockCard>
        </>
      ) : (
        /* ALL HORSES MANIFEST TABLE */
        <BlockCard title="Racehorse Manifest & Latest Health Check">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#fcfbf9]">
                <TableRow>
                  <TableHead className="text-xs">Horse Name</TableHead>
                  <TableHead className="text-xs">Microchip</TableHead>
                  <TableHead className="text-xs">Passport</TableHead>
                  <TableHead className="text-xs">Weight</TableHead>
                  <TableHead className="text-xs">Height</TableHead>
                  <TableHead className="text-xs">Latest Vitals</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {horses.map((horse) => {
                  const lastLog = horse.healthLogs[horse.healthLogs.length - 1];

                  return (
                    <TableRow key={horse.horseId}>
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {horse.name}
                      </TableCell>
                      <TableCell>
                        {horse.microchipNumber ? (
                          <CopyValue value={horse.microchipNumber} label={`Copy microchip ${horse.name}`} />
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {horse.passportNumber ? (
                          <CopyValue value={horse.passportNumber} label={`Copy passport ${horse.name}`} />
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatMeasure(horse.weightKg, "kg")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatMeasure(horse.heightCm, "cm")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {lastLog ? (
                          <span className="font-mono text-[11px]">
                            {formatMeasure(lastLog.temperatureCelsius, "°C")} · {formatMeasure(lastLog.heartRateBpm, "bpm")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {lastLog ? (
                          <StatusPill
                            status={humanize(lastLog.healthStatus)}
                            tone={healthTone(lastLog.healthStatus)}
                            dot
                          />
                        ) : (
                          <StatusPill status="No logs" tone="neutral" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </BlockCard>
      )}
    </div>
  );
}

import { useState } from "react";
import { HeartPulse, Activity, ShieldCheck, Thermometer, Wind } from "lucide-react";
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
import type { AuditHorsesData, AuditHorseItem } from "../../types";
import { BlockCard, CopyValue, StatusPill } from "./block-utils";

function getTempTone(temp: number): { tone: "success" | "warning" | "danger"; label: string } {
  if (temp < 37.5) return { tone: "warning", label: "Low temp" };
  if (temp <= 38.5) return { tone: "success", label: "Normal" };
  if (temp <= 39.0) return { tone: "warning", label: "Elevated" };
  return { tone: "danger", label: "Fever alert" };
}

function getStressTone(level: string): "success" | "warning" | "danger" | "neutral" {
  switch (level) {
    case "LOW":
    case "NORMAL":
      return "success";
    case "HIGH":
      return "warning";
    case "CRITICAL":
      return "danger";
    default:
      return "neutral";
  }
}

export function AuditHorsesBlock({ data }: { data?: AuditHorsesData }) {
  const horses = data?.horses ?? [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mode, setMode] = useState<"separated" | "table">("separated");

  if (!horses.length) {
    return <BlockCard title="Racehorses & Health Records" empty />;
  }

  const activeHorse: AuditHorseItem = horses[selectedIdx] ?? horses[0];

  return (
    <div className="space-y-3.5">
      {/* View Switcher & Counter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-[#e5e2d9] bg-white px-3.5 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Transport Manifest: {horses.length} Racehorses
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-500">
            Health checkpoints logged every 3–4 hours
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
          {/* HORSE SELECTOR TABS (2 to 9 horses) */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {horses.map((horse, idx) => {
              const isSelected = idx === selectedIdx;
              const hasAlert = horse.healthLogs.some((l) => l.isAbnormal || l.temperatureCelsius > 38.6 || l.stressLevel === "HIGH" || l.stressLevel === "CRITICAL");

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
                      {horse.horseName}
                    </span>
                    {hasAlert ? (
                      <span className="size-2 rounded-full bg-amber-500 shrink-0" title="Vital checkpoint warning" />
                    ) : (
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" title="Vitals normal" />
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{horse.breed || "Thoroughbred"}</span>
                    <span>{horse.healthLogs.length} logs</span>
                  </div>

                  <div className="mt-1.5 font-mono text-[10px] text-slate-400 truncate">
                    #{horse.microchipNumber.slice(-8)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ACTIVE HORSE DOSSIER & VITAL SIGNS TRAJECTORY */}
          <BlockCard
            title={`Health Trajectory · ${activeHorse.horseName}`}
            headerExtra={
              <div className="flex items-center gap-2">
                <StatusPill
                  status={`${activeHorse.healthLogs.length} Checkpoints recorded`}
                  tone="brand"
                  dot
                />
              </div>
            }
          >
            {/* Quick Horse Identification Strip */}
            <div className="mb-4 grid gap-2.5 rounded-[2px] bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200/70 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Microchip</span>
                <div className="mt-0.5"><CopyValue value={activeHorse.microchipNumber} /></div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passport</span>
                <div className="mt-0.5"><CopyValue value={activeHorse.passportNumber} /></div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Breed & Gender</span>
                <p className="mt-0.5 font-medium text-slate-800">
                  {activeHorse.breed ?? "Thoroughbred"} {activeHorse.gender ? `• ${activeHorse.gender}` : ""}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight & Value</span>
                <p className="mt-0.5 font-medium text-slate-800">
                  {activeHorse.weightKg ? `${activeHorse.weightKg} kg` : "—"}{" "}
                  {activeHorse.declaredValue ? `• ${activeHorse.declaredValue.toLocaleString()} VND` : ""}
                </p>
              </div>
            </div>

            {/* Chronological Health Checkpoints for THIS Horse */}
            {!activeHorse.healthLogs.length ? (
              <p className="py-4 text-center text-xs text-slate-500">
                No vital sign checkpoints recorded for this horse yet.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <HeartPulse className="size-3.5 text-[#f39200]" />
                    Vital checkpoints log (chronological)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Normal baselines: Temp 37.5–38.5°C · Pulse 28–44 bpm · Resp 8–16 rpm
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeHorse.healthLogs.map((log, lIdx) => {
                    const temp = getTempTone(log.temperatureCelsius);
                    const stressTone = getStressTone(log.stressLevel);

                    return (
                      <div
                        key={log.logId}
                        className={cn(
                          "rounded-[2px] border p-3 transition-colors text-xs",
                          log.isAbnormal || temp.tone === "danger"
                            ? "border-rose-200 bg-rose-50/20"
                            : "border-slate-200 bg-white hover:bg-slate-50/50",
                        )}
                      >
                        {/* Checkpoint Location & Timestamp */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">
                              {lIdx + 1}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {log.locationName || "Transit Checkpoint"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">
                              {log.recordedAt ? new Date(log.recordedAt).toLocaleString() : "—"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                              Vet: {log.veterinarianName || "Attending Groom"}
                            </span>
                            <StatusPill status={`Stress: ${log.stressLevel}`} tone={stressTone} dot />
                          </div>
                        </div>

                        {/* 4 Vital Metrics Grid */}
                        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="flex items-center gap-2 rounded-[2px] bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                            <Thermometer className="size-4 text-amber-600 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">Body Temp</p>
                              <p className="font-bold text-slate-800">
                                {log.temperatureCelsius}°C{" "}
                                <span className={cn("text-[10px] font-medium ml-1", temp.tone === "success" ? "text-emerald-600" : temp.tone === "danger" ? "text-rose-600" : "text-amber-600")}>
                                  ({temp.label})
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-[2px] bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                            <Activity className="size-4 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">Heart Rate</p>
                              <p className="font-bold text-slate-800">
                                {log.heartRateBpm} bpm
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-[2px] bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                            <Wind className="size-4 text-sky-600 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">Respiration</p>
                              <p className="font-bold text-slate-800">
                                {log.respirationRate ? `${log.respirationRate} rpm` : "12 rpm"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-[2px] bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                            <ShieldCheck className="size-4 text-slate-600 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400">Hydration & Tone</p>
                              <p className="font-bold text-slate-800">
                                {log.isAbnormal ? "Attention needed" : "Hydrated / Active"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Clinical Vet Note */}
                        {log.notes ? (
                          <div className="mt-2 text-[11px] text-slate-600 bg-amber-50/50 rounded-[2px] p-2 border border-amber-200/50">
                            <span className="font-semibold text-slate-800">Clinical notes: </span>
                            {log.notes}
                          </div>
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
        <BlockCard title="Racehorse Manifest & Latest Vitals">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#fcfbf9]">
                <TableRow>
                  <TableHead className="text-xs">Horse Name</TableHead>
                  <TableHead className="text-xs">Microchip</TableHead>
                  <TableHead className="text-xs">Passport</TableHead>
                  <TableHead className="text-xs">Breed & Gender</TableHead>
                  <TableHead className="text-xs">Weight</TableHead>
                  <TableHead className="text-xs">Latest Vitals</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {horses.map((horse) => {
                  const lastLog = horse.healthLogs[horse.healthLogs.length - 1];
                  const temp = lastLog ? getTempTone(lastLog.temperatureCelsius) : null;

                  return (
                    <TableRow key={horse.horseId}>
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {horse.horseName}
                      </TableCell>
                      <TableCell>
                        <CopyValue value={horse.microchipNumber} label={`Copy microchip ${horse.horseName}`} />
                      </TableCell>
                      <TableCell>
                        <CopyValue value={horse.passportNumber} label={`Copy passport ${horse.horseName}`} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {horse.breed ?? "Thoroughbred"} {horse.gender ? `(${horse.gender})` : ""}
                      </TableCell>
                      <TableCell className="text-xs">
                        {horse.weightKg ? `${horse.weightKg} kg` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {lastLog ? (
                          <span className="font-mono text-[11px]">
                            {lastLog.temperatureCelsius}°C · {lastLog.heartRateBpm} bpm
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {lastLog ? (
                          <StatusPill
                            status={temp?.label || "Normal"}
                            tone={temp?.tone || "success"}
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


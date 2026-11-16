import type { RoutePlanDetail, RouteSegment } from "./types";

/** BR-036: a delay of at least this many minutes against the PRIMARY arrival needs the LM's approval on its own. */
export const BACKUP_DELAY_THRESHOLD_MINUTES = 60;
/** Past this gap between the real and the planned departure, the progress estimate says nothing about the planned delay. */
export const OFF_PLAN_THRESHOLD_MINUTES = 24 * 60;

export type BackupEtaSuggestion = {
  /** Planned arrival of the last PRIMARY segment; BE measures the delay against it. */
  primaryEta: Date;
  suggestedEta: Date;
  /** AHEAD: the convoy drives on to the branch point. BEHIND: it turns back to a branch point already passed. */
  mode: "AHEAD" | "BEHIND";
  branchName: string;
  /** Real minus planned departure of the latest departed segment: negative when the trip runs ahead of its plan. */
  offPlanMinutes: number;
  /** The earliest arrival whose delay against the planned PRIMARY arrival needs the LM on its own (BR-036). */
  minimumDelayEta: Date;
};

const ms = (value: string | null | undefined) => {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? null : time;
};
const bySequence = (segments: readonly RouteSegment[]) =>
  [...segments].sort((a, b) => a.sequenceNo - b.sequenceNo);

/** Planned time from the first to the last segment, dwell included; falls back to the measured durations. */
function plannedSpan(segments: readonly RouteSegment[]) {
  const start = ms(segments[0]?.plannedDepartureAt);
  const end = ms(segments[segments.length - 1]?.plannedArrivalAt);
  if (start !== null && end !== null && end >= start) return end - start;
  let minutes = 0;
  for (const [index, segment] of segments.entries()) {
    const duration = segment.route.estimatedDurationMinutes;
    if (duration === null) return null;
    minutes += duration + (index < segments.length - 1 ? (segment.dwellAfterMinutes ?? 0) : 0);
  }
  return minutes * 60_000;
}

/**
 * Suggests the arrival at the destination if the convoy switches to this backup now. It picks the branch point like BE
 * (the nearest one ahead, else the nearest one behind), estimates when the convoy reaches it, then adds the planned
 * duration of the backup from there. It is only a starting value: the RC can still change it.
 */
export function suggestBackupArrival(
  primary: RoutePlanDetail,
  backup: RoutePlanDetail,
  now = new Date(),
): BackupEtaSuggestion | null {
  const journey = bySequence(primary.segments);
  const route = bySequence(backup.segments);
  const primaryEta = ms(journey[journey.length - 1]?.plannedArrivalAt);
  if (primaryEta === null) return null;

  const firstBackup = route.findIndex((segment) => segment.routeType === "BACKUP");
  if (firstBackup < 0) return null;
  const stops = new Set(journey.map((segment) => segment.fromLocation.locationId));
  const branches = route
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment, index }) => index >= firstBackup && segment.routeType === "BACKUP" && stops.has(segment.fromLocation.locationId));
  const stopOf = (locationId: string, departed: boolean) =>
    journey.findIndex((segment) => Boolean(segment.actualDepartureAt) === departed && segment.fromLocation.locationId === locationId);

  const running = journey.find((segment) => segment.actualDepartureAt && !segment.actualArrivalAt);
  const departed = running ?? journey.filter((segment) => segment.actualDepartureAt).at(-1);
  const realStart = ms(departed?.actualDepartureAt);
  const plannedStart = ms(departed?.plannedDepartureAt);
  const offPlanMinutes = realStart !== null && plannedStart !== null ? Math.round((realStart - plannedStart) / 60_000) : 0;
  // How late the running segment left; the stops still ahead are assumed to slip by the same amount.
  const left = ms(running?.actualDepartureAt);
  const due = ms(running?.plannedDepartureAt);
  const slip = left !== null && due !== null ? Math.max(0, left - due) : 0;
  const nowMs = now.getTime();

  const ahead = branches
    .map((branch) => ({ ...branch, stop: stopOf(branch.segment.fromLocation.locationId, false) }))
    .filter((branch) => branch.stop >= 0)
    .sort((a, b) => a.stop - b.stop)[0];
  let mode: BackupEtaSuggestion["mode"];
  let branch: (typeof branches)[number];
  let startAt: number;
  if (ahead) {
    const planned = ms(journey[ahead.stop].plannedDepartureAt);
    mode = "AHEAD";
    branch = ahead;
    startAt = Math.max(nowMs, planned === null ? nowMs : planned + slip);
  } else {
    const behind = branches
      .map((item) => ({ ...item, stop: stopOf(item.segment.fromLocation.locationId, true) }))
      .filter((item) => item.stop >= 0)
      .sort((a, b) => b.stop - a.stop)[0];
    if (!behind) return null;
    // Driving back takes about as long as the convoy has driven since it left the branch point.
    const leftBranch = ms(journey[behind.stop].actualDepartureAt) ?? nowMs;
    mode = "BEHIND";
    branch = behind;
    startAt = nowMs + Math.max(0, nowMs - leftBranch);
  }

  const span = plannedSpan(route.slice(branch.index));
  if (span === null) return null;
  const step = 5 * 60_000;
  const minute = 60_000;
  return {
    primaryEta: new Date(primaryEta),
    suggestedEta: new Date(Math.ceil((startAt + span) / step) * step),
    mode,
    branchName: branch.segment.fromLocation.locationName,
    offPlanMinutes,
    minimumDelayEta: new Date(Math.ceil((primaryEta + BACKUP_DELAY_THRESHOLD_MINUTES * minute) / minute) * minute),
  };
}

/** Formats a date as a datetime-local value in the viewer's time zone. */
export function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Minutes of delay against the PRIMARY arrival, or null when the entered value is not a valid date. */
export function delayMinutes(localValue: string, primaryEta: Date) {
  const value = ms(localValue);
  return value === null ? null : Math.round((value - primaryEta.getTime()) / 60_000);
}

/** "59 days" from two days on, otherwise "30h". */
export function formatOffPlan(minutes: number) {
  const total = Math.abs(minutes);
  return total >= 2 * 24 * 60 ? `${Math.round(total / (24 * 60))} days` : `${Math.round(total / 60)}h`;
}

export function formatDelay(minutes: number) {
  const sign = minutes < 0 ? "−" : "+";
  const total = Math.abs(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return `${sign}${hours ? `${hours}h ` : ""}${rest}m`;
}

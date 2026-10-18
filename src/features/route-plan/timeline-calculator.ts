export type TimelineSegment = {
  id: string;
  durationMinutes?: number | null;
  dwellAfterMinutes?: number | null;
  plannedDepartureAt?: string;
  plannedArrivalAt?: string;
};

export type CalculatedTimelineSegment<T extends TimelineSegment> = T & {
  plannedDepartureAt: string;
  plannedArrivalAt: string;
  dwellAfterMinutes: number;
};

/**
 * Calculates continuous departure and arrival ISO timestamps for a sequence of segments.
 * Each segment departure = previous arrival + previous dwell/rest time.
 * Segment arrival = departure + segment duration (defaults to 60 mins if uncalculated).
 */
export function calculateRouteTimeline<T extends TimelineSegment>(
  baseStartTime: string,
  segments: T[],
): CalculatedTimelineSegment<T>[] {
  const parsedStart = new Date(baseStartTime);
  if (Number.isNaN(parsedStart.getTime())) {
    throw new Error(`Invalid start time: ${baseStartTime}`);
  }

  let currentDepartureTime = parsedStart.getTime();

  return segments.map((segment) => {
    const durationMinutes =
      segment.durationMinutes != null && segment.durationMinutes > 0
        ? Math.round(segment.durationMinutes)
        : 60;

    const dwellAfterMinutes =
      segment.dwellAfterMinutes != null && segment.dwellAfterMinutes >= 0
        ? Math.round(segment.dwellAfterMinutes)
        : 0;

    const departureDate = new Date(currentDepartureTime);
    const arrivalDate = new Date(currentDepartureTime + durationMinutes * 60 * 1000);

    // Update departure time for next segment
    currentDepartureTime = arrivalDate.getTime() + dwellAfterMinutes * 60 * 1000;

    return {
      ...segment,
      plannedDepartureAt: departureDate.toISOString(),
      plannedArrivalAt: arrivalDate.toISOString(),
      dwellAfterMinutes,
    };
  });
}

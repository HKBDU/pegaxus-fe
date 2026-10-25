import type { MapRoute } from "@/shared/components/map";

export type RouteContinuityResult = {
  valid: boolean;
  message?: string;
  effectiveRoutes: MapRoute[];
};

function samePoint(
  left: MapRoute["fromLocation"],
  right: MapRoute["toLocation"],
) {
  return (
    left?.id != null &&
    right?.id != null &&
    String(left.id) === String(right.id)
  );
}

function sameRoute(left: MapRoute, right: MapRoute) {
  const leftId = left.id == null ? "" : String(left.id);
  const rightId = right.id == null ? "" : String(right.id);
  if (leftId && rightId && leftId === rightId) return true;
  return (
    String(left.fromLocation?.id) === String(right.fromLocation?.id) &&
    String(left.toLocation?.id) === String(right.toLocation?.id) &&
    (left.transportMode ?? "ROAD") === (right.transportMode ?? "ROAD")
  );
}

function sameRouteChain(left: MapRoute[], right: MapRoute[]) {
  return (
    left.length === right.length &&
    left.every((route, index) => sameRoute(route, right[index]))
  );
}

function validateChain(
  routes: MapRoute[],
  originId: string | number,
  destinationId: string | number,
): RouteContinuityResult {
  if (!routes.length)
    return {
      valid: false,
      message: "Add at least one segment.",
      effectiveRoutes: [],
    };
  if (String(routes[0].fromLocation?.id) !== String(originId))
    return {
      valid: false,
      message: "The first segment must start at the Transport Plan origin.",
      effectiveRoutes: routes,
    };
  if (String(routes.at(-1)?.toLocation?.id) !== String(destinationId))
    return {
      valid: false,
      message: "The last segment must end at the Transport Plan destination.",
      effectiveRoutes: routes,
    };
  for (let index = 1; index < routes.length; index += 1) {
    if (!samePoint(routes[index].fromLocation, routes[index - 1].toLocation))
      return {
        valid: false,
        message: `Segment ${index + 1} is disconnected from segment ${index}.`,
        effectiveRoutes: routes,
      };
  }
  return { valid: true, effectiveRoutes: routes };
}

export function buildEffectiveBackupRoute(
  primary: MapRoute[],
  backup: MapRoute[],
  originId: string | number,
  destinationId: string | number,
): RouteContinuityResult {
  if (!backup.length)
    return {
      valid: false,
      message: "Add at least one backup segment.",
      effectiveRoutes: [],
    };
  const primaryChain = validateChain(primary, originId, destinationId);
  if (!primaryChain.valid) {
    return {
      valid: false,
      message:
        "The PRIMARY route must be anchored to the Transport Plan origin and destination.",
      effectiveRoutes: primary,
    };
  }
  const backupChain = validateChain(
    backup,
    backup[0].fromLocation?.id ?? originId,
    backup.at(-1)?.toLocation?.id ?? destinationId,
  );
  if (!backupChain.valid) return backupChain;
  if (sameRouteChain(primary, backup))
    return {
      valid: false,
      message: "The BACKUP route must differ from the PRIMARY route.",
      effectiveRoutes: backup,
    };

  const backupStart = backup[0].fromLocation?.id;
  const backupEnd = backup.at(-1)?.toLocation?.id;
  const startsAtRoutePlanOrigin = String(backupStart) === String(originId);
  const prefixEnd = primary.findIndex(
    (route) => String(route.toLocation?.id) === String(backupStart),
  );
  // Backup may start directly at routePlan.from; PRIMARY prefix is optional then.
  const prefix = startsAtRoutePlanOrigin
    ? []
    : prefixEnd >= 0
      ? primary.slice(0, prefixEnd + 1)
      : null;
  if (prefix === null)
    return {
      valid: false,
      message: "Backup start does not connect to any PRIMARY segment.",
      effectiveRoutes: backup,
    };

  const suffixStart = primary.findIndex(
    (route) => String(route.fromLocation?.id) === String(backupEnd),
  );
  const suffix =
    String(backupEnd) === String(destinationId)
      ? []
      : suffixStart >= 0
        ? primary.slice(suffixStart)
        : null;
  if (suffix === null)
    return {
      valid: false,
      message:
        "Backup end creates a dead end and does not reconnect to the destination.",
      effectiveRoutes: [...prefix, ...backup],
    };

  return validateChain(
    [...prefix, ...backup, ...suffix],
    originId,
    destinationId,
  );
}

export function validateRoutePlanRoute(
  routes: MapRoute[],
  originId: string | number,
  destinationId: string | number,
) {
  return validateChain(routes, originId, destinationId);
}

import type { MapLocation, MapRoute } from "@/shared/components/map";
import { getRouteCorridorMetrics } from "@/shared/utils/map/routing";

export const UK_IE_COUNTRIES = new Set([
  "united kingdom",
  "uk",
  "gb",
  "great britain",
  "ireland",
  "ie",
]);

/** Check whether a location is a Border Control Point / Border Gate by type */
export function isBcpLocation(
  loc?: MapLocation | { type?: string | null; locationType?: string | null } | null,
): boolean {
  if (!loc) return false;
  return (
    loc.type === "BORDER_GATE" ||
    (loc as { locationType?: string | null }).locationType === "BORDER_GATE"
  );
}

/** Standard major European Border Control Points used as preset / discovery */
export const PRESET_BCP_LOCATIONS: MapLocation[] = [
  {
    id: "preset-bcp-coquelles",
    name: "Eurotunnel Coquelles BCP",
    type: "BORDER_GATE",
    country: "FR",
    city: "Coquelles",
    address: "Terminal Eurotunnel, Boulevard de l'Europe",
    latitude: 50.9224,
    longitude: 1.8152,
    note: "Eurotunnel cross-border equine border control post",
  },
  {
    id: "preset-bcp-calais",
    name: "Port of Calais BCP",
    type: "BORDER_GATE",
    country: "FR",
    city: "Calais",
    address: "Gare Maritime, Port de Calais",
    latitude: 50.9634,
    longitude: 1.8621,
    note: "Ferry freight equine BCP terminal",
  },
  {
    id: "preset-bcp-dover",
    name: "Port of Dover BCP",
    type: "BORDER_GATE",
    country: "GB",
    city: "Dover",
    address: "Eastern Docks, Port of Dover",
    latitude: 51.1279,
    longitude: 1.3323,
    note: "UK Border inspection post for registered equidae",
  },
  {
    id: "preset-bcp-holyhead",
    name: "Port of Holyhead BCP",
    type: "BORDER_GATE",
    country: "GB",
    city: "Holyhead",
    address: "Holyhead Port, Anglesey",
    latitude: 53.3084,
    longitude: -4.6331,
    note: "Irish Sea crossing BCP point",
  },
  {
    id: "preset-bcp-dublin",
    name: "Dublin Port BCP",
    type: "BORDER_GATE",
    country: "IE",
    city: "Dublin",
    address: "Terminal 1, Dublin Port",
    latitude: 53.3498,
    longitude: -6.2088,
    note: "Irish border inspection post",
  },
  {
    id: "preset-bcp-brussels",
    name: "Brussels Border Gate",
    type: "BORDER_GATE",
    country: "BE",
    city: "Brussels",
    address: "Boulevard de la Woluwe",
    latitude: 50.8503,
    longitude: 4.3517,
    note: "Belgium border control facility",
  },
  {
    id: "preset-bcp-rotterdam",
    name: "Rotterdam Europoort BCP",
    type: "BORDER_GATE",
    country: "NL",
    city: "Rotterdam",
    address: "Europoort Rotterdam",
    latitude: 51.9244,
    longitude: 4.1277,
    note: "Netherlands North Sea border post",
  },
];

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isCrossBorder(
  fromCountry?: string | null,
  toCountry?: string | null,
): boolean {
  if (!fromCountry || !toCountry) return false;
  const c1 = fromCountry.trim().toLowerCase();
  const c2 = toCountry.trim().toLowerCase();
  return c1 !== c2;
}

export function isUkOrIreland(country?: string | null): boolean {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return UK_IE_COUNTRIES.has(c);
}

export function isMandatoryBcpCrossing(
  fromCountry?: string | null,
  toCountry?: string | null,
): boolean {
  if (!isCrossBorder(fromCountry, toCountry)) return false;
  return isUkOrIreland(fromCountry) || isUkOrIreland(toCountry);
}

export type DetectedBcpMatch = {
  bcp: MapLocation;
  distanceKmToRoute: number;
  isMandatory: boolean;
  isFromPreset: boolean;
};

// A BCP must be on the route corridor, not merely the closest BCP anywhere in
// Europe. This also prevents a UK preset (for example Dover) being injected
// into an unrelated route when the route geometry is far away.
const MAX_BCP_DISTANCE_TO_ROUTE_KM = 10;

/**
 * Finds the most suitable BCP location along a route's corridor.
 * Analyzes the route geometry LineString against available BCPs.
 */
export function findBestBcpAlongRoute(
  route: MapRoute,
  masterLocations: MapLocation[],
): DetectedBcpMatch | null {
  const fromCountry = route.fromLocation?.country?.trim().toLowerCase();
  const toCountry = route.toLocation?.country?.trim().toLowerCase();
  if (!isCrossBorder(fromCountry, toCountry)) return null;

  const isMandatory = isMandatoryBcpCrossing(fromCountry, toCountry);

  // Only UK/Ireland crossings require this automatic split. In particular, a
  // normal intra-EU route must never be split just because a BCP preset exists.
  if (!isMandatory) return null;

  // Extract coordinates from LineString / MultiLineString geometry
  const coords: [number, number][] = [];
  const rawGeom = (route.geometry ?? route.geoJson) as
    | { type?: string; coordinates?: unknown }
    | undefined;

  if (rawGeom?.coordinates && Array.isArray(rawGeom.coordinates)) {
    if (rawGeom.type === "LineString") {
      coords.push(...(rawGeom.coordinates as [number, number][]));
    } else if (rawGeom.type === "MultiLineString") {
      for (const line of rawGeom.coordinates as [number, number][][]) {
        coords.push(...line);
      }
    }
  }

  // Without route geometry we cannot establish that the route actually passes
  // a BCP. Endpoint/midpoint proximity is not sufficient for an automatic DB
  // location/route mutation.
  if (coords.length < 2) return null;

  // Filter master BCP locations strictly by location type (supported by API & models)
  const masterBcps = masterLocations.filter(
    (location) => isBcpLocation(location) && isUkOrIreland(location.country),
  );

  // Combine master with presets if master doesn't have sufficient coverage
  const allCandidates: Array<{ loc: MapLocation; isPreset: boolean }> = [
    ...masterBcps.map((loc) => ({ loc, isPreset: false })),
    ...PRESET_BCP_LOCATIONS
      .filter((loc) => isUkOrIreland(loc.country))
      .map((loc) => ({ loc, isPreset: true })),
  ];

  if (!allCandidates.length) return null;

  let bestMatch: { loc: MapLocation; isPreset: boolean } | null = null;
  let minScore = Infinity;
  let bestDistance = Infinity;

  for (const candidate of allCandidates) {
    const bcp = candidate.loc;
    const corridor = getRouteCorridorMetrics(route.geometry ?? route.geoJson, {
      latitude: bcp.latitude,
      longitude: bcp.longitude,
    });
    if (!corridor || corridor.distanceKm > MAX_BCP_DISTANCE_TO_ROUTE_KM) continue;
    const bcpMinDist = corridor.distanceKm;

    // Affinity weight: prefer master over presets, and prefer matching countries
    const bcpCountry = bcp.country?.trim().toLowerCase();
    const hasCountryAffinity =
      bcpCountry === fromCountry || bcpCountry === toCountry;

    let score = bcpMinDist;
    if (hasCountryAffinity) score *= 0.6; // 40% bonus for country match
    if (!candidate.isPreset) score *= 0.8; // 20% bonus for existing master data

    if (score < minScore) {
      minScore = score;
      bestMatch = candidate;
      bestDistance = bcpMinDist;
    }
  }

  if (!bestMatch) return null;

  return {
    bcp: bestMatch.loc,
    distanceKmToRoute: Math.round(bestDistance * 10) / 10,
    isMandatory,
    isFromPreset: bestMatch.isPreset,
  };
}

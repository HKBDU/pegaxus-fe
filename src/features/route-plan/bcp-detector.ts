import type { MapLocation, MapRoute } from "@/shared/components/map";

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

  // Filter master BCP locations strictly by location type (supported by API & models)
  const masterBcps = masterLocations.filter(isBcpLocation);

  // Combine master with presets if master doesn't have sufficient coverage
  const allCandidates: Array<{ loc: MapLocation; isPreset: boolean }> = [
    ...masterBcps.map((loc) => ({ loc, isPreset: false })),
    ...PRESET_BCP_LOCATIONS.map((loc) => ({ loc, isPreset: true })),
  ];

  if (!allCandidates.length) return null;

  // Sample points evenly along the route geometry
  const sampledPoints: [number, number][] = [];
  if (coords.length > 0) {
    const step = Math.max(1, Math.floor(coords.length / 40));
    for (let i = 0; i < coords.length; i += step) {
      sampledPoints.push(coords[i]);
    }
    sampledPoints.push(coords[coords.length - 1]);
  } else {
    // If no geometry, sample endpoints and midpoint
    if (route.fromLocation)
      sampledPoints.push([
        route.fromLocation.longitude,
        route.fromLocation.latitude,
      ]);
    if (route.fromLocation && route.toLocation) {
      sampledPoints.push([
        (route.fromLocation.longitude + route.toLocation.longitude) / 2,
        (route.fromLocation.latitude + route.toLocation.latitude) / 2,
      ]);
    }
    if (route.toLocation)
      sampledPoints.push([
        route.toLocation.longitude,
        route.toLocation.latitude,
      ]);
  }

  let bestMatch: { loc: MapLocation; isPreset: boolean } | null = null;
  let minScore = Infinity;

  for (const candidate of allCandidates) {
    const bcp = candidate.loc;
    let bcpMinDist = Infinity;
    for (const [lon, lat] of sampledPoints) {
      const d = haversineDistanceKm(bcp.latitude, bcp.longitude, lat, lon);
      if (d < bcpMinDist) bcpMinDist = d;
    }

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
    }
  }

  if (!bestMatch) return null;

  // Compute actual minimum physical distance
  let actualMinDist = Infinity;
  for (const [lon, lat] of sampledPoints) {
    const d = haversineDistanceKm(
      bestMatch.loc.latitude,
      bestMatch.loc.longitude,
      lat,
      lon,
    );
    if (d < actualMinDist) actualMinDist = d;
  }

  return {
    bcp: bestMatch.loc,
    distanceKmToRoute: Math.round(actualMinDist * 10) / 10,
    isMandatory,
    isFromPreset: bestMatch.isPreset,
  };
}

/**
 * Canvas 2D orthographic globe for the "Routes in motion" opening.
 * Continents are coarse hand-drawn outlines: the globe is illustrative, not a map.
 */
type LonLat = readonly [number, number];

// prettier-ignore
const CONTINENTS: readonly (readonly LonLat[])[] = [
  // North America
  [[-168, 66], [-162, 70], [-140, 70], [-120, 72], [-95, 72], [-80, 73], [-65, 62], [-55, 52], [-66, 45], [-70, 41], [-76, 35], [-81, 31], [-80, 25], [-82, 29], [-90, 30], [-97, 26], [-97, 21], [-90, 21], [-87, 15], [-83, 9], [-79, 9], [-86, 13], [-92, 15], [-105, 20], [-112, 28], [-115, 32], [-118, 34], [-124, 40], [-124, 48], [-130, 55], [-140, 60], [-152, 58], [-165, 60]],
  // Greenland
  [[-55, 60], [-44, 60], [-20, 70], [-18, 80], [-40, 83], [-65, 80], [-58, 70]],
  // South America
  [[-80, 9], [-72, 12], [-62, 11], [-50, 5], [-35, -5], [-39, -15], [-48, -26], [-58, -38], [-65, -42], [-68, -52], [-75, -50], [-73, -38], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0]],
  // Europe
  [[-6, 36], [-9, 37], [-9, 43], [-2, 43.5], [-1.5, 46], [-4.5, 48], [-1, 49.5], [2, 51], [4.5, 52.5], [8, 53.5], [8.5, 55.5], [10.5, 57.5], [10.5, 56], [12.5, 55.5], [12, 54.2], [14, 54], [19, 54.5], [21, 55.5], [21, 57], [24, 57.5], [24, 59.4], [28, 59.7], [30, 60], [29, 61], [25, 60.3], [22.5, 60.2], [21.5, 61], [21.5, 63], [25, 65], [25.5, 65.8], [22, 65.8], [17.5, 62.5], [17, 61], [18.5, 60], [16.5, 57], [14.5, 56], [12.8, 55.6], [11, 58.5], [10, 59], [8, 58], [5.5, 58.5], [5, 61], [7, 63], [10, 64.5], [13, 66.5], [15, 68.5], [18, 69.5], [21, 70.2], [25, 71], [29, 70.5], [33, 69.4], [41, 67], [44, 68.5], [53, 68.8], [60, 69], [68, 69], [68, 55], [55, 51], [50, 46], [48, 45], [38, 47], [36, 45.5], [33.5, 44.5], [30, 45.5], [28.5, 43.5], [28, 41.5], [26, 40.5], [24, 40.8], [22.5, 40.4], [24, 38], [23, 36.5], [21.5, 37], [20, 39.5], [19.5, 41.5], [18.5, 42.5], [15, 45], [13.7, 45.6], [12.3, 45.3], [12.5, 44], [14, 42], [16, 41], [18.5, 40], [17, 39], [16, 38], [15.6, 40], [12.5, 41.8], [11, 43], [10, 44], [8, 44], [7, 43.5], [5, 43.2], [3, 43.3], [3.2, 42], [0.8, 41], [-0.3, 39.5], [0, 38.7], [-0.7, 37.6], [-2, 36.7], [-4.5, 36.6]],
  // Great Britain, Ireland, Iceland
  [[-5.7, 50], [1.5, 51.2], [1.7, 52.7], [0, 53.5], [-0.5, 54.5], [-1.6, 55.6], [-2, 57.6], [-3.3, 58.6], [-5, 58.6], [-6.2, 57], [-5.5, 55.5], [-4.8, 54.8], [-3, 54], [-3, 53.3], [-4.6, 52.8], [-5.2, 51.7], [-3.3, 51.4], [-4.2, 51.2]],
  [[-10, 51.6], [-6, 52], [-6, 54], [-7.5, 55.2], [-10, 54]],
  [[-24, 64], [-13.5, 65], [-15, 66.5], [-22, 66.4]],
  // Africa, Madagascar
  [[-17, 21], [-16, 28], [-9, 32], [-5, 35.9], [10, 37.2], [11, 33], [20, 31], [25, 31.7], [32, 31.3], [34, 28], [39, 17], [43, 12.5], [51, 11.8], [51, 10], [44, 1], [40, -4], [40, -11], [35, -20], [35.5, -24], [32.5, -29], [27, -33.8], [20, -34.8], [18, -32], [12, -17], [13.5, -10], [12, -5], [9, -1], [9.5, 4], [4, 6.3], [-4, 5], [-8, 4.5], [-13, 8], [-17, 14.7]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
  // Arabia
  [[34.5, 28], [36, 32.5], [42, 37], [48, 30], [48, 28.5], [51.5, 24], [56, 26.3], [59.8, 22.5], [57, 18.8], [52, 16.3], [45, 13], [43, 12.7], [42.5, 15.5], [39, 21.5], [35, 28]],
  // Asia
  [[26, 40.5], [30, 41], [36, 41.5], [41.5, 41.5], [40, 43.5], [38, 47], [48, 45], [50, 46], [55, 51], [68, 55], [68, 69], [73, 72.5], [80, 73.5], [100, 77], [113, 74], [130, 71], [150, 71.5], [170, 70], [180, 69], [180, 65], [170, 60], [163, 58], [156, 51], [156, 57], [160, 61], [155, 62], [143, 59.5], [135, 54.5], [141, 52], [140, 48], [135, 43], [130, 42.5], [129, 35], [126, 35], [126.5, 38], [124.5, 40], [121.5, 39], [118, 38.5], [122, 37], [120.5, 32], [122, 30], [119.5, 25], [116, 22.8], [110, 21.5], [108, 21.5], [106, 19], [109, 15], [109, 11.5], [105, 8.5], [104.5, 10.5], [101, 13], [100, 8], [103.5, 1.3], [101, 3], [98.5, 8], [98, 16], [94.5, 17], [91.5, 22.5], [88, 21.6], [86.8, 20.5], [85, 19.5], [80.3, 15.8], [80, 10], [77.5, 8], [76, 10], [73, 17], [72.8, 21], [70, 21], [68.7, 23.5], [66.5, 25.5], [61.6, 25.2], [57.3, 25.9], [56, 27], [52.5, 27.5], [50, 30], [48, 30], [44, 37], [36, 36.5], [36, 35.9], [29, 36.6], [26.5, 38.5]],
  // Islands of South-East Asia, Japan, Oceania
  [[95, 5.5], [98.5, 3.5], [106, -6], [104, -5], [100, -1]],
  [[109, 1.5], [117, 7], [119, 5], [117.5, 0], [116, -4], [110, -3]],
  [[105, -6.8], [114.5, -7.6], [114.5, -8.8], [106, -7.5]],
  [[131, -1], [141, -2.6], [150.5, -10.5], [146, -8], [141, -9.2], [138, -8.4], [133, -4]],
  [[120, 18.5], [122.5, 18.4], [124, 12.5], [126.5, 7], [125.5, 6], [122, 7], [123.5, 10.5], [120, 14.5]],
  [[130.9, 34], [135, 33.5], [140, 35], [141, 38], [141.5, 41.5], [140, 40], [138.5, 37.5], [136, 36], [133, 35.5]],
  [[140, 42], [145.5, 43.3], [142, 45.5], [141, 43.5]],
  [[114, -22], [114, -34.5], [118, -35], [123, -33.8], [129, -31.6], [134, -32.5], [138, -35.6], [140, -38], [146.5, -39], [150, -37.5], [153.5, -28], [153, -25], [146, -19], [145.5, -15], [142.5, -10.7], [141.5, -17], [136, -12], [130, -11.5], [126, -14], [122, -18]],
  [[172.5, -34.5], [178.5, -37.7], [175, -41.5], [171, -44.5], [166.5, -46], [168, -44], [172, -41], [174, -39], [173, -35.5]],
];

const RAD = Math.PI / 180;

function inside(lon: number, lat: number, polygon: readonly LonLat[]) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    )
      hit = !hit;
  }
  return hit;
}

export type LandDot = {
  sinLat: number;
  cosLat: number;
  lon: number;
  europe: boolean;
};

const dotCache = new Map<number, LandDot[]>();
/** Evenly spaced dots on land; spacing in degrees of latitude. */
export function getLandDots(step: number) {
  const cached = dotCache.get(step);
  if (cached) return cached;
  const dots: LandDot[] = [];
  for (let lat = -56; lat <= 82; lat += step) {
    const lonStep = step / Math.max(0.2, Math.cos(lat * RAD));
    for (let lon = -180; lon < 180; lon += lonStep) {
      if (!CONTINENTS.some((polygon) => inside(lon, lat, polygon))) continue;
      dots.push({
        sinLat: Math.sin(lat * RAD),
        cosLat: Math.cos(lat * RAD),
        lon: lon * RAD,
        europe: lon > -11 && lon < 30 && lat > 35 && lat < 61,
      });
    }
  }
  dotCache.set(step, dots);
  return dots;
}

const regionCache = new Map<number, LandDot[]>();
/** Dense land dots for the zoomed European approach (the route region). */
export function getEuropeDots(step: number) {
  const cached = regionCache.get(step);
  if (cached) return cached;
  const dots: LandDot[] = [];
  for (let lat = 40; lat <= 60; lat += step) {
    const lonStep = step / Math.cos(lat * RAD);
    for (let lon = -12; lon <= 20; lon += lonStep) {
      if (!CONTINENTS.some((polygon) => inside(lon, lat, polygon))) continue;
      dots.push({
        sinLat: Math.sin(lat * RAD),
        cosLat: Math.cos(lat * RAD),
        lon: lon * RAD,
        europe: true,
      });
    }
  }
  regionCache.set(step, dots);
  return dots;
}

export type GlobePlace = { name: string; lat: number; lon: number };
export const RACING_HUBS: readonly GlobePlace[] = [
  { name: "Lexington", lat: 38.05, lon: -84.5 },
  { name: "New York", lat: 40.7, lon: -73.7 },
  { name: "Buenos Aires", lat: -34.6, lon: -58.4 },
  { name: "Dubai", lat: 25.2, lon: 55.3 },
  { name: "Riyadh", lat: 24.7, lon: 46.7 },
  { name: "Johannesburg", lat: -26.2, lon: 28 },
  { name: "Hong Kong", lat: 22.3, lon: 114.2 },
  { name: "Tokyo", lat: 35.7, lon: 139.7 },
  { name: "Melbourne", lat: -37.8, lon: 145 },
];
export const ROUTE_STOPS: readonly GlobePlace[] = [
  { name: "LONDON", lat: 51.5, lon: -0.1 },
  { name: "PARIS", lat: 48.85, lon: 2.35 },
  { name: "LYON", lat: 45.76, lon: 4.84 },
];

type Vec = [number, number, number];
const toVec = (lat: number, lon: number): Vec => [
  Math.cos(lat * RAD) * Math.cos(lon * RAD),
  Math.cos(lat * RAD) * Math.sin(lon * RAD),
  Math.sin(lat * RAD),
];

/** Great-circle arc lifted above the surface; returns [lat, lon, radius] samples. */
export function getArc(from: GlobePlace, to: GlobePlace, samples = 48) {
  const a = toVec(from.lat, from.lon);
  const b = toVec(to.lat, to.lon);
  const dot = Math.min(
    1,
    Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]),
  );
  const omega = Math.acos(dot);
  const lift = Math.min(0.32, omega * 0.16);
  const points: [number, number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const s = Math.sin(omega) || 1;
    const k0 = omega ? Math.sin((1 - t) * omega) / s : 1 - t;
    const k1 = omega ? Math.sin(t * omega) / s : t;
    const v = [
      a[0] * k0 + b[0] * k1,
      a[1] * k0 + b[1] * k1,
      a[2] * k0 + b[2] * k1,
    ];
    const length = Math.hypot(v[0], v[1], v[2]) || 1;
    points.push([
      Math.asin(v[2] / length),
      Math.atan2(v[1], v[0]),
      1 + Math.sin(Math.PI * t) * lift,
    ]);
  }
  return points;
}

/** Piecewise-linear interpolation over [progress, value] keys. */
export function keyframe(
  progress: number,
  keys: readonly (readonly [number, number])[],
) {
  if (progress <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p1, v1] = keys[i];
    const [p0, v0] = keys[i - 1];
    if (progress <= p1) {
      const t = (progress - p0) / (p1 - p0);
      const eased = t * t * (3 - 2 * t);
      return v0 + (v1 - v0) * eased;
    }
  }
  return keys[keys.length - 1][1];
}

export type GlobeView = {
  cx: number;
  cy: number;
  radius: number;
  sinLat0: number;
  cosLat0: number;
  lon0: number;
};

/** Orthographic projection; `depth` > 0 faces the viewer. */
export function project(
  view: GlobeView,
  sinLat: number,
  cosLat: number,
  lon: number,
  radius = 1,
) {
  const dLon = lon - view.lon0;
  const cosD = Math.cos(dLon);
  const nx = radius * cosLat * Math.sin(dLon);
  const ny = radius * (view.cosLat0 * sinLat - view.sinLat0 * cosLat * cosD);
  const depth = view.sinLat0 * sinLat + view.cosLat0 * cosLat * cosD;
  return {
    x: view.cx + view.radius * nx,
    y: view.cy - view.radius * ny,
    depth,
    // Lifted arcs stay visible past the limb, never through the sphere.
    visible: depth > 0 || nx * nx + ny * ny > 1,
  };
}

const ROUTE_CENTER = { lat: 48.63, lon: 2.37 };

/**
 * The close-up the globe settles on: London → Lyon fills a large share of the
 * screen, offset away from the chapter copy.
 */
export function getRouteView(width: number, height: number, compact: boolean) {
  const base: GlobeView = {
    cx: 0,
    cy: 0,
    radius: 1,
    sinLat0: Math.sin(ROUTE_CENTER.lat * RAD),
    cosLat0: Math.cos(ROUTE_CENTER.lat * RAD),
    lon0: ROUTE_CENTER.lon * RAD,
  };
  const ends = [ROUTE_STOPS[0], ROUTE_STOPS[ROUTE_STOPS.length - 1]].map(
    (stop) =>
      project(
        base,
        Math.sin(stop.lat * RAD),
        Math.cos(stop.lat * RAD),
        stop.lon * RAD,
      ),
  );
  const span = Math.hypot(ends[0].x - ends[1].x, ends[0].y - ends[1].y);
  const target = compact
    ? Math.min(height * 0.42, width * 0.95)
    : Math.min(height * 0.58, width * 0.5);
  return {
    ...base,
    cx: width * (compact ? 0.5 : 0.64),
    cy: height * (compact ? 0.64 : 0.57),
    radius: target / span,
  };
}

/** Screen geometry of the route and its stops for a given view. */
export function getRoutePath(view: GlobeView, samples = 64) {
  const route = [
    ...getArc(ROUTE_STOPS[0], ROUTE_STOPS[1], samples / 2),
    ...getArc(ROUTE_STOPS[1], ROUTE_STOPS[2], samples / 2).slice(1),
  ];
  // Bow the short European legs so the run reads as a journey, not a ruler line.
  const points = route.map(([lat, lon], index) => {
    const t = index / (route.length - 1);
    const bow = Math.sin(Math.PI * t * 2) * 0.012;
    return project(view, Math.sin(lat), Math.cos(lat), lon + bow);
  });
  const d = points
    .map(
      (point, index) =>
        (index ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1),
    )
    .join(" ");
  const stops = ROUTE_STOPS.map((stop) => {
    const point = project(
      view,
      Math.sin(stop.lat * RAD),
      Math.cos(stop.lat * RAD),
      stop.lon * RAD,
    );
    return { name: stop.name, x: point.x, y: point.y };
  });
  return { d, stops };
}

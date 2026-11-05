import { readFile, writeFile } from "node:fs/promises";
import { union } from "@turf/union";

const countries = [
  ["at", 14.55, 47.5],
  ["be", 4.5, 50.8],
  ["bg", 25.2, 42.7],
  ["hr", 15.5, 45.1],
  ["cy", 33, 35],
  ["cz", 15.5, 49.8],
  ["dk", 10, 56],
  ["ee", 25.5, 58.6],
  ["fi", 25, 64],
  ["fr", 2, 46],
  ["de", 10.5, 51],
  ["gr", 22, 39],
  ["hu", 19.3, 47.2],
  ["ie", -8, 53.3],
  ["it", 12.5, 42.8],
  ["lv", 24.6, 56.8],
  ["lt", 23.9, 55.2],
  ["lu", 6.1, 49.8],
  ["mt", 14.4, 35.9],
  ["nl", 5.5, 52.2],
  ["pl", 19, 52],
  ["pt", -8, 39.5],
  ["ro", 25, 46],
  ["sk", 19.5, 48.7],
  ["si", 14.8, 46.1],
  ["es", -3.7, 40.2],
  ["se", 15, 62],
  ["gb", -2, 54.5],
];

const env = await readFile(".env", "utf8");
const apiKey = env.match(/^VITE_GEOAPIFY_API_KEY=(.+)$/m)?.[1]?.trim();
if (!apiKey) throw new Error("VITE_GEOAPIFY_API_KEY is missing from .env");

const features = [];
for (const [countryCode, lon, lat] of countries) {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
    boundaries: "administrative",
    geometry: "geometry_1000",
    lang: "en",
    apiKey,
  });
  const response = await fetch(
    `https://api.geoapify.com/v1/boundaries/part-of?${params}`,
  );
  if (!response.ok) throw new Error(`${countryCode}: Geoapify ${response.status}`);
  const body = await response.json();
  const feature = [...(body.features ?? [])].reverse().find(
    (candidate) =>
      candidate.properties?.country_code?.toLowerCase() === countryCode &&
      ["Polygon", "MultiPolygon"].includes(candidate.geometry?.type),
  );
  if (!feature) throw new Error(`${countryCode}: country polygon not found`);
  features.push(feature);
  console.log(`${features.length}/28 ${countryCode}`);
}

let dissolved = features[0];
for (const feature of features.slice(1)) {
  dissolved = union({ type: "FeatureCollection", features: [dissolved, feature] });
  if (!dissolved) throw new Error("Turf union returned no geometry");
}
if (!dissolved) throw new Error("Turf union returned no geometry");

dissolved.properties = {
  name: "EU27 + United Kingdom",
  countryCount: countries.length,
  source: "Geoapify Boundaries API",
};

await writeFile(
  "public/eu-uk-boundary.geojson",
  `${JSON.stringify(dissolved)}\n`,
  "utf8",
);
console.log("Wrote public/eu-uk-boundary.geojson");

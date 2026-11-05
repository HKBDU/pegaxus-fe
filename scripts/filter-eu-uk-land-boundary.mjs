import { readFile, writeFile } from "node:fs/promises";

const sourcePath = "scripts/data/ne_10m_admin_0_boundary_lines_land.geojson";
const outputPath = "public/eu-uk-land-boundary.geojson";

// EU-27 plus the United Kingdom. Natural Earth uses ISO3 country codes.
const euUkCodes = new Set([
  "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN",
  "FRA", "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX",
  "MLT", "NLD", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE",
  "GBR",
]);

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const features = source.features.filter(({ properties, geometry }) => {
  if (!geometry || !["LineString", "MultiLineString"].includes(geometry.type)) {
    return false;
  }

  const left = properties?.adm0_a3_l;
  const right = properties?.adm0_a3_r;
  // Keep only the external land border: one side in EU+UK, one side outside.
  return euUkCodes.has(left) !== euUkCodes.has(right);
});

const output = {
  type: "FeatureCollection",
  properties: {
    name: "EU27 + United Kingdom external land borders",
    source: "Natural Earth ne_10m_admin_0_boundary_lines_land",
    countryCount: euUkCodes.size,
  },
  features,
};

await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Wrote ${outputPath} (${features.length} border features)`);

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export const financialMoney = (value: number | null) =>
  value === null ? "—" : money.format(value);
export const financialLabel = (value: string) =>
  /^TIER_[A-Z]+$/.test(value)
    ? value.replace("TIER_", "Tier ")
    : value
        .replace(/([a-z\d])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^./, (first) => first.toUpperCase());

const pricingFields: Readonly<Record<string, string>> = {
  vehicleTier: "Vehicle Tier",
  horseCount: "Number of Horses",
  transportDays: "Transport Duration (Days)",
  dossierTemplateId: "Dossier Template Reference",
  requestCount: "Approved Requests",
  incidentCodes: "Incident References",
};
export const pricingLabel = (key: string) =>
  Object.hasOwn(pricingFields, key) ? pricingFields[key] : financialLabel(key);
const metadataNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 20,
});
export function pricingValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number")
    return Number.isFinite(value) ? metadataNumber.format(value) : "—";
  if (typeof value === "string")
    return ["VND", "USD", "EUR", "VAT", "DNA"].includes(value)
      ? value
      : /^[A-Z][A-Z_]+$/.test(value)
        ? financialLabel(value)
        : value;
  if (Array.isArray(value)) return value.map(pricingValue).join(", ") || "—";
  if (typeof value === "object")
    return (
      Object.entries(value)
        .map(([key, item]) => `${pricingLabel(key)}: ${pricingValue(item)}`)
        .join(" · ") || "—"
    );
  return "—";
}

export function financialTime(value: string | null) {
  if (value === null) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(date)
    : "—";
}

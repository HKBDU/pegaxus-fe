import { FilterToolbar } from "@/shared/components/ui/filter-toolbar";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { CountrySelect } from "@/shared/components/ui/country-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  incidentCategorySchema,
  severitySchema,
  claimTypeSchema,
  type IncidentFilters,
  type TransitFilters,
  type ReportFilters as Filters,
} from "../schemas";
import { LookupFilter } from "./LookupFilter";
import { CsvFilter } from "./CsvFilter";

export function ReportFilters({
  draft,
  onChange,
  onApply,
  onReset,
  errors,
  disabled,
  variant = "on-time-delivery",
}: {
  draft: Record<string, string | number>;
  onChange: (
    key: keyof Filters | keyof IncidentFilters | keyof TransitFilters,
    value: string,
  ) => void;
  onApply: () => void;
  onReset: () => void;
  errors: string[];
  disabled: boolean;
  variant?: "on-time-delivery" | "incident-claim-frequency" | "transit-time";
}) {
  const lookupFields =
    variant === "incident-claim-frequency"
      ? ([
          ["routeId", "Route", "route"],
          ["transportProviderId", "Provider", "provider"],
          ["vehicleId", "Vehicle", "vehicle"],
        ] as const)
      : variant === "transit-time"
        ? ([
            ["routeId", "Route", "route"],
            ["transportProviderId", "Provider", "provider"],
          ] as const)
        : ([
            ["routeId", "Route", "route"],
            ["transportProviderId", "Provider", "provider"],
            ["driverEmployeeId", "Driver", "driver"],
          ] as const);
  const secondaryKeys = [
    "originCountry",
    "destinationCountry",
    ...lookupFields.map(([key]) => key),
    ...(variant === "incident-claim-frequency"
      ? ["incidentCategory", "severity", "claimType", "horseId"]
      : []),
  ];
  const activeCount = secondaryKeys.filter((key) =>
    String(draft[key] ?? "").trim(),
  ).length;
  const control =
    "h-8 w-full min-w-0 rounded-[2px] border-input bg-white py-1 text-xs shadow-none";
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onApply();
      }}
      className="report-filterbar min-w-0 rounded-[2px] border border-slate-200 bg-white p-2.5"
      aria-label="Report filters"
    >
      <FilterToolbar
        label="Additional report filters"
        density="compact"
        activeCount={activeCount}
        search={
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="report-date-from" className="text-xs">
                From (UTC)
              </Label>
              <DatePicker
                id="report-date-from"
                value={String(draft.dateFrom)}
                onChange={(value) => onChange("dateFrom", value)}
                className={control}
                aria-describedby="report-filter-errors"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="report-date-to" className="text-xs">
                To (UTC)
              </Label>
              <DatePicker
                id="report-date-to"
                value={String(draft.dateTo)}
                onChange={(value) => onChange("dateTo", value)}
                className={control}
                aria-describedby="report-filter-errors"
              />
            </div>
          </div>
        }
        sort={
          variant === "on-time-delivery" ? (
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="report-trend" className="text-xs">
                Trend grouping
              </Label>
              <Select
                value={String(draft.trendBy)}
                onValueChange={(value) => onChange("trendBy", value)}
              >
                <SelectTrigger id="report-trend" size="sm" className={control}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="overflow-hidden"
                  viewportClassName="max-h-[min(20rem,calc(var(--radix-select-content-available-height)-3rem))]"
                >
                  <SelectItem value="WEEK">Week</SelectItem>
                  <SelectItem value="MONTH">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={onReset}
              className="h-8 rounded-[2px] px-3 text-xs"
            >
              Reset filters
            </Button>
            <Button
              type="submit"
              disabled={disabled}
              className="h-8 rounded-[2px] px-3 text-xs"
            >
              Apply filters
            </Button>
          </div>
        }
      >
        {(
          [
            ["originCountry", "Origin country"],
            ["destinationCountry", "Destination country"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="min-w-0 space-y-1.5">
            <Label htmlFor={`report-${key}`} className="text-xs">
              {label}
            </Label>
            <CountrySelect
              id={`report-${key}`}
              value={String(draft[key])}
              onValueChange={(value) => onChange(key, value)}
              placeholder="Any country"
              emptyLabel="Any country"
              allowCustomValue
              className={control}
            />
          </div>
        ))}
        {lookupFields.map(([key, label, kind]) => (
          <div key={key} className="min-w-0 space-y-1.5">
            <Label htmlFor={`report-${key}`} className="text-xs">
              {label}
            </Label>
            <LookupFilter
              id={`report-${key}`}
              kind={kind}
              value={String(draft[key])}
              onChange={(value) => onChange(key, value)}
            />
          </div>
        ))}
        {variant === "incident-claim-frequency" ? (
          <>
            {(
              [
                [
                  "incidentCategory",
                  "Incident categories",
                  incidentCategorySchema.options,
                ],
                ["severity", "Severity", severitySchema.options],
                ["claimType", "Claim types", claimTypeSchema.options],
              ] as const
            ).map(([key, label, options]) => (
              <div key={key} className="min-w-0 space-y-1.5">
                <Label htmlFor={`report-${key}`} className="text-xs">
                  {label}
                </Label>
                <CsvFilter
                  id={`report-${key}`}
                  label={label}
                  options={options}
                  value={String(draft[key])}
                  onChange={(value) => onChange(key, value)}
                />
              </div>
            ))}
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="report-horse-id" className="text-xs">
                Horse ID (optional)
              </Label>
              <Input
                id="report-horse-id"
                value={String(draft.horseId)}
                onChange={(event) => onChange("horseId", event.target.value)}
                placeholder="Known horse reference ID"
                className={control}
                aria-describedby="report-horse-hint"
              />
              <p
                id="report-horse-hint"
                className="m-0 text-[11px] text-slate-500"
              >
                Use an existing horse’s ID.
              </p>
            </div>
          </>
        ) : null}
      </FilterToolbar>
      <div>
        <div
          id="report-filter-errors"
          role="status"
          className={
            errors.length ? "mt-2 min-w-0 text-xs text-destructive" : ""
          }
        >
          {errors.map((error) => (
            <p key={error} className="m-0">
              {error}
            </p>
          ))}
        </div>
      </div>
    </form>
  );
}

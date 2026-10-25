import { getCountryDataList } from "countries-list";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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

const countries = getCountryDataList().sort((a, b) =>
  a.name.localeCompare(b.name),
);
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
  const control =
    "h-9 w-full rounded-[2px] border-slate-200 bg-white text-sm shadow-none";
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onApply();
      }}
      className="min-w-0 rounded-[2px] border border-slate-200 bg-white p-4"
      aria-label="Report filters"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 font-heading text-base uppercase">Report filters</h2>
        <span className="text-xs text-slate-500">
          Reporting dates are inclusive UTC days
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="report-date-from" className="text-xs">
            From date
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
            To date
          </Label>
          <DatePicker
            id="report-date-to"
            value={String(draft.dateTo)}
            onChange={(value) => onChange("dateTo", value)}
            className={control}
            aria-describedby="report-filter-errors"
          />
        </div>
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
            <Input
              id={`report-${key}`}
              list="report-countries"
              value={String(draft[key])}
              onChange={(event) => onChange(key, event.target.value)}
              placeholder="Any country"
              maxLength={100}
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
        {variant === "on-time-delivery" ? (
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="report-trend" className="text-xs">
              Trend grouping
            </Label>
            <Select
              value={String(draft.trendBy)}
              onValueChange={(value) => onChange("trendBy", value)}
            >
              <SelectTrigger id="report-trend" className={control}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEK">Week</SelectItem>
                <SelectItem value="MONTH">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : variant === "incident-claim-frequency" ? (
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
      </div>
      <datalist id="report-countries">
        {countries.map((country) => (
          <option key={country.iso2} value={country.name} />
        ))}
      </datalist>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div
          id="report-filter-errors"
          role="status"
          className="min-h-5 min-w-0 flex-1 text-xs text-destructive"
        >
          {errors.map((error) => (
            <p key={error} className="m-0">
              {error}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onReset}
            className="h-9 rounded-[2px]"
          >
            Reset filters
          </Button>
          <Button
            type="submit"
            disabled={disabled}
            className="h-9 rounded-[2px]"
          >
            Apply filters
          </Button>
        </div>
      </div>
    </form>
  );
}

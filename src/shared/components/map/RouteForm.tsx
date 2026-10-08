import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useDebounce } from "@/shared/hooks/useDebounce";
import type { MapLocation, RouteFormValues } from "./types";

const routeFormSchema = z
  .object({
    fromLocationId: z.string().min(1, "From location is required."),
    toLocationId: z.string().min(1, "To location is required."),
    routeName: z.string(),
    transportMode: z.enum(["ROAD", "SEA", "AIR"]),
    note: z.string(),
  })
  .refine((values) => values.fromLocationId !== values.toLocationId, {
    message: "From and To locations must be different.",
    path: ["toLocationId"],
  });

type RouteFormProps = {
  locations: MapLocation[];
  initialValues?: Partial<RouteFormValues>;
  onSubmit: (values: RouteFormValues) => void;
  onCancel?: () => void;
};

type LocationPickerProps = {
  label: string;
  value: string;
  locations: MapLocation[];
  error?: string;
  onChange: (value: string) => void;
};

function LocationPicker({
  label,
  value,
  locations,
  error,
  onChange,
}: LocationPickerProps) {
  const selectedLocation = locations.find(
    (location) => String(location.id) === value,
  );
  const [query, setQuery] = useState(selectedLocation?.name ?? "");
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    setQuery(selectedLocation?.name ?? "");
  }, [selectedLocation?.name]);

  const options = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (!normalizedQuery) return locations.slice(0, 10);

    return locations
      .filter((location) =>
        [location.name, location.city, location.country]
          .filter(Boolean)
          .some((item) => item!.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 10);
  }, [debouncedQuery, locations]);

  return (
    <label className="relative grid gap-1 text-sm">
      {label}
      <Input
        value={query}
        placeholder="Search existing location"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          if (value) onChange("");
        }}
      />
      {query.trim() && !selectedLocation && (
        <div className="absolute top-full z-10 mt-1 max-h-44 w-full overflow-y-auto rounded border bg-white p-1 shadow-md">
          {options.length ? (
            options.map((location) => (
              <button
                key={location.id}
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-amber-50"
                onClick={() => {
                  onChange(String(location.id));
                  setQuery(location.name);
                }}
              >
                <span className="font-medium">{location.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {location.city || location.country || ""}
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No locations found.
            </p>
          )}
        </div>
      )}
      {error && <span className="text-destructive">{error}</span>}
    </label>
  );
}

export function RouteForm({
  locations,
  initialValues,
  onSubmit,
  onCancel,
}: RouteFormProps) {
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      fromLocationId: "",
      toLocationId: "",
      routeName: "",
      transportMode: "ROAD",
      note: "",
      ...initialValues,
    },
  });

  const fromLocationId = form.watch("fromLocationId");
  const toLocationId = form.watch("toLocationId");

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <LocationPicker
        label="From location *"
        value={fromLocationId}
        locations={locations}
        error={form.formState.errors.fromLocationId?.message}
        onChange={(value) =>
          form.setValue("fromLocationId", value, { shouldValidate: true })
        }
      />
      <LocationPicker
        label="To location *"
        value={toLocationId}
        locations={locations}
        error={form.formState.errors.toLocationId?.message}
        onChange={(value) =>
          form.setValue("toLocationId", value, { shouldValidate: true })
        }
      />
      <label className="grid gap-1 text-sm">
        Route name
        <Input {...form.register("routeName")} />
      </label>
      <label className="grid gap-1 text-sm">
        Transport mode
        <select
          className="h-9 rounded border px-3 text-sm"
          {...form.register("transportMode")}
        >
          <option value="ROAD">ROAD</option>
          <option value="SEA">SEA</option>
          <option value="AIR">AIR</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Note
        <Textarea {...form.register("note")} />
      </label>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Save route</Button>
      </div>
    </form>
  );
}

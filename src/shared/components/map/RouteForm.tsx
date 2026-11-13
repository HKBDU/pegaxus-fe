import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
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
        <div className="absolute top-full z-10 mt-1 max-h-44 w-full overflow-y-auto overscroll-contain rounded-[2px] border bg-white p-1 shadow-md">
          {options.length ? (
            options.map((location) => (
              <button
                key={location.id}
                type="button"
                className="block w-full rounded-[2px] px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
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
        <Controller
          control={form.control}
          name="transportMode"
          render={({ field }) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger
                ref={field.ref}
                onBlur={field.onBlur}
                aria-label="Transport mode"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROAD">ROAD</SelectItem>
                <SelectItem value="SEA">SEA</SelectItem>
                <SelectItem value="AIR">AIR</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
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

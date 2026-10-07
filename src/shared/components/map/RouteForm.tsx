import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
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

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        From location *
        <select
          className="h-9 rounded border px-3 text-sm"
          {...form.register("fromLocationId")}
        >
          <option value="">Select location</option>
          {locations.map((location) => (
            <option key={location.id} value={String(location.id)}>
              {location.name}
            </option>
          ))}
        </select>
        {form.formState.errors.fromLocationId && (
          <span className="text-destructive">
            {form.formState.errors.fromLocationId.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        To location *
        <select
          className="h-9 rounded border px-3 text-sm"
          {...form.register("toLocationId")}
        >
          <option value="">Select location</option>
          {locations.map((location) => (
            <option key={location.id} value={String(location.id)}>
              {location.name}
            </option>
          ))}
        </select>
        {form.formState.errors.toLocationId && (
          <span className="text-destructive">
            {form.formState.errors.toLocationId.message}
          </span>
        )}
      </label>
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

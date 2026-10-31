import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import type { LocationFormValues } from "./types";

type LocationFormFieldsProps = {
  register: UseFormRegister<LocationFormValues>;
  errors: FieldErrors<LocationFormValues>;
};

const locationTypes = [
  "CITY",
  "BORDER_GATE",
  "AIRPORT",
  "SEAPORT",
  "STABLE",
  "REST_STOP",
  "OTHER",
];

export function LocationFormFields({
  register,
  errors,
}: LocationFormFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm sm:col-span-2">
        Name *
        <Input {...register("name")} />
        {errors.name && (
          <span className="text-destructive">{errors.name.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Type
        <select
          className="h-9 w-full min-w-0 rounded-[2px] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
          {...register("type")}
        >
          <option value="">Select type</option>
          {locationTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Country
        <Input {...register("country")} />
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        Address
        <Input {...register("address")} />
      </label>
      <label className="grid gap-1 text-sm">
        City
        <Input {...register("city")} />
      </label>
      <label className="grid gap-1 text-sm">
        State / Province
        <Input {...register("stateProvince")} />
      </label>
      <label className="grid gap-1 text-sm">
        Latitude *
        <Input
          type="number"
          step="0.0001"
          placeholder="1,000.01"
          {...register("latitude", { valueAsNumber: true })}
        />
        {errors.latitude && (
          <span className="text-destructive">{errors.latitude.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Longitude *
        <Input
          type="number"
          step="0.0001"
          placeholder="1,000.01"
          {...register("longitude", { valueAsNumber: true })}
        />
        {errors.longitude && (
          <span className="text-destructive">{errors.longitude.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        Note
        <Textarea {...register("note")} />
      </label>
    </div>
  );
}

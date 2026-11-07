import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { LocationFormValues } from "./types";

type LocationFormFieldsProps = {
  register: UseFormRegister<LocationFormValues>;
  control: Control<LocationFormValues>;
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
  control,
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
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              name={field.name}
              value={field.value || "__NO_LOCATION_TYPE__"}
              onValueChange={(type) =>
                field.onChange(type === "__NO_LOCATION_TYPE__" ? "" : type)
              }
            >
              <SelectTrigger
                ref={field.ref}
                onBlur={field.onBlur}
                aria-label="Location type"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NO_LOCATION_TYPE__">
                  Select type
                </SelectItem>
                {locationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
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

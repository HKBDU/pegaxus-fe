import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { LocationFormFields } from "./LocationFormFields";
import { locationFormSchema } from "./location-form-schema";
import type { LocationFormPayload, LocationFormValues } from "./types";

type AddLocationFormProps = {
  initialValues?: Partial<LocationFormValues>;
  onSubmit: (payload: LocationFormPayload) => void;
  onCancel?: () => void;
};

const emptyValues: LocationFormValues = {
  name: "",
  type: "",
  address: "",
  city: "",
  stateProvince: "",
  country: "",
  latitude: 0,
  longitude: 0,
  note: "",
};

export function AddLocationForm({
  initialValues,
  onSubmit,
  onCancel,
}: AddLocationFormProps) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(
      locationFormSchema,
    ) as unknown as Resolver<LocationFormValues>,
    defaultValues: { ...emptyValues, ...initialValues },
  });

  function submit(values: LocationFormValues) {
    onSubmit({ ...values, type: values.type || undefined });
  }

  return (
    <form className="grid gap-5" onSubmit={form.handleSubmit(submit)}>
      <LocationFormFields
        register={form.register}
        errors={form.formState.errors}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Add location</Button>
      </div>
    </form>
  );
}

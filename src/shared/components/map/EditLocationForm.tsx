import { AddLocationForm } from "./AddLocationForm";
import type { LocationFormPayload, LocationFormValues } from "./types";

type EditLocationFormProps = {
  initialValues: LocationFormValues;
  onSubmit: (payload: LocationFormPayload) => void;
  onCancel?: () => void;
};

export function EditLocationForm({
  initialValues,
  onSubmit,
  onCancel,
}: EditLocationFormProps) {
  return (
    <AddLocationForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

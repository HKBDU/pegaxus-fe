import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useRequestAttemptGuard } from "./useRequestAttemptGuard";

export function useFormRequestAttemptGuard<T extends FieldValues>(form: UseFormReturn<T>) {
  const guard = useRequestAttemptGuard();
  const { watch } = form;
  const { reset } = guard;
  const previousValues = useRef(form.getValues());

  useEffect(() => {
    const subscription = watch((values) => {
      const changed = Object.keys(values).some(
        (key) => values[key] !== previousValues.current[key],
      );
      if (!changed) return;
      previousValues.current = { ...values } as T;
      reset();
    });
    return () => subscription.unsubscribe();
  }, [watch, reset]);

  return guard;
}

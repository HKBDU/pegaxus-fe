import { useCallback, useState } from "react";

export type IncidentReportDraft = object;

export function useIncidentReport<T extends IncidentReportDraft>(
  initialValues: T,
) {
  const [values, setValues] = useState<T>(initialValues);

  const update = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const patch = useCallback((nextValues: Partial<T>) => {
    setValues((current) => ({ ...current, ...nextValues }));
  }, []);

  const replace = useCallback((nextValues: T) => setValues(nextValues), []);
  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  return { values, update, patch, replace, reset, setValues };
}

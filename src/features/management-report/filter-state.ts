import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { z } from "zod";
import {
  defaultFilters,
  defaultIncidentFilters,
  readFilters,
  readIncidentFilters,
  writeFilters,
  writeIncidentFilters,
  filterKeys,
  incidentFilterKeys,
  defaultTransitFilters,
  readTransitFilters,
  writeTransitFilters,
  transitFilterKeys,
} from "./filters";
import {
  reportFiltersSchema,
  incidentFiltersSchema,
  transitFiltersSchema,
} from "./schemas";

function useReportFilterState<
  F extends Record<string, string | number> & { pageIndex: number },
>(definition: {
  read: (params: URLSearchParams) => { raw: Record<string, string | number> };
  schema: z.ZodType<F>;
  write: (params: URLSearchParams, filters: F) => URLSearchParams;
  defaults: () => F;
  keys: readonly string[];
  detailKeys: readonly string[];
}) {
  const [params, setParams] = useSearchParams();
  const { raw } = definition.read(params);
  const parsed = definition.schema.safeParse(raw);
  const applied = parsed.success ? parsed.data : null;
  const draftKey = JSON.stringify(
    definition.keys
      .filter((key) => !definition.detailKeys.includes(key))
      .map((key) => raw[key]),
  );
  const [form, setForm] = useState({ key: draftKey, values: raw });
  const [errors, setErrors] = useState<string[]>([]);
  if (form.key !== draftKey) {
    setForm({ key: draftKey, values: raw });
    if (errors.length) setErrors([]);
  }
  const draft = form.key === draftKey ? form.values : raw;
  useEffect(() => {
    if (!params.has("dateFrom") && !params.has("dateTo") && parsed.success)
      setParams(definition.write(params, parsed.data), { replace: true });
  }, [params, parsed, setParams, definition]);
  function change(update: Partial<F>) {
    if (!applied) return;
    const next = definition.schema.safeParse({ ...applied, ...update });
    if (next.success) setParams(definition.write(params, next.data));
  }
  function apply(reload: () => void) {
    const details = Object.fromEntries(
      definition.detailKeys.map((key) => [key, applied?.[key] ?? raw[key]]),
    );
    const result = definition.schema.safeParse({
      ...draft,
      ...details,
      pageIndex: 1,
    });
    if (!result.success) {
      setErrors(
        result.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`,
        ),
      );
      return;
    }
    setErrors([]);
    const next = result.data;
    if (
      applied &&
      JSON.stringify({ ...next, pageIndex: applied.pageIndex }) ===
        JSON.stringify(applied)
    )
      next.pageIndex = applied.pageIndex;
    if (applied && JSON.stringify(next) === JSON.stringify(applied)) {
      reload();
      return;
    }
    setParams(definition.write(params, next));
  }
  function reset() {
    setErrors([]);
    const defaults = definition.defaults();
    setForm({ key: draftKey, values: defaults });
    setParams(definition.write(params, defaults));
  }
  const urlErrors = parsed.success
    ? []
    : parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
  return {
    raw,
    applied,
    draft,
    errors: errors.length ? errors : urlErrors,
    change,
    apply,
    reset,
    edit: (key: string, value: string) =>
      setForm((current) => ({
        ...current,
        values: { ...current.values, [key]: value },
      })),
  };
}

export function useOnTimeFilterState() {
  return useReportFilterState({
    read: readFilters,
    schema: reportFiltersSchema,
    write: writeFilters,
    defaults: defaultFilters,
    keys: filterKeys,
    detailKeys: ["pageIndex", "pageSize", "sortBy", "bucket"],
  });
}
export function useIncidentFilterState() {
  return useReportFilterState({
    read: readIncidentFilters,
    schema: incidentFiltersSchema,
    write: writeIncidentFilters,
    defaults: defaultIncidentFilters,
    keys: incidentFilterKeys,
    detailKeys: ["pageIndex", "pageSize", "sortBy"],
  });
}
export function useTransitFilterState() {
  return useReportFilterState({
    read: readTransitFilters,
    schema: transitFiltersSchema,
    write: writeTransitFilters,
    defaults: defaultTransitFilters,
    keys: transitFilterKeys,
    detailKeys: ["pageIndex", "pageSize", "sortBy", "delayFilter"],
  });
}

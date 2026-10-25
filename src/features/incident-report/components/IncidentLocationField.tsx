export interface IncidentLocationValue {
  occurredAt: string;
  locationId?: string;
  locationDescription: string;
  latitude?: number;
  longitude?: number;
}

export interface IncidentLocationFieldProps {
  value: IncidentLocationValue;
  onChange?: (value: IncidentLocationValue) => void;
  status?:
    | "idle"
    | "locating"
    | "reading"
    | "creating"
    | "ready"
    | "unavailable"
    | "error";
  error?: string | null;
}

export function IncidentLocationField({
  value,
  status = "idle",
  error,
}: IncidentLocationFieldProps) {
  return (
    <section
      className="grid gap-4 border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5"
      aria-label="Incident time and location"
    >
      <div className="space-y-2 text-sm font-bold text-slate-900">
        <span>
          Occurred at <span className="text-red-600">*</span>
        </span>
        <p className="min-h-12 border border-slate-200 bg-slate-50 px-3 py-3 font-normal">
          {value.occurredAt || "Captured on submit"}
        </p>
      </div>
      <div className="space-y-2 text-sm font-bold text-slate-900">
        <span>Location description</span>
        <p className="min-h-12 border border-slate-200 bg-slate-50 px-3 py-3 font-normal">
          {value.locationDescription || "No saved description"}
        </p>
      </div>
      <div className="text-xs font-medium text-slate-500 sm:col-span-2">
        <p>Location ID: {value.locationId ?? "Pending GPS resolution"}</p>
        <p>
          GPS:{" "}
          {value.latitude !== undefined && value.longitude !== undefined
            ? `${value.latitude}, ${value.longitude}`
            : "Unavailable"}
        </p>
        <p>Status: {status}</p>
        {error && (
          <p className="mt-1 text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

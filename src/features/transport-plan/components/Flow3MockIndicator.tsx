import { isFlow3MockMode } from "../source";

export function Flow3MockIndicator() {
  if (import.meta.env.PROD || !isFlow3MockMode()) return null;
  return (
    <p
      role="status"
      className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium tracking-wide text-slate-500"
    >
      MOCK DATA · Development environment
    </p>
  );
}

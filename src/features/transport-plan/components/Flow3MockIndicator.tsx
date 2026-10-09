import { isFlow3MockMode } from "../source"

export function Flow3MockIndicator() {
  if (import.meta.env.PROD || !isFlow3MockMode()) return null
  return <p role="status" className="w-fit rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">MOCK DATA · Development environment</p>
}

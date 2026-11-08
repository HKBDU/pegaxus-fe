/**
 * The colours of the status pill, in the form every list table uses: `border-X-300 bg-X-50 text-X-700`.
 * Kept apart from the component so that file only exports a component.
 */
export const STATUS_BADGE_TONES = {
  amber: "border-amber-300 bg-amber-50 text-amber-700",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
  slate: "border-slate-300 bg-slate-100 text-slate-600",
  red: "border-red-300 bg-red-50 text-red-700",
  sky: "border-sky-300 bg-sky-50 text-sky-700",
  blue: "border-blue-300 bg-blue-50 text-blue-700",
  indigo: "border-indigo-300 bg-indigo-50 text-indigo-700",
  violet: "border-violet-300 bg-violet-50 text-violet-700",
  purple: "border-purple-300 bg-purple-50 text-purple-700",
  cyan: "border-cyan-300 bg-cyan-50 text-cyan-700",
  orange: "border-orange-300 bg-orange-50 text-orange-700",
} as const

export type StatusBadgeTone = keyof typeof STATUS_BADGE_TONES

import { format, parseISO } from "date-fns"
import { AlertTriangle, CalendarClock, Flag, Globe2, type LucideIcon } from "lucide-react"

import {
  DOMESTIC_MIN_DAYS,
  getDepartureRule,
  getDomesticEarliestDate,
  getInternationalEarliestDate,
  INTERNATIONAL_MIN_MONTHS,
  SAME_COUNTRY_MESSAGE,
} from "@/features/booking/lib/departure-rule"
import { cn } from "@/lib/utils"

const showDate = (value: string) => format(parseISO(value), "dd MMM yyyy")

interface RuleCardProps {
  icon: LucideIcon
  title: string
  lead: string
  route: string
  earliest: string
  active: boolean
  dimmed: boolean
}

function RuleCard({ icon: Icon, title, lead, route, earliest, active, dimmed }: RuleCardProps) {
  return (
    <li
      aria-current={active ? "true" : undefined}
      className={cn("border bg-white px-3 py-2", active ? "border-[#ef8f00] bg-[#fffaf1] shadow-[0_0_0_1px_#ef8f00]" : "border-[#e5e2d9]", dimmed && "opacity-60")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-gray-600">
          <Icon className={cn("size-3.5", active ? "text-[#ef8f00]" : "text-gray-400")} aria-hidden="true" />
          {title}
        </span>
        {active ? <span className="rounded-full bg-[#ef8f00] px-2 text-[10px] leading-4 font-semibold text-white">Your route</span> : null}
      </div>
      <p className="m-0 mt-1 flex items-baseline justify-between gap-2 leading-6">
        <span className={cn("font-heading text-lg font-bold uppercase", active ? "text-[#c77700]" : "text-gray-900")}>{lead}</span>
        <span className="text-[11px] leading-4 text-gray-500">
          from <span className="font-semibold text-gray-900">{earliest}</span>
        </span>
      </p>
      <p className="m-0 text-[11px] leading-4 text-gray-500">{route}</p>
    </li>
  )
}

/** Explains the departure-date rule next to the date fields, and highlights the one that applies to the picked route. */
export function DepartureDateGuide({ originCountry, destinationCountry }: { originCountry?: string; destinationCountry?: string }) {
  const rule = getDepartureRule(originCountry, destinationCountry)
  const known = rule.kind === "domestic" || rule.kind === "international"

  return (
    <div role="note" aria-label="Departure date rules" className="mb-3 border border-[#e5e2d9] bg-[#faf9f6] p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
        <h3 className="m-0! flex items-center gap-1.5 font-heading text-[13px]! leading-5! font-bold! tracking-[0.04em]! text-gray-900! uppercase">
          <CalendarClock className="size-4 text-[#ef8f00]" aria-hidden="true" />
          Departure date rules
        </h3>
        <span className="text-[11px] leading-4 text-gray-500">Counted from today. Earlier dates are greyed out in the calendar.</span>
      </div>

      <ul className="m-0 mt-2 grid list-none gap-2 p-0 sm:grid-cols-2">
        <RuleCard
          icon={Flag}
          title="Domestic"
          lead={`${DOMESTIC_MIN_DAYS} days (3 weeks)`}
          route="United Kingdom → United Kingdom"
          earliest={showDate(getDomesticEarliestDate())}
          active={rule.kind === "domestic"}
          dimmed={known && rule.kind !== "domestic"}
        />
        <RuleCard
          icon={Globe2}
          title="International"
          lead={`${INTERNATIONAL_MIN_MONTHS} months`}
          route="Between EU countries, or UK ↔ an EU country"
          earliest={showDate(getInternationalEarliestDate())}
          active={rule.kind === "international"}
          dimmed={known && rule.kind !== "international"}
        />
      </ul>

      {rule.kind === "unsupported" ? (
        <p className="m-0 mt-2 flex items-start gap-1.5 text-xs leading-4 text-red-700" role="alert">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">{SAME_COUNTRY_MESSAGE}.</span> {originCountry} → {destinationCountry} is not accepted: change the pickup or
            destination point.
          </span>
        </p>
      ) : (
        <p className="m-0 mt-2 text-xs leading-4 text-gray-700">
          {known ? (
            <>
              <span className="font-semibold">
                {originCountry} → {destinationCountry}
              </span>
              : pick a departure date from <span className="font-semibold text-[#c77700]">{showDate(rule.minDate)}</span>.{" "}
            </>
          ) : (
            <>Pick the pickup and destination on the map to see which rule applies. </>
          )}
          <span className="text-gray-500">Same-country bookings are only accepted in the United Kingdom (Germany → Germany or Finland → Finland are not).</span>
        </p>
      )}
    </div>
  )
}

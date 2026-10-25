import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  TableCaption,
} from "@/shared/components/ui/table";
import { reportLabel, reportNumber, signedNumber } from "../presentation";
import type { TransitTimeReport } from "../schemas";

const head = "h-10 px-3 font-heading text-xs uppercase";

export function TransitBenchmarks({ report }: { report: TransitTimeReport }) {
  return (
    <section
      aria-labelledby="transit-benchmark-heading"
      className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 bg-white p-4"
    >
      <h2
        id="transit-benchmark-heading"
        className="m-0 font-heading text-base uppercase"
      >
        Route benchmark details
      </h2>
      {report.routeBenchmark.length ? (
        <div className="min-w-0 rounded-[2px] border border-slate-200">
          <Table className="min-w-[680px] text-xs">
            <TableCaption className="sr-only">
              Country-pair duration averages in days. Deviation is actual minus
              estimated duration.
            </TableCaption>
            <TableHeader className="bg-stone-100">
              <TableRow>
                <TableHead scope="col" className={head}>
                  Origin → Destination
                </TableHead>
                {[
                  "Trips",
                  "Estimated days",
                  "Actual days",
                  "Deviation days",
                ].map((label) => (
                  <TableHead
                    key={label}
                    scope="col"
                    className={`${head} text-right`}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.routeBenchmark.map((item) => (
                <TableRow
                  key={JSON.stringify([
                    item.originCountry,
                    item.destinationCountry,
                  ])}
                  className="even:bg-stone-50"
                >
                  <TableCell className="max-w-80 whitespace-normal break-words px-3 py-3 font-medium">
                    {item.originCountry} → {item.destinationCountry}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {reportNumber(item.total)}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {reportNumber(item.avgEstimatedDays)}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {reportNumber(item.avgActualDays)}
                  </TableCell>
                  <TableCell
                    className={`px-3 text-right tabular-nums ${item.avgDeltaDays < 0 ? "text-emerald-700" : item.avgDeltaDays > 0 ? "text-amber-800" : "text-slate-700"}`}
                  >
                    {signedNumber(item.avgDeltaDays)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p role="status" className="m-0 py-4 text-sm text-slate-500">
          No measured country pairs match these report filters.
        </p>
      )}
    </section>
  );
}

export function TransitExclusions({ report }: { report: TransitTimeReport }) {
  const reasons = Object.entries(report.excluded.reasons);
  return (
    <section
      aria-labelledby="transit-exclusions-heading"
      className="min-w-0 space-y-3 rounded-[2px] border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="transit-exclusions-heading"
          className="m-0 font-heading text-base uppercase"
        >
          Data quality · excluded transports
        </h2>
        <p className="m-0 text-sm text-slate-600">
          Total excluded:{" "}
          <strong className="tabular-nums text-slate-900">
            {reportNumber(report.excluded.count)}
          </strong>
        </p>
      </div>
      {reasons.length ? (
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
          {reasons.map(([reason, count]) => (
            <div
              key={reason}
              className="flex min-w-0 items-baseline justify-between gap-3 border-t border-slate-100 pt-2"
            >
              <dt className="break-words text-slate-500">
                {reportLabel(reason)}
              </dt>
              <dd className="m-0 shrink-0 tabular-nums font-medium">
                {reportNumber(count)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="m-0 text-xs text-slate-500">
          No exclusion reason breakdown returned.
        </p>
      )}
    </section>
  );
}

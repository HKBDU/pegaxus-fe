import type { FinancialReport } from "../schemas";
import { financialLabel, pricingLabel, pricingValue } from "../presentation";

export function PricingBreakdown({
  item,
}: {
  item: FinancialReport["suggestedItems"][number];
}) {
  const fields = Object.entries(item.basis);
  if (!fields.length && !item.sourceRefs.length) return null;
  return (
    <details className="mt-1.5 text-[11px]">
      <summary className="w-fit cursor-pointer rounded-[2px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
        Pricing Breakdown
      </summary>
      {fields.length ? (
        <dl className="mt-2 mb-0 grid grid-cols-2 gap-x-3 gap-y-2">
          {fields.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-[10px] font-medium text-slate-500">
                {pricingLabel(key)}
              </dt>
              <dd className="m-0 whitespace-pre-wrap break-words text-slate-700">
                {pricingValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {item.sourceRefs.length ? (
        <ul
          aria-label="Pricing sources"
          className="mt-2 mb-0 list-none space-y-1 border-t border-slate-100 pt-2 pl-0 text-slate-500"
        >
          {item.sourceRefs.map((source, index) => (
            <li
              key={`${source.type}-${source.id}-${index}`}
              className="break-all"
            >
              {financialLabel(source.type)} · {source.id}
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

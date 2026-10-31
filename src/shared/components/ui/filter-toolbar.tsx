import { useId, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface FilterToolbarProps {
  label: string;
  search: ReactNode;
  children: ReactNode;
  sort?: ReactNode;
  actions?: ReactNode;
  activeCount: number;
  onClear: () => void;
}

export function FilterToolbar({
  label,
  search,
  children,
  sort,
  actions,
  activeCount,
  onClear,
}: FilterToolbarProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section aria-label={label} className="min-w-0 space-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="min-w-0 basis-full sm:basis-48 sm:flex-1">{search}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="h-8 rounded-[2px] border-slate-300 bg-white text-xs shadow-none"
        >
          <SlidersHorizontal aria-hidden="true" className="size-3.5" />
          All filters
          {activeCount > 0 ? (
            <span className="rounded-[2px] bg-primary/15 px-1.5 tabular-nums text-foreground">
              {activeCount}
              <span className="sr-only"> active filters</span>
            </span>
          ) : null}
        </Button>
        {sort ? (
          <div className="min-w-0 max-w-full [&>button]:h-8">{sort}</div>
        ) : null}
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 rounded-[2px] px-2 text-xs text-slate-600"
          >
            <X aria-hidden="true" className="size-3.5" />
            Clear all
          </Button>
        ) : null}
        {actions ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:ml-auto">
            {actions}
          </div>
        ) : null}
      </div>
      <div
        id={panelId}
        hidden={!open}
        className="rounded-[2px] border border-slate-200 bg-slate-50/60 p-3"
      >
        <div className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:min-w-0 [&_button[data-slot=popover-trigger]]:w-full">
          {children}
        </div>
      </div>
    </section>
  );
}

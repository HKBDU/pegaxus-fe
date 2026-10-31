import { cn } from "@/lib/utils";

export function HorseLoader({
  size = "panel",
  label = "Loading data...",
  className,
}: {
  size?: "button" | "panel" | "page";
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center gap-3",
        size === "page" && "flex-col py-10",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-grid shrink-0 place-items-center text-primary",
          size === "button"
            ? "size-5"
            : size === "panel"
              ? "size-9"
              : "size-12",
        )}
      >
        <span className="absolute inset-0 rounded-full border-2 border-primary/15 border-t-primary motion-safe:animate-spin motion-reduce:animate-none" />
        <svg viewBox="0 0 32 32" fill="currentColor" className="size-3/5">
          <path d="m22 3-1 6 4 5 3 2-2 5-5-1-3-3-2 5 3 6H8l2-6-2-2-4 2 2-7 5-5 7-2 1-5 2 3Z" />
          <circle cx="23" cy="15" r="1" fill="white" />
        </svg>
      </span>
      <span
        className={cn("text-sm text-slate-500", size === "button" && "sr-only")}
      >
        {label}
      </span>
    </div>
  );
}

import { createContext, useContext } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const TabsContext = createContext<{
  value: string;
  onValueChange?: (value: string) => void;
  variant?: "default" | "underline";
}>({ value: "" });
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  variant = "default",
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "underline";
}) {
  return (
    <TabsContext.Provider
      value={{ value: value ?? defaultValue ?? "", onValueChange, variant }}
    >
      {variant === "underline" ? (
        <TabsPrimitive.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          className={className}
        >
          {children}
        </TabsPrimitive.Root>
      ) : (
        <div className={className}>{children}</div>
      )}
    </TabsContext.Provider>
  );
}
export function TabsList({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const tabs = useContext(TabsContext);
  if (tabs.variant === "underline")
    return (
      <TabsPrimitive.List
        aria-label={ariaLabel}
        className={cn(
          "mb-3 flex flex-wrap gap-1 border-b border-slate-200 p-1",
          className,
        )}
      >
        {children}
      </TabsPrimitive.List>
    );
  return (
    <div role="tablist" aria-label={ariaLabel} className={className}>
      {children}
    </div>
  );
}
export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tabs = useContext(TabsContext);
  if (tabs.variant === "underline")
    return (
      <TabsPrimitive.Trigger
        value={value}
        className={cn(
          "shrink-0 whitespace-nowrap rounded-t-[2px] border-b-2 border-transparent px-4 py-2.5 font-heading text-sm uppercase text-slate-500 outline-none transition-colors duration-200 hover:bg-primary/5 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-slate-900 motion-reduce:transition-none",
          className,
        )}
      >
        {children}
      </TabsPrimitive.Trigger>
    );
  const active = tabs.value === value;
  return (
    <Button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      variant="ghost"
      className={cn(
        "h-8 rounded-[2px] border border-transparent px-3 text-xs font-semibold uppercase tracking-wide transition-colors",
        active
          ? "!bg-[#17191c] !text-white shadow-sm hover:!bg-[#30343a] hover:!text-white"
          : "text-slate-600 hover:border-[#d9d3c7] hover:bg-[#f7f3ea] hover:text-[#17191c]",
        className,
      )}
      onClick={() => tabs.onValueChange?.(value)}
    >
      {children}
    </Button>
  );
}
export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tabs = useContext(TabsContext);
  if (tabs.variant === "underline")
    return (
      <TabsPrimitive.Content
        value={value}
        className={cn(
          "outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30",
          className,
        )}
      >
        {children}
      </TabsPrimitive.Content>
    );
  return tabs.value === value ? (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  ) : null;
}

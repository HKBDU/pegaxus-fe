import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const TabsContext = createContext<{
  value: string;
  onValueChange?: (value: string) => void;
}>({ value: "" });
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider
      value={{ value: value ?? defaultValue ?? "", onValueChange }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}
export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="tablist" className={className}>
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
  return tabs.value === value ? (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  ) : null;
}

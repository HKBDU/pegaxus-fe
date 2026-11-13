import { cn } from "@/lib/utils";

export interface BookingDetailsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BookingDetailsTabs({
  activeTab,
  onTabChange,
}: BookingDetailsTabsProps) {
  const tabs = [
    {
      id: "details",
      label: "Booking Details",
    },
    {
      id: "order-tracking",
      label: "Order Tracking",
    },
    {
      id: "history",
      label: "Status History",
    },
  ];

  return (
    <nav
      aria-label="Booking views"
      className="overflow-x-auto border-b border-slate-200 px-1 mb-5"
    >
      <div className="flex w-max min-w-full items-stretch gap-5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "inline-flex min-h-11 items-center border-b-2 px-0.5 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-primary transition-colors cursor-pointer",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-600 hover:text-primary"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

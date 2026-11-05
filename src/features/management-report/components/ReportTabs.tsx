import { useLocation, useNavigate } from "react-router-dom";
import { ROLE_ROUTES } from "@/app/route-config";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

const views = [
  { path: ROLE_ROUTES.onTimeReport, label: "On-Time Delivery" },
  {
    path: ROLE_ROUTES.incidentClaimReport,
    label: "Incident & Claim Frequency",
  },
  { path: ROLE_ROUTES.transitTimeReport, label: "Transit Time" },
] as const;

export function ReportTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <nav
      aria-label="Dashboard reports"
      className="min-w-0 overflow-x-auto border-b border-slate-200"
    >
      <Tabs
        value={pathname}
        onValueChange={(path) => {
          if (path !== pathname) void navigate(path);
        }}
      >
        <TabsList className="flex w-max min-w-full gap-1 pb-2">
          {views.map((view) => (
            <TabsTrigger key={view.path} value={view.path}>
              {view.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  );
}

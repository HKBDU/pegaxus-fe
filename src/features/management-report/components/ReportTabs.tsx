import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { ROLE_ROUTES } from "@/app/route-config";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

const views = [
  { path: ROLE_ROUTES.onTimeReport, label: "On-Time Delivery" },
  {
    path: ROLE_ROUTES.incidentClaimReport,
    label: "Incident & Claim Frequency",
  },
  { path: ROLE_ROUTES.transitTimeReport, label: "Transit Time" },
] as const;

export function ReportTabs({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <Tabs
      variant="underline"
      className="min-w-0"
      value={pathname}
      onValueChange={(path) => {
        if (path !== pathname) void navigate(path);
      }}
    >
      <TabsList aria-label="Dashboard reports">
        {views.map((view) => (
          <TabsTrigger key={view.path} value={view.path}>
            {view.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={pathname} className="min-w-0 space-y-3">
        {children}
      </TabsContent>
    </Tabs>
  );
}

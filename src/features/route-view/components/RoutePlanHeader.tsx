import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/components/PageHeader";
import { getPlanBackTarget } from "@/app/route-config";
import { useAuthStore } from "@/features/auth/store";
import { ApprovedBookingBadge } from "@/features/transport-plan/components/ApprovedBookingBadge";
import type { RoutePlanDetail } from "../types";
import { Badge } from "@/shared/components/ui/badge";
import { REJECTED_BY_MANAGER } from "@/shared/constants/route-plan-status";

export function RoutePlanHeader({
  plan,
  actions,
  fallbackBack,
}: {
  plan: RoutePlanDetail;
  actions?: ReactNode;
  /** Where Back goes when the page was opened without an earlier page in this tab. */
  fallbackBack?: { href: string; label: string };
}) {
  const navigate = useNavigate();
  const principal = useAuthStore((state) => state.principal);
  // "default" marks the first entry of the tab: there is no earlier page to return to.
  const hasHistory = useLocation().key !== "default";
  // Without history, Back goes to the page this role can open (a Route Coordinator cannot open Transport Plans).
  const fallback = fallbackBack ?? getPlanBackTarget(principal, plan.transportPlanId);
  return (
    <header className="space-y-3">
      <PageHeader
        title="Route Plan Details"
        backHref={fallback.href}
        backLabel={hasHistory ? "Back" : fallback.label}
        onBack={() => {
          if (!hasHistory) return;
          navigate(-1);
          return false;
        }}
      />
      <div className="space-y-3 rounded-[2px] border border-slate-200 border-l-2 border-l-primary bg-white p-3 shadow-xs">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            <h2 className="m-0! min-w-0 break-all font-heading text-lg! leading-6! font-medium text-slate-900">
              {plan.routePlanCode}
            </h2>
            <ApprovedBookingBadge value={plan.routeType} />
            {plan.status === REJECTED_BY_MANAGER ? (
              <Badge variant="outline">Rejected by Logistics Manager</Badge>
            ) : (
              <ApprovedBookingBadge value={plan.status} />
            )}
          </div>
          <p className="text-xs text-slate-500">
            Booking:{" "}
            <span className="font-medium text-slate-700">
              {plan.bookingCode}
            </span>{" "}
            · {plan.isCrossBorder ? "Cross-border" : "Domestic"}
          </p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

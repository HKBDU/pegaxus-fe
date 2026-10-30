import { Outlet } from "react-router-dom";
import logo from "@/assets/logo-dark.png";
import { IncidentAlertHost } from "@/features/incident-management/components/alerts/IncidentAlertHost";

export function CrewShell() {
  return (
    <div className="min-h-svh min-w-0 bg-[#f4f2ed] font-sans">
      <IncidentAlertHost />
      <header className="border-b border-slate-200 bg-[#17191c] px-4 py-3">
        <div className="mx-auto flex w-full max-w-4xl items-center lg:max-w-[1440px] justify-between gap-4">
          <img
            src={logo}
            alt="PEGAXUS"
            className="h-8 w-auto max-w-36 object-contain"
          />
          <span className="text-base font-medium text-white/80">
            Crew workspace
          </span>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

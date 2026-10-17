import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, LoaderCircle, Truck } from "lucide-react";
import { ROLE_ROUTES } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { OngoingTransportFilters } from "../components/OngoingTransportFilters";
import { OngoingTransportMockControls } from "../components/OngoingTransportMockControls";
import { OngoingTransportTable } from "../components/OngoingTransportTable";
import { initialOngoingTransportParams } from "../constants";
import { formatTransportDate } from "../format";
import { useOngoingTransports } from "../hooks/useOngoingTransports";
import { getOngoingTransportError } from "../services";
import type {
  MockScenario,
  OngoingTransportFilterPatch,
  OngoingTransportParams,
} from "../types";
import "../ui.css";

export default function OngoingTransportListPage() {
  const [params, setParams] = useState<OngoingTransportParams>(
    initialOngoingTransportParams,
  );
  const [scenario, setScenario] = useState<MockScenario>("data");
  const search = useDebounce(params.search ?? "", 300);
  const searchPending = search !== (params.search ?? "");
  const query = useOngoingTransports(
    { ...params, search },
    !searchPending,
    scenario,
  );
  const busy = searchPending || query.isFetching || query.isPending;
  const error =
    query.isError && !searchPending
      ? getOngoingTransportError(query.error)
      : null;
  const changeFilters = useCallback((patch: OngoingTransportFilterPatch) => {
    setParams((current) => ({ ...current, ...patch, pageIndex: 0 }));
  }, []);

  const filters = (
    <OngoingTransportFilters params={params} onChange={changeFilters} />
  );
  return (
    <div className="ongoing-transport-ui booking-page-shell min-h-[calc(100svh-5rem)] min-w-0 px-4 py-4 font-sans sm:px-6 lg:py-6">
      <div className="booking-page-enter mx-auto w-full min-w-0 max-w-[1440px] space-y-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[11px] text-slate-500"
        >
          <Link
            to={ROLE_ROUTES.transportPlans}
            className="rounded-[2px] hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            Transport
          </Link>
          <ChevronRight aria-hidden="true" className="size-3" />
          <span aria-current="page" className="font-medium text-slate-700">
            Ongoing Transports
          </span>
        </nav>
        <header className="border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <PageHeader
                title="Ongoing Transports"
                backHref={ROLE_ROUTES.transportPlans}
                showBack={false}
                className="[&_h1]:!my-0 [&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl"
              />
              <p className="mt-1 mb-0 text-xs text-slate-500 sm:text-sm">
                Monitor transportation journeys and operational status.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-[2px] border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs text-slate-600">
              <Truck aria-hidden="true" className="size-3.5 text-primary" />
              <span>
                {query.data && !error
                  ? `${query.data.totalItems} matching transports`
                  : "Transport operations"}
              </span>
            </div>
          </div>
        </header>
        <OngoingTransportMockControls
          scenario={scenario}
          onChange={(value) => {
            setScenario(value);
            setParams((current) => ({ ...current, pageIndex: 0 }));
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-1 px-1 text-[11px] text-slate-500">
          <span>Times shown in your local timezone</span>
          <span role="status" className="flex items-center gap-1.5">
            {busy ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  className="size-3 animate-spin motion-reduce:animate-none"
                />
                Updating transports…
              </>
            ) : error ? (
              "Transport data unavailable"
            ) : query.data ? (
              `Updated ${formatTransportDate(query.data.serverTime)}`
            ) : (
              ""
            )}
          </span>
        </div>
        {error ? (
          <>
            {filters}
            <div className="[&>div]:rounded-[2px] [&>div]:p-6 [&>div]:text-sm">
              <ErrorState
                message={error.message}
                onRetry={
                  error.retryable ? () => void query.refetch() : undefined
                }
              />
            </div>
          </>
        ) : (
          <OngoingTransportTable
            page={query.data}
            params={params}
            initialLoading={!query.data && query.isPending}
            busy={busy}
            filters={filters}
            onChange={changeFilters}
            onPageChange={(pageIndex) => {
              if (!busy) setParams((current) => ({ ...current, pageIndex }));
            }}
          />
        )}
        <p className="m-0 px-1 text-[11px] text-slate-500">
          Transport Overview will be available in the next phase. View progress
          actions are currently disabled.
        </p>
      </div>
    </div>
  );
}

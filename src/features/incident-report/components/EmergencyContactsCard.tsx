import { Phone, RefreshCw } from "lucide-react";

import type { EmergencyContact } from "@/shared/types/incident";
import { Button } from "@/shared/components/ui/button";

export interface EmergencyContactsCardProps {
  contacts: EmergencyContact[];
  isLoading?: boolean;
  isCached?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function EmergencyContactsCard({
  contacts,
  isLoading = false,
  isCached = false,
  error,
  onRetry,
}: EmergencyContactsCardProps) {
  return (
    <section
      className="space-y-4 border border-slate-200 bg-white p-4 sm:p-5"
      aria-label="Emergency contacts"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Emergency hotline
          </p>
          <h2 className="mt-1 font-heading text-lg font-bold text-[#181818]">
            Contact the transport team
          </h2>
        </div>
        {isCached && (
          <span className="border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
            Offline cache
          </span>
        )}
      </div>
      {isLoading && (
        <p className="text-sm text-slate-600">Loading emergency contacts…</p>
      )}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              className="min-h-10 rounded-[2px]"
            >
              <RefreshCw className="mr-2 size-4" />
              Retry
            </Button>
          )}
        </div>
      )}
      {!isLoading && contacts.length === 0 && !error && (
        <p className="text-sm text-slate-600">
          No emergency contact is available.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {contacts.map((contact) => (
          <article
            key={contact.employeeId}
            className="flex items-center gap-3 border border-slate-200 p-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center bg-[#f39200] text-[#181818]">
              <Phone className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#181818]">
                {contact.fullName}
              </p>
              <p className="text-xs text-slate-500">{contact.role}</p>
            </div>
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="min-h-10 shrink-0 border border-[#f39200] px-3 py-2 text-sm font-bold text-[#181818]"
              >
                Call
              </a>
            ) : (
              <span className="text-xs text-slate-500">No phone</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

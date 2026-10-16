import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  getTransportProviders,
  getRoutePlanError,
  updateSegmentOutsourcing,
} from "../services";
import type { Provider, RouteSegment, TransportMode } from "../types";

export type OutsourceSegmentSelection = {
  provider: Provider;
  note: string;
};

type OutsourceSegmentDialogProps = {
  routePlanId?: string;
  routePlanRouteId: string;
  transportMode: TransportMode;
  isOutsourced: boolean;
  currentProvider?: Provider | null;
  currentNote?: string | null;
  children?: ReactNode;
  onChanged?: (
    selection: OutsourceSegmentSelection | null,
    segment?: RouteSegment,
  ) => void;
};

export function OutsourceSegmentDialog({
  routePlanId,
  routePlanRouteId,
  transportMode,
  isOutsourced,
  currentProvider,
  currentNote,
  children,
  onChanged,
}: OutsourceSegmentDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState(
    currentProvider?.transportProviderId ?? "",
  );
  const [serviceReference, setServiceReference] = useState(currentNote ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || isOutsourced) return;
    let active = true;
    setIsLoading(true);
    void getTransportProviders({
      status: "ACTIVE",
      supportedMode: transportMode,
      pageIndex: 1,
      pageSize: 100,
    })
      .then((result) => {
        if (active) setProviders(result.items);
      })
      .catch((requestError) => {
        if (active) setError(getRoutePlanError(requestError).message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOutsourced, open, transportMode]);

  const selectedProvider =
    providers.find((provider) => provider.transportProviderId === providerId) ??
    currentProvider ??
    null;

  function reset() {
    setProviderId(currentProvider?.transportProviderId ?? "");
    setServiceReference(currentNote ?? "");
    setError(null);
  }

  async function saveOutsourcing() {
    if (!selectedProvider) {
      setError(
        "Please select a valid Transport Provider for this outsourced segment.",
      );
      return;
    }
    setIsSaving(true);
    setError(null);
    const selection = {
      provider: selectedProvider,
      note: serviceReference.trim(),
    };
    try {
      const result = routePlanId
        ? await updateSegmentOutsourcing(routePlanId, routePlanRouteId, {
            outsourced: true,
            transportProviderId: selectedProvider.transportProviderId,
            note: selection.note || undefined,
          })
        : undefined;
      onChanged?.(selection, result?.segment);
      if (routePlanId) await queryClient.invalidateQueries({ queryKey: ["route-view", "detail", routePlanId] });
      setOpen(false);
      toast.success("Outsourcing provider linked to segment.");
    } catch (requestError) {
      const mapped = getRoutePlanError(requestError);
      setError(mapped.message);
      toast.error(mapped.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function switchToInternal() {
    setIsSaving(true);
    setError(null);
    try {
      const result = routePlanId
        ? await updateSegmentOutsourcing(routePlanId, routePlanRouteId, {
            outsourced: false,
          })
        : undefined;
      onChanged?.(null, result?.segment);
      if (routePlanId) await queryClient.invalidateQueries({ queryKey: ["route-view", "detail", routePlanId] });
      setOpen(false);
      toast.success("Segment switched to internal fleet.");
    } catch (requestError) {
      const mapped = getRoutePlanError(requestError);
      setError(mapped.message);
      toast.error(mapped.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline">
            {isOutsourced ? "Manage outsource" : "Outsource segment"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isOutsourced ? "Manage outsourced segment" : "Outsource segment"}
          </DialogTitle>
          <DialogDescription>
            Select a provider supporting {transportMode}.
          </DialogDescription>
        </DialogHeader>
        {isOutsourced ? (
          <div className="grid gap-3">
            <div className="rounded border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Current provider</span>
              <p className="font-semibold">
                {currentProvider?.providerName ?? "Provider linked"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => void switchToInternal()}
            >
              Switch to internal fleet
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Transport Provider <span className="text-destructive">*</span>
              <select
                className="h-9 rounded border bg-background px-3 font-normal"
                value={providerId}
                disabled={isLoading || isSaving}
                onChange={(event) => setProviderId(event.target.value)}
              >
                <option value="">
                  {isLoading ? "Loading active providers…" : "Select provider"}
                </option>
                {providers.map((provider) => (
                  <option
                    key={provider.transportProviderId}
                    value={provider.transportProviderId}
                  >
                    {provider.providerName} · {provider.providerCode}
                  </option>
                ))}
              </select>
            </label>
            {selectedProvider && (
              <Badge variant="outline">
                Supports: {selectedProvider.supportedModes.join(", ")}
              </Badge>
            )}
            <label className="grid gap-2 text-sm font-medium">
              Service type / reference / note
              <Textarea
                value={serviceReference}
                disabled={isSaving}
                onChange={(event) => setServiceReference(event.target.value)}
                placeholder="AIR_CHARTER · flight number · AWB · booking reference"
              />
            </label>
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          {!isOutsourced && (
            <Button
              type="button"
              disabled={isLoading || isSaving}
              onClick={() => void saveOutsourcing()}
            >
              {isSaving ? "Saving…" : "Confirm provider link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

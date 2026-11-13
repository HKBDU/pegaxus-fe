import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { HorseLoader } from "@/shared/components/common/HorseLoader";
import {
  PRICE_LIST_HEADER_DEFAULTS,
  PRICE_LIST_HEADER_LIMITS,
} from "../header.constants";
import {
  priceListHeaderFormSchema,
  priceListHeaderPayload,
  type PriceListEditableHeader,
  type PriceListHeader,
  type PriceListHeaderFormValues,
} from "../header.schemas";
import {
  useCreatePriceList,
  useUpdatePriceList,
} from "../hooks/usePriceListHeaderMutations";
import {
  getPriceListHeaderError,
  getPriceListHeaderErrorMessage,
  PriceListHeaderApiError,
} from "../services/header";

export interface PriceListFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceList?: PriceListEditableHeader;
  onSaved: (priceList: PriceListHeader) => void;
}

export function PriceListFormDialog(props: PriceListFormDialogProps) {
  const create = useCreatePriceList();
  const update = useUpdatePriceList(props.priceList?.priceListId ?? "");
  const mutation = props.mode === "create" ? create : update;
  const pending = create.isPending || update.isPending;
  const missing = props.mode === "edit" && !props.priceList;
  const close = () => props.onOpenChange(false);
  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (!pending) props.onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {props.mode === "create" ? "Create price list" : "Edit price list"}
          </DialogTitle>
          <DialogDescription>
            {props.mode === "create"
              ? "Create an inactive price list, then add its price lines."
              : "Update the header of this inactive price list."}
          </DialogDescription>
        </DialogHeader>
        {!mutation.allowed || missing ? (
          <p role="alert" className="text-sm text-destructive">
            {missing
              ? "Load the price list before editing its header."
              : "Only Logistics Managers can manage price lists."}
          </p>
        ) : props.open ? (
          <HeaderForm
            key={`${mutation.scope}:${props.mode}:${props.priceList?.priceListId ?? "new"}`}
            priceList={props.mode === "edit" ? props.priceList : undefined}
            pending={pending}
            rateLimited={mutation.rateLimited}
            onClose={close}
            save={(values, snapshot) => {
              const input = priceListHeaderPayload(values);
              if (props.mode === "create") return create.mutateAsync(input);
              if (!snapshot)
                throw new PriceListHeaderApiError("PRICE_LIST_NOT_FOUND");
              // snapshot belongs to the edit session, not a later background refetch.
              return update.mutateAsync({
                ...input,
                lastUpdatedAt: snapshot.updatedAt,
              });
            }}
            current={mutation.isCurrent}
            onSaved={(result) => {
              toast.success(
                props.mode === "create"
                  ? "Price list created."
                  : "Price list updated.",
              );
              props.onSaved(result);
              close();
            }}
            onLocked={() => {
              toast.error(
                getPriceListHeaderErrorMessage(
                  new PriceListHeaderApiError("ACTIVE_PRICELIST_LOCKED"),
                ),
              );
              close();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HeaderForm({
  priceList,
  pending,
  rateLimited,
  onClose,
  save,
  current,
  onSaved,
  onLocked,
}: {
  priceList?: PriceListEditableHeader;
  pending: boolean;
  rateLimited: boolean;
  onClose: () => void;
  current: () => boolean;
  save: (
    values: PriceListHeaderFormValues,
    snapshot?: PriceListEditableHeader,
  ) => Promise<PriceListHeader>;
  onSaved: (result: PriceListHeader) => void;
  onLocked: () => void;
}) {
  const [snapshot] = useState(() => (priceList ? { ...priceList } : undefined));
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const [error, setError] = useState<PriceListHeaderApiError | null>(null);
  const [reloading, setReloading] = useState(false);
  const client = useQueryClient();
  const form = useForm<PriceListHeaderFormValues>({
    resolver: zodResolver(priceListHeaderFormSchema),
    defaultValues: snapshot
      ? {
          name: snapshot.name,
          currency: snapshot.currency,
          taxRate: String(snapshot.taxRate),
          depositRate: String(snapshot.depositRate),
        }
      : { ...PRICE_LIST_HEADER_DEFAULTS },
  });
  const conflict = error?.errorCode === "PRICE_LIST_MODIFIED";
  const locked = snapshot?.isActive === true;
  const busy = pending || form.formState.isSubmitting || reloading;
  async function submit(values: PriceListHeaderFormValues) {
    if (!active.current || busy || rateLimited || locked || conflict) return;
    setError(null);
    form.clearErrors();
    let result: PriceListHeader;
    try {
      result = await save(values, snapshot);
    } catch (failure) {
      if (!active.current || !current()) return;
      const parsed = getPriceListHeaderError(failure);
      if (parsed.errorCode === "ACTIVE_PRICELIST_LOCKED") {
        onLocked();
        return;
      }
      setError(parsed);
      for (const issue of parsed.errors) {
        const field = issue.field.split(".").at(-1);
        if (
          field === "name" ||
          field === "currency" ||
          field === "taxRate" ||
          field === "depositRate"
        )
          form.setError(field, { type: "server", message: issue.message });
      }
      return;
    }
    if (active.current && current()) onSaved(result);
  }
  async function reload() {
    setReloading(true);
    try {
      await client.invalidateQueries(
        { queryKey: ["price-lists"] },
        { throwOnError: true },
      );
      if (current()) onClose();
    } catch {
      if (current())
        toast.error(
          "Unable to reload the price list. Your edits are still available.",
        );
    } finally {
      setReloading(false);
    }
  }
  const fields = [
    { name: "name", label: "Name", hint: undefined },
    {
      name: "currency",
      label: "Currency",
      hint: "Only VND price lists can be activated.",
    },
    {
      name: "taxRate",
      label: "VAT rate (%)",
      hint: "Applies to every invoice except credit notes.",
    },
    {
      name: "depositRate",
      label: "Deposit rate (%)",
      hint: "Deposit = this % of the quotation subtotal.",
    },
  ] as const;
  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
        className="space-y-4"
        aria-busy={busy}
      >
        <fieldset
          disabled={busy || locked}
          className="grid min-w-0 gap-3 sm:grid-cols-2"
        >
          {fields.map(({ name, label, hint }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem
                  className={
                    name === "name" ? "min-w-0 sm:col-span-2" : "min-w-0"
                  }
                >
                  <FormLabel className="text-xs">{label}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="off"
                      inputMode={
                        name === "taxRate" || name === "depositRate"
                          ? "decimal"
                          : "text"
                      }
                      maxLength={
                        name === "name"
                          ? PRICE_LIST_HEADER_LIMITS.nameMax
                          : name === "currency"
                            ? 3
                            : undefined
                      }
                      className="h-9 rounded-[2px]"
                    />
                  </FormControl>
                  {hint ? (
                    <FormDescription className="text-xs">
                      {hint}
                    </FormDescription>
                  ) : null}
                  <div className="min-h-4">
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />
          ))}
        </fieldset>
        {locked || error ? (
          <div
            role="alert"
            className="space-y-2 border-l-2 border-destructive bg-red-50 p-3 text-sm text-destructive"
          >
            <p>
              {getPriceListHeaderErrorMessage(
                locked
                  ? new PriceListHeaderApiError("ACTIVE_PRICELIST_LOCKED")
                  : error,
              )}
            </p>
            {conflict ? (
              <>
                <p className="text-xs">
                  Reloading closes this dialog and discards your unsaved edits.
                  Reopen Edit to use the latest values.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void reload()}
                >
                  Discard edits &amp; reload
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || rateLimited || locked || conflict}
          >
            {pending ? (
              <HorseLoader size="button" label="Saving price list" />
            ) : null}
            {pending ? "Saving..." : "Save price list"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

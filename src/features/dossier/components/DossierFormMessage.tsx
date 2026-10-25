import { FormMessage, useFormField } from "@/shared/components/ui/form";

export function DossierFormMessage() {
  const { error } = useFormField();
  return (
    <div
      className="h-10 min-w-0 overflow-y-auto rounded-[2px] focus-visible:outline-2 focus-visible:outline-ring"
      tabIndex={error ? 0 : undefined}
      aria-label={error ? "Validation message" : undefined}
    >
      <FormMessage
        role="alert"
        className="text-xs leading-5 [overflow-wrap:anywhere]"
      />
    </div>
  );
}

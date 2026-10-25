import { ProviderFormSections } from "@/features/fleet/components/ProviderForm"
import { useProviderForm } from "@/features/fleet/hooks/useProviderForm"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Form } from "@/shared/components/ui/form"

interface ProviderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** SCR-F3-021 (UC-41), create mode: a popup. Editing a provider has its own page (ProviderEditPage). */
export function ProviderFormDialog({ open, onOpenChange }: ProviderFormDialogProps) {
  const { form, submit, isSaving } = useProviderForm(null, { enabled: open, onSaved: () => onOpenChange(false) })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* flex column + min-h-0 body: the header and footer stay put and only the fields scroll */}
      <DialogContent className="flex max-h-[92dvh] min-h-0 flex-col gap-0 overflow-hidden rounded-[2px] border-slate-200 bg-[#f4f2ed] p-0 sm:max-w-[720px]">
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 text-left">
          <DialogTitle className="m-0! font-heading text-2xl! font-bold! uppercase tracking-[0.02em]! text-[#ef8f00]!">Create transport provider</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">Register a new transport provider for horse transport services.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            {/* A <fieldset> does not reliably act as a scroll container, so the scrolling div wraps it. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              <fieldset disabled={isSaving} className="m-0 min-w-0 border-0 p-0">
                <ProviderFormSections form={form} isEdit={false} />
              </fieldset>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-900 shadow-none" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="h-8 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 shadow-none hover:bg-[#db8300]">
                {isSaving ? "Saving..." : "Save provider"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

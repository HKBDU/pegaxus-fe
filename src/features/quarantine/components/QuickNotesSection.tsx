import type { UseFormReturn } from 'react-hook-form'
import { Textarea } from '@/shared/components/ui/textarea'
import { Field } from '@/shared/components/Field'
import { FormControl, FormField, FormItem } from '@/shared/components/ui/form'
import { cn } from '@/lib/utils'
import { QuarantineSectionHeader } from './QuarantineSectionHeader'

interface QuickNotesSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  title?: string
  label?: string
  placeholder?: string
}

export function QuickNotesSection({
  form,
  title = 'Quick Notes',
  label = 'Additional Notes',
  placeholder = 'Note any physical checks, horse temperaments, transit delay, or inspection remarks…',
}: QuickNotesSectionProps) {
  return (
    <section className="space-y-3 border border-[#e5e2d9] bg-white p-5">
      <QuarantineSectionHeader title={title} />
      <FormField
        control={form.control}
        name="quickNote"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormControl>
              {/* Field handles label + error — no <FormMessage /> */}
              <Field label={label} error={fieldState.error?.message}>
                <Textarea
                  {...field}
                  id="additional-note"
                  rows={4}
                  placeholder={placeholder}
                  className={cn(
                    'w-full resize-none border bg-white px-3 py-2 text-sm text-[#181818] placeholder:text-[#bbb] focus:outline-none focus:ring-1 transition-colors',
                    fieldState.error
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-[#e5e2d9] focus:border-[#f39200] focus:ring-[#f39200]',
                  )}
                />
              </Field>
            </FormControl>
          </FormItem>
        )}
      />
    </section>
  )
}

import type { UseFormReturn } from 'react-hook-form'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Field } from '@/shared/components/Field'
import {
  FormControl,
  FormField,
  FormItem,
} from '@/shared/components/ui/form'
import { QuarantineSectionHeader } from './QuarantineSectionHeader'

// Input className base — always matches Field's default box style
const INPUT_BASE =
  'w-full border bg-white px-3 py-1.5 text-[13px] font-medium text-[#181818] ' +
  'placeholder:text-[#bbb] focus:outline-none focus:ring-1 transition-colors'

function inputCn(hasError: boolean) {
  return cn(
    INPUT_BASE,
    hasError
      ? 'border-red-500 focus:ring-red-400'
      : 'border-[#f39200] focus:ring-[#f39200]',
  )
}

interface BcpLocationSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
  isHoldback: boolean
}

export function BcpLocationSection({ form, isHoldback }: BcpLocationSectionProps) {
  return (
    <section className="space-y-4 border border-[#e5e2d9] bg-white p-5">
      <QuarantineSectionHeader title="Location & Inspection" />

      {/* 1. BCP Location (required) */}
      <FormField
        control={form.control}
        name="bcpName"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormControl>
              {/* Field handles label + error text — no <FormMessage /> needed */}
              <Field label="BCP Location" error={fieldState.error?.message}>
                <input
                  {...field}
                  id="bcp-location-input"
                  placeholder="e.g. Dublin Port BCP (IE DUB)"
                  className={inputCn(!!fieldState.error)}
                />
              </Field>
            </FormControl>
          </FormItem>
        )}
      />

      {/* 2. Official Veterinarian & 3. Clearance Receipt Number */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="officialVetName"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormControl>
                <Field label="Official Veterinarian" error={fieldState.error?.message}>
                  <input
                    {...field}
                    id="official-vet-input"
                    placeholder="e.g. Dr. Arthur Pendelton"
                    className={inputCn(!!fieldState.error)}
                  />
                </Field>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bcpReceiptNumber"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormControl>
                <Field label="VET Clearance Receipt Number" error={fieldState.error?.message}>
                  <input
                    {...field}
                    id="bcp-receipt-input"
                    placeholder="e.g. BCP-IE-2026-8841"
                    className={inputCn(!!fieldState.error)}
                  />
                </Field>
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Fast operational signal: flag the trip now, complete the detailed report later. */}
      <FormField
        control={form.control}
        name="isHoldback"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3 border border-[#e5e2d9] bg-[#f4f4f4] p-3">
              <button
                type="button"
                id="is-holdback-toggle"
                role="checkbox"
                aria-checked={isHoldback}
                aria-label="Mark trip as holdback"
                onClick={() => field.onChange(!isHoldback)}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center border transition-colors',
                  isHoldback ? 'border-[#f39200] bg-[#f39200]' : 'border-[#d1cec7] bg-white',
                )}
              >
                {isHoldback && <CheckCircle2 className="size-3.5 text-white" aria-hidden />}
              </button>
              <span className="text-sm font-medium text-[#181818]">Mark as holdback / report issue.</span>
              <button
                type="button"
                className="font-bold text-[#f39200] underline hover:no-underline"
                onClick={() => toast.info('UC Report for Incident: UC-55, UC-56, UC-57 have not finished yet')}
              >
                Report?
              </button>
            </div>
          </FormItem>
        )}
      />

    </section>
  )
}

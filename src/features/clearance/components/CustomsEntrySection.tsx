import type { UseFormReturn } from 'react-hook-form'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Field } from '@/shared/components/Field'
import { FormControl, FormField, FormItem } from '@/shared/components/ui/form'
import { QuarantineSectionHeader } from '@/features/quarantine/components/QuarantineSectionHeader'

const INPUT = 'w-full border bg-white px-3 py-2 text-[13px] font-medium text-[#181818] focus:outline-none focus:ring-1 focus:ring-[#f39200]'

interface CustomsEntrySectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>
}

export function CustomsEntrySection({ form }: CustomsEntrySectionProps) {
  return (
    <section className="space-y-4 border border-[#e5e2d9] bg-white p-5">
      <QuarantineSectionHeader title="Customs Entry & Clearance" />
      <FormField control={form.control} name="customsPortName" render={({ field, fieldState }) => (
        <FormItem><FormControl><Field label="Customs Office / Border Post" error={fieldState.error?.message}>
          <input {...field} id="customs-port-input" className={cn(INPUT, fieldState.error && 'border-red-500')} placeholder="e.g. Dover Western Docks Customs Point (GB DOV)" />
        </Field></FormControl></FormItem>
      )} />
      <FormField control={form.control} name="mrnNumber" render={({ field, fieldState }) => (
        <FormItem><FormControl><Field label="Movement Reference Number" error={fieldState.error?.message}>
          <input {...field} id="mrn-number-input" className={cn(INPUT, fieldState.error && 'border-red-500')} placeholder="e.g. 26GB984210088421M0" />
        </Field></FormControl></FormItem>
      )} />
      <FormField control={form.control} name="customsLane" render={({ field }) => (
        <FormItem><FormControl><div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#181818]">Routing Channel (Customs Route)</p>
          <div className="grid grid-cols-3 gap-2">
            {(['GREEN_LANE', 'ORANGE_LANE', 'RED_LANE'] as const).map((lane) => (
              <button key={lane} type="button" onClick={() => field.onChange(lane)} className={cn('border px-2 py-2 text-[11px] font-bold uppercase', field.value === lane ? 'border-[#f39200] bg-[#fff8ed]' : 'border-[#d8d5ce] bg-white')}>
                <span className={cn('mr-1', lane === 'GREEN_LANE' ? 'text-emerald-600' : lane === 'ORANGE_LANE' ? 'text-orange-500' : 'text-red-500')}>■</span>{lane.replace('_LANE', '')}
              </button>
            ))}
          </div>
        </div></FormControl></FormItem>
      )} />
      <FormField control={form.control} name="isHeld" render={({ field }) => (
        <FormItem><div className="flex items-center gap-3 bg-[#f4f4f4] p-3">
          <button type="button" role="checkbox" aria-checked={field.value} aria-label="Mark as held" onClick={() => field.onChange(!field.value)} className={cn('flex h-5 w-5 items-center justify-center border', field.value ? 'border-[#f39200] bg-[#f39200]' : 'border-[#bbb] bg-white')}>
            {field.value && <CheckCircle2 className="size-3.5 text-white" aria-hidden />}
          </button>
          <span className="text-sm font-medium">Mark as Held / Inspection Detained.</span>
          <button type="button" className="font-bold text-[#f39200] underline" onClick={() => toast.info('UC Report for Incident: UC-55, UC-56, UC-57 have not finished yet')}>Report?</button>
        </div></FormItem>
      )} />
      {/* Held is an immediate operational signal; driver can complete the detailed note later. */}
    </section>
  )
}

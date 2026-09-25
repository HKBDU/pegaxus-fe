import { useForm, type SubmitHandler } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { PageHeader } from "@/shared/components/PageHeader"
import { Field } from "@/shared/components/Field"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/shared/components/ui/form"
import { horseApi } from "../services"
import { HORSE_BREED_OPTIONS, HORSE_SEX_OPTIONS } from "../constants/horse.constants"
import type { CreateHorseRequest, Horse, HorseFormValues, HorseSex } from "../types"

const inputClass = "profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1"
const selectOptions = HORSE_SEX_OPTIONS.filter((option) => option.value !== "ALL")
const breedOptions = HORSE_BREED_OPTIONS.filter((option) => option.value !== "ALL")

type HorseFormPageProps = {
  mode: "create" | "edit"
  initialHorse?: Horse
}

function toFormValues(horse?: Horse): HorseFormValues {
  return {
    horseName: horse?.horseName ?? "",
    sex: horse?.sex ?? "",
    breed: horse?.breed ?? "",
    dateOfBirth: horse?.dateOfBirth ?? "",
    color: horse?.color ?? "",
    countryOfOrigin: horse?.countryOfOrigin ?? "",
    weightKg: horse?.weightKg == null ? "" : String(horse.weightKg),
    heightCm: horse?.heightCm == null ? "" : String(horse.heightCm),
    passportNumber: horse?.passportNumber ?? "",
    microchipNumber: horse?.microchipNumber ?? "",
    identificationNotes: horse?.identificationNotes ?? "",
  }
}

function toCreateRequest(values: HorseFormValues): CreateHorseRequest {
  const optionalNumber = (value: string) => value === "" ? undefined : Number(value)
  const optionalString = (value: string) => value.trim() || undefined

  return {
    horseName: values.horseName.trim(),
    sex: (values.sex || undefined) as HorseSex | undefined,
    breed: optionalString(values.breed),
    dateOfBirth: optionalString(values.dateOfBirth),
    color: optionalString(values.color),
    countryOfOrigin: optionalString(values.countryOfOrigin),
    weightKg: optionalNumber(values.weightKg),
    heightCm: optionalNumber(values.heightCm),
    passportNumber: optionalString(values.passportNumber),
    microchipNumber: optionalString(values.microchipNumber),
    identificationNotes: optionalString(values.identificationNotes),
  }
}

export function HorseFormPage({ mode, initialHorse }: HorseFormPageProps) {
  const navigate = useNavigate()
  const form = useForm<HorseFormValues>({ defaultValues: toFormValues(initialHorse) })
  const isEdit = mode === "edit"

  const onSubmit: SubmitHandler<HorseFormValues> = async (values) => {
    const input = toCreateRequest(values)
    try {
      if (isEdit && initialHorse) await horseApi.updateHorse(initialHorse.horseId, input)
      else await horseApi.createHorse(input)
      toast.success(isEdit ? "Horse updated successfully." : "Horse created successfully.")
      navigate("/my-horses")
    } catch {
      toast.error(isEdit ? "Unable to update horse. Please try again." : "Unable to create horse. Please try again.")
    }
  }

  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col">
        <PageHeader title={isEdit ? "EDIT HORSE" : "ADD HORSE"} backHref="/my-horses" />
        <Form {...form}>
          <form id={`${mode}-horse-form`} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col pt-4">
            <div className="grid auto-rows-min gap-x-6 gap-y-3 pb-4 md:grid-cols-2 lg:grid-cols-3">
              <FormField control={form.control} name="horseName" rules={{ required: "Horse name is required." }} render={({ field }) => <Field label="HORSE NAME"><FormItem><FormControl><Input {...field} className={inputClass} maxLength={150} /></FormControl><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="sex" render={({ field }) => <Field label="SEX"><FormItem><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select sex" /></SelectTrigger></FormControl><SelectContent>{selectOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="breed" render={({ field }) => <Field label="BREED"><FormItem><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select breed" /></SelectTrigger></FormControl><SelectContent>{breedOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => <Field label="DATE OF BIRTH"><FormItem><FormControl><Input {...field} className={inputClass} type="date" /></FormControl><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="color" render={({ field }) => <Field label="COLOR"><FormItem><FormControl><Input {...field} className={inputClass} maxLength={100} /></FormControl><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="countryOfOrigin" render={({ field }) => <Field label="COUNTRY OF ORIGIN"><FormItem><FormControl><Input {...field} className={inputClass} maxLength={100} /></FormControl><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="weightKg" rules={{ min: { value: 0, message: "Weight cannot be negative." } }} render={({ field }) => <Field label="WEIGHT (KG)"><FormItem><FormControl><Input {...field} className={inputClass} type="number" min="0" step="0.1" /></FormControl><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="heightCm" rules={{ min: { value: 0, message: "Height cannot be negative." } }} render={({ field }) => <Field label="HEIGHT (CM)"><FormItem><FormControl><Input {...field} className={inputClass} type="number" min="0" step="0.1" /></FormControl><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="passportNumber" render={({ field }) => <Field label="PASSPORT NUMBER"><FormItem><FormControl><Input {...field} className={inputClass} maxLength={100} /></FormControl><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="microchipNumber" render={({ field }) => <Field label="MICROCHIP NUMBER"><FormItem><FormControl><Input {...field} className={inputClass} maxLength={100} /></FormControl><FormMessage /></FormItem></Field>} />
              <FormField control={form.control} name="identificationNotes" render={({ field }) => <Field label="IDENTIFICATION NOTES" className="md:col-span-2 lg:col-span-3"><FormItem><FormControl><Textarea {...field} className="profile-edit-field !h-[72px] min-h-[72px] resize-none" maxLength={1000} /></FormControl><FormMessage /></FormItem></Field>} />
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-[hsl(var(--border))] pt-4">
              <Button type="button" variant="outline" className="h-9 rounded-none border-[#181818] bg-white px-6 py-2 text-xs font-bold tracking-[0.6px] text-[#181818] uppercase shadow-[0_1px_1px_rgba(0,0,0,0.05)]" onClick={() => navigate("/my-horses")}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-9 rounded-none py-2 text-xs font-bold tracking-[0.6px] uppercase shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#f39200]">{form.formState.isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
            </div>
          </form>
        </Form>
      </div>
    </section>
  )
}

export function AddHorsePage() {
  return <HorseFormPage mode="create" />
}

export default AddHorsePage

import { useForm, type SubmitHandler } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { CountrySelect } from "@/shared/components/ui/country-select"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Form, FormControl, FormField, FormItem } from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { HORSE_BREED_OPTIONS, HORSE_SEX_OPTIONS } from "../constants/horse.constants"
import { horseApi } from "../services"
import { getHorseApiErrorMessage } from "../utils/horse-api-error"
import { toHorseDateInput } from "../utils/format-horse-date"
import type { CreateHorseRequest, Horse, HorseFormValues, HorseSex } from "../types"

const inputClass = "profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1"
const selectOptions = HORSE_SEX_OPTIONS.filter((option) => option.value !== "ALL")
const breedOptions = HORSE_BREED_OPTIONS.filter((option) => option.value !== "ALL")
const requiredText = (label: string) => ({ required: `${label} is required.`, validate: (value: string) => value.trim().length > 0 || `${label} is required.` })
const requiredNumber = (label: string) => ({ required: `${label} is required.`, validate: (value: string) => { const number = Number(value); return value.trim() !== "" && Number.isFinite(number) && number >= 0 || `${label} must be a valid non-negative number.` } })
const passportNumberRules = { required: "Passport number is required.", validate: (value: string) => /^[A-Z0-9]{15}$/.test(value) || "Passport number must be exactly 15 uppercase letters or numbers (A-Z, 0-9)." }
const microchipNumberRules = { required: "Microchip number is required.", validate: (value: string) => /^\d{15}$/.test(value) || "Microchip number must be exactly 15 digits." }

type HorseFormPageProps = { mode: "create" | "edit"; initialHorse?: Horse }

function toFormValues(horse?: Horse): HorseFormValues {
  return {
    horseName: horse?.horseName ?? "",
    sex: horse?.sex ?? "",
    breed: horse?.breed ?? "",
    dateOfBirth: toHorseDateInput(horse?.dateOfBirth),
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
  return {
    horseName: values.horseName.trim(),
    sex: values.sex as HorseSex,
    breed: values.breed.trim(),
    dateOfBirth: values.dateOfBirth,
    color: values.color.trim(),
    countryOfOrigin: values.countryOfOrigin.trim(),
    weightKg: Number(values.weightKg),
    heightCm: Number(values.heightCm),
    passportNumber: values.passportNumber.trim(),
    microchipNumber: values.microchipNumber.trim(),
    identificationNotes: values.identificationNotes.trim(),
  }
}

type HorseFormProps = {
  mode: "create" | "edit"
  initialHorse?: Horse
  /** Receives the created horse (undefined after an edit). */
  onSaved: (horse?: Horse) => void
  onCancel: () => void
  /** Two columns instead of three, for narrow containers such as a dialog. */
  compact?: boolean
}

/** The horse form on its own, so it can live on a page or inside a dialog. */
export function HorseForm({ mode, initialHorse, onSaved, onCancel, compact = false }: HorseFormProps) {
  const form = useForm<HorseFormValues>({ defaultValues: toFormValues(initialHorse) })
  const isEdit = mode === "edit"
  const showValidationSummary = form.formState.submitCount > 0 && Object.keys(form.formState.errors).length > 0

  const onSubmit: SubmitHandler<HorseFormValues> = async (values) => {
    try {
      const input = toCreateRequest(values)
      let saved: Horse | undefined
      if (isEdit && initialHorse) await horseApi.updateHorse(initialHorse.horseId, input)
      else saved = await horseApi.createHorse(input)
      toast.success(isEdit ? "Horse updated successfully." : "Horse created successfully.")
      onSaved(saved)
    } catch (error) {
      toast.error(getHorseApiErrorMessage(error, isEdit ? "Unable to update horse. Please try again." : "Unable to create horse. Please try again."))
    }
  }

  return (
        <Form {...form}>
          <form
            id={`${mode}-horse-form`}
            noValidate
            onSubmit={(event) => {
              // A dialog is portalled, but React still bubbles its events to any <form> that renders it.
              event.stopPropagation()
              void form.handleSubmit(onSubmit)(event)
            }}
            className="flex flex-col pt-4"
          >
            <div className={`grid auto-rows-min gap-x-6 gap-y-3 pb-4 md:grid-cols-2 ${compact ? "" : "lg:grid-cols-3"}`}>
              <FormField control={form.control} name="horseName" rules={requiredText("Horse name")} render={({ field }) => <Field label="HORSE NAME"><FormItem><FormControl><Input {...field} className={inputClass} placeholder="e.g. Golden Thunder" maxLength={150} /></FormControl></FormItem></Field>} />
              <FormField control={form.control} name="sex" rules={requiredText("Sex")} render={({ field }) => <Field label="SEX"><FormItem><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select sex" /></SelectTrigger></FormControl><SelectContent position="popper" align="start" sideOffset={2}>{selectOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></FormItem></Field>} />
              <FormField control={form.control} name="breed" rules={requiredText("Breed")} render={({ field }) => <Field label="BREED"><FormItem><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select breed" /></SelectTrigger></FormControl><SelectContent position="popper" align="start" sideOffset={2}>{breedOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></FormItem></Field>} />
              <FormField control={form.control} name="dateOfBirth" rules={requiredText("Date of birth")} render={({ field }) => <Field label="DATE OF BIRTH"><FormItem><FormControl><DatePicker ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="DD / MM / YYYY" className={`${inputClass} data-[empty=true]:text-[#6c6963]`} /></FormControl></FormItem></Field>} />
              <FormField control={form.control} name="color" rules={requiredText("Color")} render={({ field }) => <Field label="COLOR"><FormItem><FormControl><Input {...field} className={inputClass} placeholder="e.g. Bay" maxLength={100} /></FormControl></FormItem></Field>} />
              <FormField control={form.control} name="countryOfOrigin" rules={requiredText("Country of origin")} render={({ field }) => <Field label="COUNTRY OF ORIGIN"><FormItem><FormControl><CountrySelect value={field.value} onValueChange={field.onChange} placeholder="Select country of origin" className={inputClass} /></FormControl></FormItem></Field>} />
              <FormField control={form.control} name="weightKg" rules={requiredNumber("Weight")} render={({ field }) => <Field label="WEIGHT (KG)"><FormItem><FormControl><Input {...field} className={inputClass} type="number" min="0" step="0.1" placeholder="e.g. 520" /></FormControl></FormItem></Field>} />
              <FormField control={form.control} name="heightCm" rules={requiredNumber("Height")} render={({ field }) => <Field label="HEIGHT (CM)"><FormItem><FormControl><Input {...field} className={inputClass} type="number" min="0" step="0.1" placeholder="e.g. 165" /></FormControl></FormItem></Field>} />
              <FormField control={form.control} name="passportNumber" rules={passportNumberRules} render={({ field }) => <Field label="PASSPORT NUMBER" characterCount={{ value: field.value.length, max: 15 }}><FormItem><FormControl><Input {...field} className={inputClass} placeholder="15 chars: A-Z, 0-9" maxLength={15} /></FormControl></FormItem></Field>} />
              <FormField control={form.control} name="microchipNumber" rules={microchipNumberRules} render={({ field }) => <Field label="MICROCHIP NUMBER" characterCount={{ value: field.value.length, max: 15 }}><FormItem><FormControl><Input {...field} className={inputClass} inputMode="numeric" placeholder="15 digits: 0-9" maxLength={15} /></FormControl></FormItem></Field>} />
              <FormField control={form.control} name="identificationNotes" rules={requiredText("Identification notes")} render={({ field }) => <Field label="IDENTIFICATION NOTES" className={compact ? "md:col-span-2" : "md:col-span-2 lg:col-span-3"}><FormItem><FormControl><Textarea {...field} className="profile-edit-field !h-[72px] min-h-[72px] resize-none" placeholder="e.g. White star on forehead; calm during transport." maxLength={1000} /></FormControl></FormItem></Field>} />
            </div>
            {showValidationSummary && <p className="pb-2 text-right text-xs text-red-600" role="alert">Please complete all required fields before submitting.</p>}
            <div className="flex shrink-0 justify-end gap-3 border-t border-[hsl(var(--border))] pt-4">
              <Button type="button" variant="outline" className="h-9 rounded-none border-[#181818] bg-white px-6 py-2 text-xs font-bold uppercase" onClick={onCancel}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-9 rounded-none py-2 text-xs font-bold uppercase">{form.formState.isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
            </div>
          </form>
        </Form>
  )
}

export function HorseFormPage({ mode, initialHorse }: HorseFormPageProps) {
  const navigate = useNavigate()
  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col">
        <PageHeader title={mode === "edit" ? "EDIT HORSE" : "ADD HORSE"} backHref="/my-horses" />
        <HorseForm mode={mode} initialHorse={initialHorse} onSaved={() => navigate("/my-horses")} onCancel={() => navigate("/my-horses")} />
      </div>
    </section>
  )
}

export function AddHorsePage() { return <HorseFormPage mode="create" /> }
export default AddHorsePage

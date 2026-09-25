import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { PageHeader } from "@/shared/components/PageHeader"
import { Field } from "@/shared/components/Field"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { horseApi } from "../services"
import { HORSE_BREED_OPTIONS, HORSE_SEX_OPTIONS } from "../constants/horse.constants"
import type { CreateHorseRequest, Horse, HorseSex } from "../types"

const inputClass = "profile-edit-field !h-[39px] !px-3 !py-2 lg:!h-[31px] lg:!py-1"
const selectOptions = HORSE_SEX_OPTIONS.filter((option) => option.value !== "ALL")
const breedOptions = HORSE_BREED_OPTIONS.filter((option) => option.value !== "ALL")

type HorseFormPageProps = {
  mode: "create" | "edit"
  initialHorse?: Horse
}

export function HorseFormPage({ mode, initialHorse }: HorseFormPageProps) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const horseName = String(form.get("horseName") ?? "").trim()
    if (!horseName) {
      toast.error("Horse name is required.")
      return
    }

    const input: CreateHorseRequest = {
      horseName,
      sex: (String(form.get("sex") ?? "") || undefined) as HorseSex | undefined,
      breed: String(form.get("breed") ?? "") || undefined,
      dateOfBirth: String(form.get("dateOfBirth") ?? "") || undefined,
      color: String(form.get("color") ?? "") || undefined,
      countryOfOrigin: String(form.get("countryOfOrigin") ?? "") || undefined,
      weightKg: Number(form.get("weightKg")) || undefined,
      heightCm: Number(form.get("heightCm")) || undefined,
      passportNumber: String(form.get("passportNumber") ?? "") || undefined,
      microchipNumber: String(form.get("microchipNumber") ?? "") || undefined,
      identificationNotes: String(form.get("identificationNotes") ?? "") || undefined,
    }

    setIsSubmitting(true)
    try {
      if (mode === "edit" && initialHorse) await horseApi.updateHorse(initialHorse.horseId, input)
      else await horseApi.createHorse(input)
      toast.success(mode === "edit" ? "Horse updated successfully." : "Horse created successfully.")
      navigate("/my-horses")
    } catch {
      toast.error("Unable to create horse. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col">
        <PageHeader title={mode === "edit" ? "EDIT HORSE" : "ADD HORSE"} backHref="/my-horses" />
        <form id={`${mode}-horse-form`} onSubmit={handleSubmit} className="flex flex-col pt-4">
          <div className="grid auto-rows-min gap-x-6 gap-y-3 pb-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="HORSE NAME"><Input className={inputClass} name="horseName" defaultValue={initialHorse?.horseName} maxLength={150} required /></Field>
            <Field label="SEX"><Select name="sex" defaultValue={initialHorse?.sex ?? undefined}><SelectTrigger className={inputClass}><SelectValue placeholder="Select sex" /></SelectTrigger><SelectContent>{selectOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="BREED"><Select name="breed" defaultValue={initialHorse?.breed ?? undefined}><SelectTrigger className={inputClass}><SelectValue placeholder="Select breed" /></SelectTrigger><SelectContent>{breedOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="DATE OF BIRTH"><Input className={inputClass} name="dateOfBirth" type="date" defaultValue={initialHorse?.dateOfBirth ?? undefined} /></Field>
            <Field label="COLOR"><Input className={inputClass} name="color" defaultValue={initialHorse?.color ?? undefined} maxLength={100} /></Field>
            <Field label="COUNTRY OF ORIGIN"><Input className={inputClass} name="countryOfOrigin" defaultValue={initialHorse?.countryOfOrigin ?? undefined} maxLength={100} /></Field>
            <Field label="WEIGHT (KG)"><Input className={inputClass} name="weightKg" type="number" min="0" step="0.1" defaultValue={initialHorse?.weightKg ?? undefined} /></Field>
            <Field label="HEIGHT (CM)"><Input className={inputClass} name="heightCm" type="number" min="0" step="0.1" defaultValue={initialHorse?.heightCm ?? undefined} /></Field>
            <Field label="PASSPORT NUMBER"><Input className={inputClass} name="passportNumber" defaultValue={initialHorse?.passportNumber ?? undefined} maxLength={100} /></Field>
            <Field label="MICROCHIP NUMBER"><Input className={inputClass} name="microchipNumber" defaultValue={initialHorse?.microchipNumber ?? undefined} maxLength={100} /></Field>
            <Field label="IDENTIFICATION NOTES" className="md:col-span-2 lg:col-span-3"><Textarea className="profile-edit-field !h-[72px] min-h-[72px] resize-none" name="identificationNotes" defaultValue={initialHorse?.identificationNotes ?? undefined} maxLength={1000} /></Field>
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-[hsl(var(--border))] pt-4">
            <Button type="button" variant="outline" className="h-9 rounded-none border-[#181818] bg-white px-6 py-2 text-xs font-bold tracking-[0.6px] text-[#181818] uppercase shadow-[0_1px_1px_rgba(0,0,0,0.05)]" onClick={() => navigate("/my-horses")}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="h-9 rounded-none py-2 text-xs font-bold tracking-[0.6px] uppercase shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#f39200]">{isSubmitting ? "Saving..." : mode === "edit" ? "Update" : "Create"}</Button>
          </div>
        </form>
      </div>
    </section>
  )
}

export function AddHorsePage() {
  return <HorseFormPage mode="create" />
}

export default AddHorsePage

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ErrorState } from "@/shared/components/common"
import { Field } from "@/shared/components/Field"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { HorseAccordionSection } from "../components"
import { HORSE_SEX_LABELS } from "../constants/horse.constants"
import { MOCK_HORSES } from "../constants/horse.mock"
import { horseApi } from "../services"
import type { Horse } from "../types"

export function HorseDetailPage() {
  const { horseId } = useParams()
  const navigate = useNavigate()
  const [horse, setHorse] = useState<Horse>()
  const [openSections, setOpenSections] = useState({ basic: true, immutable: true })
  const [error, setError] = useState<string>()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    if (!horseId) {
      setError("Horse was not found.")
      return
    }
    horseApi.getHorse(horseId).then(setHorse).catch(() => {
      const mockHorse = MOCK_HORSES.find((item) => item.horseId === horseId)
      if (mockHorse) setHorse(mockHorse)
      else setError("Horse was not found.")
    })
  }, [horseId])

  if (error) return <ErrorState message={error} />
  if (!horse) return <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">Loading horse...</div>
  const currentHorse = horse

  async function handleDelete() {
    if (!horseId) return

    try {
      await horseApi.removeHorse(horseId)
      toast.success(`${currentHorse.horseName} removed successfully.`)
      navigate("/my-horses")
    } catch {
      setIsDeleteOpen(false)
      setError("Unable to delete horse. Please try again.")
    }
  }

  return (
    <section className="profile-page w-full bg-[#f4f4f4] px-5 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-0">
        <PageHeader title="VIEW HORSE" backHref="/my-horses" />
        <div className="flex flex-col gap-0 pt-4">
          <HorseAccordionSection title="BASIC INFORMATION" open={openSections.basic} onToggle={() => setOpenSections((current) => ({ ...current, basic: !current.basic }))}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="HORSE NAME" value={horse.horseName} />
              <Field label="SEX" value={horse.sex ? HORSE_SEX_LABELS[horse.sex] : null} />
              <Field label="BREED" value={horse.breed} />
              <Field label="DATE OF BIRTH" value={horse.dateOfBirth} />
              <Field label="COLOR" value={horse.color} />
              <Field label="COUNTRY OF ORIGIN" value={horse.countryOfOrigin} />
              <Field label="WEIGHT (KG)" value={horse.weightKg} />
              <Field label="HEIGHT (CM)" value={horse.heightCm} />
              <Field label="MICROCHIP NUMBER" value={horse.microchipNumber} />
              <Field className="md:col-span-2" label="IDENTIFICATION NOTES" value={horse.identificationNotes} />
            </div>
          </HorseAccordionSection>
          <HorseAccordionSection title="IMMUTABLE INFORMATION" open={openSections.immutable} onToggle={() => setOpenSections((current) => ({ ...current, immutable: !current.immutable }))}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="HORSE ID" value={horse.horseId} readOnly />
              <Field label="PASSPORT NUMBER" value={horse.passportNumber} readOnly />
              <Field label="CREATED AT" value={horse.createdAt} readOnly />
              <Field label="UPDATED AT" value={horse.updatedAt} readOnly />
            </div>
          </HorseAccordionSection>
          <div className="flex items-center justify-end gap-2 border-[#d1d5db] pb-8 pt-3">
            <Button type="button" variant="outline" className="h-9 rounded-none border-red-600 bg-white px-6 py-2 text-xs font-bold tracking-[0.6px] text-red-600 uppercase shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-red-50 hover:text-red-700" onClick={() => setIsDeleteOpen(true)}>Delete</Button>
            <Button type="button" className="h-9 rounded-none py-2 text-xs font-bold tracking-[0.6px] uppercase shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#f39200]" onClick={() => navigate(`/my-horses/${horse.horseId}/edit`)}>Edit</Button>
          </div>
        </div>
      </div>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete horse?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {horse.horseName}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export default HorseDetailPage

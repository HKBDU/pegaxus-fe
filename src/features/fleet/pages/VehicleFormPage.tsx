import { useRef, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { VehicleFormSkeleton } from "@/features/fleet/components/FleetSkeletons"
import { VehicleForm } from "@/features/fleet/components/VehicleForm"
import { PAGE_SHELL_CLASS, PAGE_WIDTH_CLASS } from "@/features/fleet/components/DetailParts"
import { VEHICLE_LIST_PATH, vehicleDetailPath } from "@/features/fleet/constants/fleet.constants"
import { useCreateVehicle, useUpdateVehicle, useVehicle } from "@/features/fleet/hooks"
import type { VehicleFormValues } from "@/features/fleet/schemas"
import type { Vehicle } from "@/features/fleet/types"
import { FleetApiError } from "@/features/fleet/services"
import { toVehiclePayload } from "@/features/fleet/vehicle-form"
import { getFleetErrorCode, getFleetErrorMessage } from "@/features/fleet/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"

const FORM_FIELDS = new Set<string>([
  "vehicleName",
  "transportMode",
  "licensePlate",
  "vehicleType",
  "manufacturer",
  "model",
  "capacityHorses",
  "registrationNumber",
  "registrationExpiryDate",
  "insuranceNumber",
  "insuranceExpiryDate",
])

/** SCR-F3-025 (add, UC-44) and SCR-F3-026 (edit, UC-45). */
export default function VehicleFormPage({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate()
  const { vehicleId } = useParams()
  const isEdit = mode === "edit"
  const vehicleQuery = useVehicle(isEdit ? vehicleId : undefined)
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const attempt = useRequestAttemptGuard()
  const formRef = useRef<UseFormReturn<VehicleFormValues> | null>(null)
  const isSaving = createVehicle.isPending || updateVehicle.isPending
  const [reloadCount, setReloadCount] = useState(0)
  const [reloadOpen, setReloadOpen] = useState(false)

  const save = async (values: VehicleFormValues, baseline?: Vehicle) => {
    const form = formRef.current
    try {
      const guarded = await attempt.run(async () => {
        const payload = toVehiclePayload(values)
        if (isEdit) {
          if (!baseline) throw new Error("Load the vehicle before saving changes.")
          await updateVehicle.mutateAsync({ id: baseline.vehicleId, payload: { ...payload, lastUpdatedAt: baseline.updatedAt } })
        } else {
          await createVehicle.mutateAsync(payload)
        }
      })
      if (!guarded.started) return
      toast.success(isEdit ? "Vehicle information updated successfully." : "Vehicle created successfully.")
      navigate(isEdit && vehicleId ? vehicleDetailPath(vehicleId) : VEHICLE_LIST_PATH)
    } catch (error) {
      attempt.reset()
      const code = getFleetErrorCode(error)
      const message = getFleetErrorMessage(error, "Unable to save this vehicle.")
      if (code === "LICENSE_PLATE_DUPLICATED") {
        form?.setError("licensePlate", { message }, { shouldFocus: true })
        return
      }
      if (code === "VEHICLE_MODIFIED") setReloadOpen(true)
      if (code === "VALIDATION_ERROR" && error instanceof FleetApiError && error.errors?.length) {
        const unmapped: string[] = []
        for (const item of error.errors) {
          if (FORM_FIELDS.has(item.field)) form?.setError(item.field as keyof VehicleFormValues, { message: item.message })
          else unmapped.push(item.message)
        }
        if (unmapped.length) toast.error(unmapped.join(" "))
        return
      }
      toast.error(message)
    }
  }

  async function reload() {
    if (isSaving || vehicleQuery.isFetching) return
    const result = await vehicleQuery.refetch()
    if (result.isSuccess) {
      setReloadCount((count) => count + 1)
      setReloadOpen(false)
    }
  }

  return (
    <div className={PAGE_SHELL_CLASS}>
      <div className={PAGE_WIDTH_CLASS}>
        <div className="mb-3">
          <PageHeader
            title={isEdit ? "EDIT VEHICLE" : "ADD NEW VEHICLE"}
            backHref={isEdit && vehicleId ? vehicleDetailPath(vehicleId) : VEHICLE_LIST_PATH}
            backLabel={isEdit ? "BACK TO VEHICLE DETAILS" : "RETURN TO VEHICLES LIST"}
          />
        </div>

        {isEdit && vehicleQuery.isLoading ? <VehicleFormSkeleton /> : null}
        {isEdit && vehicleQuery.isError ? <ErrorState message="Unable to load this vehicle." onRetry={() => void vehicleQuery.refetch()} /> : null}
        {isEdit && vehicleQuery.data ? <button type="button" disabled={isSaving || vehicleQuery.isFetching} className="mb-3 text-sm font-semibold underline disabled:opacity-50" onClick={() => setReloadOpen(true)}>Load latest vehicle</button> : null}
        {!isEdit || vehicleQuery.data ? (
          <VehicleForm
            key={`${mode}-${vehicleId ?? "new"}-${reloadCount}`}
            mode={mode}
            vehicle={vehicleQuery.data}
            isSaving={isSaving}
            cancelHref={isEdit && vehicleId ? vehicleDetailPath(vehicleId) : VEHICLE_LIST_PATH}
            onSubmit={save}
            onFormReady={(form) => {
              formRef.current = form
            }}
          />
        ) : null}
        <AlertDialog open={reloadOpen} onOpenChange={(open) => { if (!vehicleQuery.isFetching) setReloadOpen(open) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Load latest vehicle?</AlertDialogTitle>
              <AlertDialogDescription>This replaces your unsaved changes with the latest vehicle information. Your draft is kept if loading fails.</AlertDialogDescription>
              {vehicleQuery.isError ? <p className="text-sm text-red-700" role="alert">Unable to load the latest vehicle. Your draft is kept; try again.</p> : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={vehicleQuery.isFetching}>Keep editing</AlertDialogCancel>
              <AlertDialogAction disabled={vehicleQuery.isFetching || isSaving} onClick={(event) => { event.preventDefault(); void reload() }}>Reload and replace draft</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

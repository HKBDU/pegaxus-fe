import { useState } from "react"

import { PhotoCaptureSection } from "@/shared/components/PhotoCaptureSection"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"

export default function Test() {
  const [files, setFiles] = useState<File[]>([])
  const [capturedAt, setCapturedAt] = useState<(Date | null)[]>([])
  const [captions, setCaptions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [vehicleWarningOpen, setVehicleWarningOpen] = useState(false)

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl space-y-5">
    <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Development test</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Photo Capture Section</h1><p className="mt-2 text-sm text-slate-600">Test camera, gallery, preview, caption, retake, remove, validation and up to 5 Flow 4 photos.</p></header>
    <PhotoCaptureSection files={files} maxFiles={5} capturedAt={capturedAt} captions={captions} error={error} documentLabel="Horse Health Photos" statusLabel="Flow 4 Test" onFilesChange={setFiles} onCapturedAtChange={setCapturedAt} onCaptionsChange={setCaptions} onError={setError} />
    <section className="rounded-[2px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Vehicle country warning</h2>
      <p className="mt-1 text-sm text-slate-600">Preview the Flow 5 soft warning shown when a selected vehicle is based in another country.</p>
      <Button type="button" className="mt-4 rounded-[2px] bg-[#ef8f00] text-slate-950 hover:bg-[#db8300]" onClick={() => setVehicleWarningOpen(true)}>Select vehicle</Button>
      <AlertDialog open={vehicleWarningOpen} onOpenChange={setVehicleWarningOpen}>
        <AlertDialogContent className="rounded-[2px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Vehicle country differs from departure</AlertDialogTitle>
            <AlertDialogDescription>This vehicle is based in a different country from the segment departure location. Do you still want to assign it?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[2px]">Choose another</AlertDialogCancel>
            <AlertDialogAction className="rounded-[2px]" onClick={() => setVehicleWarningOpen(false)}>Continue selecting</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
    <pre className="overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{JSON.stringify({ files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })), capturedAt, captions }, null, 2)}</pre>
  </div></main>
}

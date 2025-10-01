"use client"

import { useSearchParams } from "next/navigation"
import { useHCMS } from "@/lib/store"

export default function PrintPrescriptionPage() {
  const params = useSearchParams()
  const id = params.get("id")
  const { store } = useHCMS()
  const patient = store.patients.find((p) => p.id === id)
  const doctor = store.doctors.find((d) => d.id === (patient?.doctorId || ""))

  return (
    <div className="mx-auto max-w-3xl p-6 print:p-0">
      <div className="no-print mb-4 flex items-center justify-between">
        <div className="text-xl font-semibold">Preview Prescription</div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          Print
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 print:rounded-none print:border-0 print:p-0">
        <header className="mb-4 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={"/placeholder.svg?height=48&width=48&query=hospital+logo"}
                alt="Hospital logo"
                className="size-12 rounded-md"
              />
              <div>
                <div className="text-lg font-semibold">CityCare Hospital</div>
                <div className="text-xs text-muted-foreground">123 Health St, Wellness City</div>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium">{doctor?.name || "Doctor"}</div>
              <div className="text-muted-foreground">{doctor?.specialization || "Specialist"}</div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-medium">Patient</div>
            <div>{patient ? `${patient.name} (Age ${patient.age})` : "—"}</div>
          </div>
          <div>
            <div className="font-medium">Date</div>
            <div>{new Date().toLocaleDateString()}</div>
          </div>
        </section>

        <section
          aria-label="Prescription area"
          className="mt-6 min-h-[480px] rounded-lg border border-dashed border-border p-4 text-muted-foreground"
        >
          Doctor handwritten prescription area
        </section>

        <div className="mt-6 flex justify-end">
          <div className="w-56 text-center">
            <div className="h-16 rounded-md border border-border" aria-hidden />
            <div className="mt-1 text-xs text-muted-foreground">Doctor Signature</div>
          </div>
        </div>
      </div>
    </div>
  )
}

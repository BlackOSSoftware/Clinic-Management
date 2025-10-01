"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { useHCMS } from "@/lib/store"

export default function PrintReceiptPage() {
  const params = useSearchParams()
  const kind = params.get("kind") as "appointment" | "service" | "lab" | null
  const id = params.get("id")
  const { store } = useHCMS()

  const meta = useMemo(() => {
    if (!id || !kind) return null
    if (kind === "appointment") {
      const p = store.patients.find((x) => x.id === id)
      if (!p) return null
      const d = store.doctors.find((x) => x.id === p.doctorId)
      return {
        type: "Appointment",
        patientName: p.name,
        patientAge: p.age,
        patientPhone: p.phone,
        doctorName: d?.name,
        doctorSpec: d?.specialization,
        fee: p.fee,
      }
    }
    if (kind === "service") {
      const r = store.serviceRecords.find((x) => x.id === id)
      const s = store.services.find((x) => x.id === r?.serviceId)
      const p = store.patients.find((x) => x.id === r?.patientId)
      return {
        type: "Service",
        serviceName: s?.name,
        patientName: p?.name,
        fee: r?.total ?? 0,
      }
    }
    if (kind === "lab") {
      const r = store.labRecords.find((x) => x.id === id)
      const t = store.labTests.find((x) => x.id === r?.labTestId)
      const p = store.patients.find((x) => x.id === r?.patientId)
      return {
        type: "Lab",
        serviceName: t?.name,
        patientName: p?.name,
        fee: r?.total ?? 0,
      }
    }
    return null
  }, [store, id, kind])

  if (!meta) {
    return <div className="p-6">Invalid receipt.</div>
  }

  return (
    <div className="mx-auto max-w-2xl p-6 print:p-0">
      <div className="no-print mb-4 flex items-center justify-between">
        <div className="text-xl font-semibold">Preview Receipt</div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          Print
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 print:rounded-none print:border-0 print:p-0">
        <header className="mb-4 border-b border-border pb-3">
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
        </header>

        <section className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-medium">Receipt Type</div>
            <div>{meta.type}</div>
          </div>
          {"patientAge" in meta && (
            <div>
              <div className="font-medium">Patient</div>
              <div>
                {meta.patientName} {typeof meta.patientAge === "number" ? `(Age ${meta.patientAge})` : ""}
              </div>
            </div>
          )}
          {"patientName" in meta && !("patientAge" in meta) && (
            <div>
              <div className="font-medium">Patient</div>
              <div>{meta.patientName || "—"}</div>
            </div>
          )}
          {"doctorName" in meta && (
            <div>
              <div className="font-medium">Doctor</div>
              <div>
                {meta.doctorName} — {meta.doctorSpec}
              </div>
            </div>
          )}
          {"serviceName" in meta && (
            <div>
              <div className="font-medium">Service</div>
              <div>{meta.serviceName}</div>
            </div>
          )}
          <div>
            <div className="font-medium">Total Fee</div>
            <div>₹ {meta.fee}</div>
          </div>
        </section>

        <footer className="mt-6 border-t border-border pt-3 text-center text-xs text-muted-foreground">
          Thank you for visiting CityCare Hospital.
        </footer>
      </div>
    </div>
  )
}

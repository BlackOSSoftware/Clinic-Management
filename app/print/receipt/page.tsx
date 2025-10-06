"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { useHCMS } from "@/lib/store"

export default function PrintReceiptPage() {
  const params = useSearchParams()
  const kind = params.get("kind") as "appointment" | "service" | "lab" | null
  const id = params.get("id")
  const { store } = useHCMS()

  const formatDate = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  }

  const meta = useMemo(() => {
    if (!id || !kind) return null

    // Appointment
    if (kind === "appointment") {
      const p = store.patients.find((x) => x.id === id)
      if (!p) return null
      const d = store.doctors.find((x) => x.id === p.doctorId)
      return {
        type: "Appointment",
        patientName: p.name,
        patientAge: p.age,
        patientGender: p.gender,
        patientPhone: p.phone,
        doctorName: d?.name,
        doctorDegree: d?.degree,
        doctorSpec: d?.specialization,
        fee: p.fee,
        date: formatDate(p.dateISO),
      }
    }

    // Service
    if (kind === "service") {
      const r = store.serviceRecords.find((x) => x.id === id)
      if (!r) return null
      const s = store.services.find((x) => x.id === r.serviceId)
      const p = r.patientId ? store.patients.find((x) => x.id === r.patientId) : undefined
      const d = r.doctorId
        ? store.doctors.find((x) => x.id === r.doctorId)
        : p
          ? store.doctors.find((x) => x.id === p.doctorId)
          : undefined

      return {
        type: "Service",
        serviceName: s?.name,
        patientName: r.patientName || p?.name || "(General)",
        patientAge: p?.age,
        patientGender: p?.gender,
        doctorName: d?.name,
        doctorDegree: d?.degree,
        doctorSpec: d?.specialization,
        fee: r?.total ?? 0,
        date: formatDate(r?.dateISO),
      }
    }

    // Lab
    if (kind === "lab") {
      const r = store.labRecords.find((x) => x.id === id)
      if (!r) return null
      const t = store.labTests.find((x) => x.id === r.labTestId)
      const p = r.patientId ? store.patients.find((x) => x.id === r.patientId) : undefined
      const d = r.doctorId
        ? store.doctors.find((x) => x.id === r.doctorId)
        : p
          ? store.doctors.find((x) => x.id === p.doctorId)
          : undefined

      return {
        type: "Lab",
        serviceName: t?.name,
        patientName: r.patientName || p?.name || "(General)",
        patientAge: p?.age,
        patientGender: p?.gender,
        doctorName: d?.name,
        doctorDegree: d?.degree,
        doctorSpec: d?.specialization,
        fee: r?.total ?? 0,
        date: formatDate(r?.dateISO),
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
          {"patientName" in meta && (
            <div>
              <div className="font-medium">Patient</div>
              <div className="capitalize">
                {meta.patientName} {meta.patientGender} <br /> {meta.patientAge ? `(Age ${meta.patientAge})` : ""}
              </div>
            </div>
          )}
          {"doctorName" in meta && meta.doctorName && (
            <div>
              <div className="font-medium">Doctor</div>
              <div>
                {meta.doctorName} {meta.doctorDegree} <br /> {meta.doctorSpec}
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
            <div className="font-medium">Date</div>
            <div>{meta.date}</div>
          </div>
          <div>
            <div className="font-medium">Total Fee</div>
            <div>₹ {meta.fee}</div>
          </div>
        </section>

        <footer className="mt-6 border-t border-border pt-3 text-center text-xs text-muted-foreground">
          Thank you for visiting CityCare Hospital.
        </footer>
      </div>

      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-0,
          .print\\:rounded-none,
          .print\\:border-0,
          .print\\:block {
            visibility: visible;
          }
          div.mx-auto {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

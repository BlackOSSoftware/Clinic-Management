"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { useHCMS } from "@/lib/store"
import { Stethoscope } from "lucide-react"

export default function PrintReceiptPage() {
  const params = useSearchParams()
  const kind = params.get("kind") as "appointment" | "service" | "lab" | null
  const id = params.get("id")
  const { store } = useHCMS()

  const hospitalInfo = {
    name: "JANT POLYCLINIC",
    address: "",
  }

  const formatDate = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
  }

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
        patientGender: p.gender,
        patientPhone: p.phone,
        doctorName: d?.name,
        doctorDegree: d?.degree,
        doctorSpec: d?.specialization,
        fee: p.fee,
        date: formatDate(p.dateISO),
      }
    }
    if (kind === "service") {
      const records = store.serviceRecords.filter(
        (r) => r.id === id || r.groupId === id
      )
      if (!records || records.length === 0) return null
      const totalFee = records.reduce((sum, r) => sum + (r.total || 0), 0)
      const serviceNames = records.map(
        (r) => store.services.find((s) => s.id === r.serviceId)?.name || "Unknown"
      )
      const patient = records[0].patientId
        ? store.patients.find((p) => p.id === records[0].patientId)
        : undefined
      const doctor = records[0].doctorId
        ? store.doctors.find((d) => d.id === records[0].doctorId)
        : patient
          ? store.doctors.find((d) => d.id === patient.doctorId)
          : undefined
      return {
        type: "Service",
        serviceNames,
        patientName: records[0].patientName || patient?.name || "(General)",
        patientAge: patient?.age,
        patientGender: patient?.gender,
        doctorName: doctor?.name,
        doctorDegree: doctor?.degree,
        doctorSpec: doctor?.specialization,
        fee: totalFee,
        date: formatDate(records[0].dateISO),
      }
    }
    if (kind === "lab") {
      const records = store.labRecords.filter(
        (r) => r.id === id || r.groupId === id
      )
      if (!records || records.length === 0) return null
      const totalFee = records.reduce((sum, r) => sum + (r.total || 0), 0)
      const testNames = records.map(
        (r) => store.labTests.find((t) => t.id === r.labTestId)?.name || "Unknown"
      )
      const patient = records[0].patientId
        ? store.patients.find((p) => p.id === records[0].patientId)
        : undefined
      const doctor = records[0].doctorId
        ? store.doctors.find((d) => d.id === records[0].doctorId)
        : patient
          ? store.doctors.find((d) => d.id === patient.doctorId)
          : undefined
      return {
        type: "Lab",
        serviceNames: testNames,
        patientName: records[0].patientName || patient?.name || "(General)",
        patientAge: patient?.age,
        patientGender: patient?.gender,
        doctorName: doctor?.name,
        doctorDegree: doctor?.degree,
        doctorSpec: doctor?.specialization,
        fee: totalFee,
        date: formatDate(records[0].dateISO),
      }
    }
    return null
  }, [store, id, kind])

  if (!meta) return <div className="p-6">Invalid receipt.</div>

  return (
    <div className="mx-auto max-w-2xl p-6 print:p-0">
      {/* PREVIEW HEADER AND PRINT BUTTON - HIDDEN ON PRINT */}
      <div className="no-print mb-4 flex items-center justify-between print:hidden">
        <div className="text-xl font-semibold">Preview Receipt</div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          Print
        </button>
      </div>

      {/* RECEIPT CARD - HEADER (ALWAYS SHOWN) */}
      <div className="rounded-xl border border-border bg-card p-6 print:rounded-none print:border print:border-[#d1d5db] print:p-6 print:bg-white">
        <header className="mb-4 border-b border-border pb-3 flex items-center gap-3">
          <div className="hospital-logo bg-blue-100 text-blue-600 rounded-lg w-12 h-12 flex items-center justify-center">
            <Stethoscope size={28} />
          </div>
          <div>
            <div className="text-lg font-semibold">{hospitalInfo.name}</div>
            <div className="text-xs text-muted-foreground">{hospitalInfo.address}</div>
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
                {meta.patientName} {meta.patientGender}{" "}
                {meta.patientAge ? `(Age ${meta.patientAge})` : ""}
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
          {"serviceNames" in meta && meta.serviceNames && (
            <div>
              <div className="font-medium">{meta.type === "Lab" ? "Lab Tests" : "Services"}</div>
              <ul className="ml-4 list-disc text-sm text-muted-foreground">
                {meta.serviceNames.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
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
          Thank you for visiting {hospitalInfo.name}.
        </footer>
      </div>

      <style jsx>{`
        @media print {
          html, body {
            background: #fff !important;
            color: #222 !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          /* Don't hide header or logo classes! Only hide .no-print  */
          .mx-auto {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .rounded-xl, .rounded-lg, .border, .border-border {
            border-radius: 0 !important;
            border-width: 1px !important;
            border-color: #d1d5db !important;
            box-shadow: none !important;
          }
          .bg-card, .print\\:bg-white {
            background: #fff !important;
          }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:p-6 { padding: 1.5rem !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:border { border-width: 1px !important; }
          .print\\:border-0 { border-width: 0 !important; }
          .text-primary-foreground, .text-muted-foreground {
            color: #222 !important;
          }
        }
      `}</style>
    </div>
  )
}

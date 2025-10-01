"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Download } from "lucide-react"
import { useStore } from "@/lib/store"

type ID = string | number

function toISODate(d: Date) {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt.toISOString()
}

function inRange(dateISO?: string, start?: Date, end?: Date) {
  if (!dateISO) return false
  const dt = new Date(dateISO).getTime()
  const s = start ? new Date(start).setHours(0, 0, 0, 0) : undefined
  const e = end ? new Date(end).setHours(23, 59, 59, 999) : undefined
  if (s && dt < s) return false
  if (e && dt > e) return false
  return true
}

export function ReportDetails() {
  const {
    patients = [],
    doctors = [],
    services = [],
    labs = [],
    serviceRecords = [],
    labRecords = [],
  } = useStore((s: any) => ({
    patients: s.patients,
    doctors: s.doctors,
    services: s.services,
    labs: s.labs,
    serviceRecords: s.serviceRecords,
    labRecords: s.labRecords,
  }))

  // Basic filters
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d
  })
  const [doctorId, setDoctorId] = useState<ID | undefined>(undefined)

  const patientsById = useMemo(() => {
    const m = new Map<ID, any>()
    for (const p of patients) m.set(p.id, p)
    return m
  }, [patients])

  const doctorsById = useMemo(() => {
    const m = new Map<ID, any>()
    for (const d of doctors) m.set(d.id, d)
    return m
  }, [doctors])

  const servicesById = useMemo(() => {
    const m = new Map<ID, any>()
    for (const s of services) m.set(s.id, s)
    return m
  }, [services])

  const labsById = useMemo(() => {
    const m = new Map<ID, any>()
    for (const l of labs) m.set(l.id, l)
    return m
  }, [labs])

  // Derive effective doctor for attribution
  const withEffectiveDoctor = useMemo(() => {
    const mapService = serviceRecords.map((r: any) => {
      const patient = r.patientId ? patientsById.get(r.patientId) : undefined
      const effectiveDoctorId = r.doctorId ?? patient?.doctorId ?? null
      return { ...r, effectiveDoctorId }
    })
    const mapLab = labRecords.map((r: any) => {
      const patient = r.patientId ? patientsById.get(r.patientId) : undefined
      const effectiveDoctorId = r.doctorId ?? patient?.doctorId ?? null
      return { ...r, effectiveDoctorId }
    })
    return { services: mapService, labs: mapLab }
  }, [serviceRecords, labRecords, patientsById])

  // Filter by date and doctor (if chosen)
  const filtered = useMemo(() => {
    const filtServices = withEffectiveDoctor.services.filter((r: any) => {
      if (!inRange(r.date, startDate, endDate)) return false
      if (doctorId && r.effectiveDoctorId !== doctorId) return false
      return true
    })
    const filtLabs = withEffectiveDoctor.labs.filter((r: any) => {
      if (!inRange(r.date, startDate, endDate)) return false
      if (doctorId && r.effectiveDoctorId !== doctorId) return false
      return true
    })
    return { services: filtServices, labs: filtLabs }
  }, [withEffectiveDoctor, startDate, endDate, doctorId])

  // Compute derived fields (names, amounts, shares)
  function getRecordMeta(rec: any, kind: "service" | "lab") {
    const patient = rec.patientId ? patientsById.get(rec.patientId) : undefined
    const doc = rec.effectiveDoctorId ? doctorsById.get(rec.effectiveDoctorId) : undefined

    const item = kind === "service" ? servicesById.get(rec.serviceId) : labsById.get(rec.labId)

    const amountRaw =
      typeof rec.amount === "number"
        ? rec.amount
        : typeof item?.price === "number"
          ? item.price
          : typeof item?.fee === "number"
            ? item.fee
            : 0

    // Prefer precomputed shares if present, else estimate using doctor.sharePercent if available
    let doctorShare = typeof rec.doctorShare === "number" ? rec.doctorShare : undefined
    let hospitalShare = typeof rec.hospitalShare === "number" ? rec.hospitalShare : undefined

    if (doctorShare === undefined || hospitalShare === undefined) {
      const pct = typeof doc?.sharePercent === "number" ? doc.sharePercent : 0
      const ds = Math.round((amountRaw * pct) / 100)
      doctorShare = ds
      hospitalShare = amountRaw - ds
    }

    return {
      amount: amountRaw,
      doctorShare,
      hospitalShare,
      patientName: patient?.name ?? "-",
      doctorName: doc?.name ?? "-",
      itemName: item?.name ?? rec.serviceName ?? rec.labName ?? (kind === "service" ? "Service" : "Lab"),
      dateStr: rec?.date ? format(new Date(rec.date), "dd MMM yyyy") : "-",
    }
  }

  const servicesView = useMemo(() => {
    return filtered.services.map((r: any) => {
      const meta = getRecordMeta(r, "service")
      return { ...r, ...meta }
    })
  }, [filtered.services])

  const labsView = useMemo(() => {
    return filtered.labs.map((r: any) => {
      const meta = getRecordMeta(r, "lab")
      return { ...r, ...meta }
    })
  }, [filtered.labs])

  const totals = useMemo(() => {
    const all = [...servicesView, ...labsView]
    return {
      countPatients: new Set(all.map((r) => r.patientId).filter(Boolean)).size,
      countServices: servicesView.length,
      countLabs: labsView.length,
      amount: servicesView.reduce((s, r) => s + (r.amount || 0), 0) + labsView.reduce((s, r) => s + (r.amount || 0), 0),
      doctorShare:
        servicesView.reduce((s, r) => s + (r.doctorShare || 0), 0) +
        labsView.reduce((s, r) => s + (r.doctorShare || 0), 0),
      hospitalShare:
        servicesView.reduce((s, r) => s + (r.hospitalShare || 0), 0) +
        labsView.reduce((s, r) => s + (r.hospitalShare || 0), 0),
    }
  }, [servicesView, labsView])

  async function handleDownloadPdf() {
    const [{ default: jsPDF }, auto] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
    const doc = new jsPDF({ unit: "pt", format: "a4" })

    const title = "Doctor Report"
    const docName = (doctorId && doctorsById.get(doctorId)?.name) || "All Doctors"
    const range = `${startDate ? format(startDate, "dd MMM yyyy") : "-"} to ${
      endDate ? format(endDate, "dd MMM yyyy") : "-"
    }`

    doc.setFontSize(16)
    doc.text(title, 40, 40)
    doc.setFontSize(11)
    doc.text(`Doctor: ${docName}`, 40, 60)
    doc.text(`Range: ${range}`, 40, 78)
    doc.text(
      `Patients: ${totals.countPatients} | Services: ${totals.countServices} | Labs: ${totals.countLabs}`,
      40,
      96,
    )
    doc.text(
      `Total: ${totals.amount} | Doctor Share: ${totals.doctorShare} | Hospital Share: ${totals.hospitalShare}`,
      40,
      114,
    )

    const svcRows = servicesView.map((r) => [
      r.dateStr,
      r.itemName,
      r.patientName,
      r.doctorName,
      r.amount,
      r.doctorShare,
      r.hospitalShare,
    ])
    ;(auto as any).default(doc, {
      startY: 140,
      head: [["Date", "Service", "Patient", "Doctor", "Amount", "Dr Share", "Hosp Share"]],
      body: svcRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    })

    const afterSvcY = (doc as any).lastAutoTable?.finalY ?? 140

    const labRows = labsView.map((r) => [
      r.dateStr,
      r.itemName,
      r.patientName,
      r.doctorName,
      r.amount,
      r.doctorShare,
      r.hospitalShare,
    ])
    ;(auto as any).default(doc, {
      startY: afterSvcY + 24,
      head: [["Date", "Lab Test", "Patient", "Doctor", "Amount", "Dr Share", "Hosp Share"]],
      body: labRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    })

    const fileName = `report_${docName.replace(/\s+/g, "_")}_${Date.now()}.pdf`
    doc.save(fileName)
  }

  return (
    <section className="mt-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-pretty">Services & Labs (Doctor-wise)</h2>
          <p className="text-sm text-muted-foreground">
            Select date range and doctor to see details. New entries appear here instantly.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-sm">From</label>
            <input
              type="date"
              value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
              className="rounded border bg-background px-2 py-1 text-sm"
              aria-label="Start date"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">To</label>
            <input
              type="date"
              value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
              className="rounded border bg-background px-2 py-1 text-sm"
              aria-label="End date"
            />
          </div>

          {/* Doctor Select */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Doctor</label>
            <select
              value={doctorId ?? ""}
              onChange={(e) => setDoctorId(e.target.value ? e.target.value : undefined)}
              className="rounded border bg-background px-2 py-1 text-sm min-w-40"
              aria-label="Doctor filter"
            >
              <option value="">All</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <Button size="sm" onClick={handleDownloadPdf} className="gap-2">
            <Download className="h-4 w-4" />
            Download Doctor PDF
          </Button>
        </div>
      </header>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Total Amount</div>
          <div className="text-xl font-semibold">{totals.amount}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Doctor Share</div>
          <div className="text-xl font-semibold">{totals.doctorShare}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Hospital Share</div>
          <div className="text-xl font-semibold">{totals.hospitalShare}</div>
        </div>
      </div>

      {/* Services Table */}
      <div className="rounded-md border">
        <div className="px-3 py-2 border-b bg-muted/30 font-medium">Services</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Service</th>
                <th className="text-left p-2">Patient</th>
                <th className="text-left p-2">Doctor</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-right p-2">Dr Share</th>
                <th className="text-right p-2">Hosp Share</th>
              </tr>
            </thead>
            <tbody>
              {servicesView.length === 0 ? (
                <tr>
                  <td className="p-3 text-center text-muted-foreground" colSpan={7}>
                    No services in selected range.
                  </td>
                </tr>
              ) : (
                servicesView.map((r: any) => (
                  <tr key={r.id ?? `${r.patientId}-${r.date}-${r.itemName}`}>
                    <td className="p-2">{r.dateStr}</td>
                    <td className="p-2">{r.itemName}</td>
                    <td className="p-2">{r.patientName}</td>
                    <td className="p-2">{r.doctorName}</td>
                    <td className="p-2 text-right">{r.amount}</td>
                    <td className="p-2 text-right">{r.doctorShare}</td>
                    <td className="p-2 text-right">{r.hospitalShare}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Labs Table */}
      <div className="rounded-md border">
        <div className="px-3 py-2 border-b bg-muted/30 font-medium">Labs</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Lab Test</th>
                <th className="text-left p-2">Patient</th>
                <th className="text-left p-2">Doctor</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-right p-2">Dr Share</th>
                <th className="text-right p-2">Hosp Share</th>
              </tr>
            </thead>
            <tbody>
              {labsView.length === 0 ? (
                <tr>
                  <td className="p-3 text-center text-muted-foreground" colSpan={7}>
                    No lab records in selected range.
                  </td>
                </tr>
              ) : (
                labsView.map((r: any) => (
                  <tr key={r.id ?? `${r.patientId}-${r.date}-${r.itemName}`}>
                    <td className="p-2">{r.dateStr}</td>
                    <td className="p-2">{r.itemName}</td>
                    <td className="p-2">{r.patientName}</td>
                    <td className="p-2">{r.doctorName}</td>
                    <td className="p-2 text-right">{r.amount}</td>
                    <td className="p-2 text-right">{r.doctorShare}</td>
                    <td className="p-2 text-right">{r.hospitalShare}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default ReportDetails

"use client"

import { useMemo, useState } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Helper Functions

function inRange(iso: string, start?: string, end?: string) {
  const d = iso.slice(0, 10)
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

function getPatientDoctorId(pid?: string, store: any) {
  return pid ? store.patients.find((p: any) => p.id === pid)?.doctorId : undefined
}

function getDoctor(id?: string, store: any) {
  return id ? store.doctors.find((d: any) => d.id === id) : undefined
}

function getEffectiveDoctorId(rec: { doctorId?: string; patientId?: string }, store: any) {
  return rec.doctorId || getPatientDoctorId(rec.patientId, store)
}

function calcShares(amount: number, docId?: string, store: any) {
  if (!docId) return { doc: 0, hosp: amount }
  const doc = getDoctor(docId, store)
  const pct = doc?.doctorSharePercent ?? 0
  const ds = Math.round((amount * pct) / 100)
  return { doc: ds, hosp: amount - ds }
}

export default function ReportsPage() {
  const { store, addExpense, deleteExpense } = useHCMS()
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [doctorId, setDoctorId] = useState<string | "">("")

  // Filtered lists
  const patients = useMemo(
    () => store.patients.filter((p: any) => inRange(p.dateISO, startDate, endDate)),
    [store.patients, startDate, endDate],
  )
  const serviceRecords = useMemo(
    () => store.serviceRecords.filter((r: any) => inRange(r.dateISO, startDate, endDate)),
    [store.serviceRecords, startDate, endDate],
  )
  const labRecords = useMemo(
    () => store.labRecords.filter((r: any) => inRange(r.dateISO, startDate, endDate)),
    [store.labRecords, startDate, endDate],
  )

  // Totals
  const totals = useMemo(() => {
    const collected =
      patients.reduce((s: number, p: any) => s + p.fee, 0) +
      serviceRecords.reduce((s: number, r: any) => s + r.total, 0) +
      labRecords.reduce((s: number, r: any) => s + r.total, 0)

    const docSharePatients = patients.reduce((s: number, p: any) => s + p.doctorShare, 0)
    const hospSharePatients = patients.reduce((s: number, p: any) => s + p.hospitalShare, 0)

    const docShareSvc = serviceRecords.reduce((s: number, r: any) => {
      const effDocId = getEffectiveDoctorId(r, store)
      const doc = r.doctorShare ?? calcShares(r.total, effDocId, store).doc
      return s + doc
    }, 0)
    const hospShareSvc = serviceRecords.reduce((s: number, r: any) => {
      const effDocId = getEffectiveDoctorId(r, store)
      const hosp = r.hospitalShare ?? calcShares(r.total, effDocId, store).hosp
      return s + hosp
    }, 0)

    const docShareLab = labRecords.reduce((s: number, r: any) => {
      const effDocId = getEffectiveDoctorId(r, store)
      const doc = r.doctorShare ?? calcShares(r.total, effDocId, store).doc
      return s + doc
    }, 0)
    const hospShareLab = labRecords.reduce((s: number, r: any) => {
      const effDocId = getEffectiveDoctorId(r, store)
      const hosp = r.hospitalShare ?? calcShares(r.total, effDocId, store).hosp
      return s + hosp
    }, 0)

    const referralPayout = patients.reduce((s: number, p: any) => {
      const pct = p.referralPercent ?? 0
      return s + Math.round((p.fee * pct) / 100)
    }, 0)

    return {
      collected,
      doctorShare: docSharePatients + docShareSvc + docShareLab,
      hospitalShare: hospSharePatients + hospShareSvc + hospShareLab,
      referralPayout,
      fromPatients: { doctorShare: docSharePatients, hospitalShare: hospSharePatients },
      fromServices: { doctorShare: docShareSvc, hospitalShare: hospShareSvc },
      fromLab: { doctorShare: docShareLab, hospitalShare: hospShareLab },
    }
  }, [patients, serviceRecords, labRecords])

  // Doctor-wise
  const doctorRows = useMemo(() => {
    const sourceDoctors = store.doctors
    const filteredDoctors = doctorId ? sourceDoctors.filter((d: any) => d.id === doctorId) : sourceDoctors
    return filteredDoctors.map((d: any) => {
      const pRows = patients.filter((p: any) => p.doctorId === d.id)
      const sRows = serviceRecords.filter((r: any) => getEffectiveDoctorId(r, store) === d.id)
      const lRows = labRecords.filter((r: any) => getEffectiveDoctorId(r, store) === d.id)

      const patientCount = pRows.length
      const serviceCount = sRows.length
      const labCount = lRows.length

      const collected =
        pRows.reduce((s: number, p: any) => s + p.fee, 0) +
        sRows.reduce((s: number, r: any) => s + r.total, 0) +
        lRows.reduce((s: number, r: any) => s + r.total, 0)

      const docShare =
        pRows.reduce((s: number, p: any) => s + p.doctorShare, 0) +
        sRows.reduce(
          (s: number, r: any) => s + (r.doctorShare ?? calcShares(r.total, getEffectiveDoctorId(r, store), store).doc),
          0,
        ) +
        lRows.reduce(
          (s: number, r: any) => s + (r.doctorShare ?? calcShares(r.total, getEffectiveDoctorId(r, store), store).doc),
          0,
        )

      const hospShare =
        pRows.reduce((s: number, p: any) => s + p.hospitalShare, 0) +
        sRows.reduce(
          (s: number, r: any) =>
            s + (r.hospitalShare ?? calcShares(r.total, getEffectiveDoctorId(r, store), store).hosp),
          0,
        ) +
        lRows.reduce(
          (s: number, r: any) =>
            s + (r.hospitalShare ?? calcShares(r.total, getEffectiveDoctorId(r, store), store).hosp),
          0,
        )

      return {
        doctor: d.name,
        count: patientCount,
        services: serviceCount,
        labs: labCount,
        collected,
        doctorShare: docShare,
        hospitalShare: hospShare,
        payout: docShare,
      }
    })
  }, [store, patients, serviceRecords, labRecords, doctorId])

  // References (inbound)
  const referenceRows = useMemo(() => {
    const map = new Map<string, { count: number; referralPercentSum: number }>()
    patients.forEach((p: any) => {
      const key = (p.reference || "Unknown").trim() || "Unknown"
      const pct = p.referralPercent ?? 0
      if (!map.has(key)) map.set(key, { count: 0, referralPercentSum: 0 })
      const entry = map.get(key)!
      entry.count += 1
      entry.referralPercentSum += pct
    })
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      count: v.count,
      avgReferralPercent: v.count ? Math.round((v.referralPercentSum / v.count) * 10) / 10 : 0,
    }))
  }, [patients])

  // Expenses
  const expenses = useMemo(() => {
    return store.expenses.filter((e: any) => inRange(e.dateISO, startDate, endDate))
  }, [store.expenses, startDate, endDate])
  const expenseTotal = useMemo(() => expenses.reduce((s: number, e: any) => s + e.amount, 0), [expenses])
  const [expName, setExpName] = useState("")
  const [expAmount, setExpAmount] = useState("")
  const [expDate, setExpDate] = useState(today)

  function addNewExpense() {
    if (!expName || !expAmount) return
    const iso = expDate ? new Date(`${expDate}T00:00:00`).toISOString() : undefined
    addExpense(expName, Number(expAmount), iso)
    setExpName("")
    setExpAmount("")
  }

  // PDF Export: INCLUDES PATIENT LIST
  function exportDoctorPDF() {
    if (!doctorId) {
      alert("Please select a doctor to export PDF.")
      return
    }

    const doctor = store.doctors.find((d: any) => d.id === doctorId)
    if (!doctor) {
      alert("Selected doctor not found.")
      return
    }

    const pRows = patients.filter((p: any) => p.doctorId === doctorId)
    const sRows = serviceRecords.filter((r: any) => getEffectiveDoctorId(r, store) === doctorId)
    const lRows = labRecords.filter((r: any) => getEffectiveDoctorId(r, store) === doctorId)

    const collected =
      pRows.reduce((s: number, p: any) => s + p.fee, 0) +
      sRows.reduce((s: number, r: any) => s + r.total, 0) +
      lRows.reduce((s: number, r: any) => s + r.total, 0)

    const doctorShare =
      pRows.reduce((s: number, p: any) => s + p.doctorShare, 0) +
      sRows.reduce(
        (s: number, r: any) =>
          s + (r.doctorShare ?? calcShares(r.total, getEffectiveDoctorId(r, store), store).doc),
        0,
      ) +
      lRows.reduce(
        (s: number, r: any) =>
          s + (r.doctorShare ?? calcShares(r.total, getEffectiveDoctorId(r, store), store).doc),
        0,
      )

    const hospitalShare =
      pRows.reduce((s: number, p: any) => s + p.hospitalShare, 0) +
      sRows.reduce(
        (s: number, r: any) =>
          s + (r.hospitalShare ?? calcShares(r.total, getEffectiveDoctorId(r, store), store).hosp),
        0,
      ) +
      lRows.reduce(
        (s: number, r: any) =>
          s + (r.hospitalShare ?? calcShares(r.total, getEffectiveDoctorId(r, store), store).hosp),
        0,
      )

    const pdf = new jsPDF()
    pdf.setFontSize(14)
    pdf.text(`Doctor Report: ${doctor.name}`, 14, 16)
    pdf.setFontSize(10)
    pdf.text(`Date Range: ${startDate} → ${endDate}`, 14, 22)

    // Summary Table
    autoTable(pdf, {
      startY: 28,
      head: [["Metric", "Value"]],
      body: [
        ["Patients Handled", String(pRows.length)],
        ["Services Performed", String(sRows.length)],
        ["Lab Records", String(lRows.length)],
        ["Total Collected", `₹ ${collected}`],
        ["Doctor Share (Payout)", `₹ ${doctorShare}`],
        ["Hospital Share", `₹ ${hospitalShare}`],
      ],
      styles: { fontSize: 9, textColor: [0, 0, 0] },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    })

    let afterTableY = (pdf as any).lastAutoTable?.finalY ?? 40

    // Add PATIENTS TABLE
    pdf.setFontSize(12)
    pdf.text("Patients", 14, afterTableY + 8)
    autoTable(pdf, {
      startY: afterTableY + 12,
      head: [["Date", "Patient", "Phone", "Fee", "Doc Share", "Hosp Share"]],
      body: pRows.map((p: any) => [
        new Date(p.dateISO).toLocaleDateString(),
        p.name,
        p.phone,
        `₹ ${p.fee}`,
        `₹ ${p.doctorShare}`,
        `₹ ${p.hospitalShare}`,
      ]),
      styles: { fontSize: 9, textColor: [0, 0, 0] },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    })

    afterTableY = (pdf as any).lastAutoTable?.finalY ?? (afterTableY + 40)

    // Add SERVICES TABLE
    pdf.setFontSize(12)
    pdf.text("Services", 14, afterTableY + 8)
    autoTable(pdf, {
      startY: afterTableY + 12,
      head: [["Date", "Service", "Patient", "Amount", "Doc Share"]],
      body: sRows.map((r: any) => {
        const service = store.services.find((s: any) => s.id === r.serviceId)?.name || "—"
        const patient =
          r.patientName ||
          (r.patientId ? store.patients.find((p: any) => p.id === r.patientId)?.name : "—") ||
          "—"
        const effDocId = getEffectiveDoctorId(r, store)
        const docShare = r.doctorShare ?? calcShares(r.total, effDocId, store).doc
        return [
          new Date(r.dateISO).toLocaleDateString(),
          service,
          patient,
          `₹ ${r.total}`,
          `₹ ${docShare}`,
        ]
      }),
      styles: { fontSize: 9, textColor: [0, 0, 0] },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    })

    afterTableY = (pdf as any).lastAutoTable?.finalY ?? (afterTableY + 40)

    // Add LABS TABLE
    pdf.setFontSize(12)
    pdf.text("Lab Records", 14, afterTableY + 8)
    autoTable(pdf, {
      startY: afterTableY + 12,
      head: [["Date", "Lab Test", "Patient", "Amount", "Doc Share"]],
      body: lRows.map((r: any) => {
        const test = store.labTests.find((t: any) => t.id === r.labTestId)?.name || "—"
        const patient =
          r.patientName ||
          (r.patientId ? store.patients.find((p: any) => p.id === r.patientId)?.name : "—") ||
          "—"
        const effDocId = getEffectiveDoctorId(r, store)
        const docShare = r.doctorShare ?? calcShares(r.total, effDocId, store).doc
        return [
          new Date(r.dateISO).toLocaleDateString(),
          test,
          patient,
          `₹ ${r.total}`,
          `₹ ${docShare}`,
        ]
      }),
      styles: { fontSize: 9, textColor: [0, 0, 0] },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    })

    const safeName = doctor.name.replace(/\s+/g, "_")
    pdf.save(`report_${safeName}_${startDate}_to_${endDate}.pdf`)
  }

  // Services and Labs enriched for view
  const servicesView = useMemo(() => {
    const serviceName = new Map(store.services.map((s: any) => [s.id, s.name]))
    const doctorName = (id?: string) => (id ? (store.doctors.find((d: any) => d.id === id)?.name ?? "—") : "—")
    const patientName = (id?: string, fallback?: string) => {
      if (fallback) return fallback
      if (!id) return "—"
      return store.patients.find((p: any) => p.id === id)?.name ?? "—"
    }

    const rows = serviceRecords
      .filter((r: any) => !doctorId || getEffectiveDoctorId(r, store) === doctorId)
      .map((r: any) => {
        const effDocId = getEffectiveDoctorId(r, store)
        const shares = {
          doc: r.doctorShare ?? calcShares(r.total, effDocId, store).doc,
          hosp: r.hospitalShare ?? calcShares(r.total, effDocId, store).hosp,
        }
        return {
          id: r.id,
          date: new Date(r.dateISO).toLocaleDateString(),
          service: serviceName.get(r.serviceId) ?? "Unknown",
          patient: patientName(r.patientId, r.patientName),
          doctor: doctorName(effDocId),
          total: r.total,
          doctorShare: shares.doc,
          hospitalShare: shares.hosp,
        }
      })

    return {
      rows,
      count: rows.length,
      total: rows.reduce((s: number, x: any) => s + x.total, 0),
      docShare: rows.reduce((s: number, x: any) => s + x.doctorShare, 0),
      hospShare: rows.reduce((s: number, x: any) => s + x.hospitalShare, 0),
    }
  }, [store, serviceRecords, doctorId])

  const labsView = useMemo(() => {
    const testName = new Map(store.labTests.map((t: any) => [t.id, t.name]))
    const doctorName = (id?: string) => (id ? (store.doctors.find((d: any) => d.id === id)?.name ?? "—") : "—")
    const patientName = (id?: string, fallback?: string) => {
      if (fallback) return fallback
      if (!id) return "—"
      return store.patients.find((p: any) => p.id === id)?.name ?? "—"
    }

    const rows = labRecords
      .filter((r: any) => !doctorId || getEffectiveDoctorId(r, store) === doctorId)
      .map((r: any) => {
        const effDocId = getEffectiveDoctorId(r, store)
        const shares = {
          doc: r.doctorShare ?? calcShares(r.total, effDocId, store).doc,
          hosp: r.hospitalShare ?? calcShares(r.total, effDocId, store).hosp,
        }
        return {
          id: r.id,
          date: new Date(r.dateISO).toLocaleDateString(),
          test: testName.get(r.labTestId) ?? "Unknown",
          patient: patientName(r.patientId, r.patientName),
          doctor: doctorName(effDocId),
          total: r.total,
          doctorShare: shares.doc,
          hospitalShare: shares.hosp,
        }
      })

    return {
      rows,
      count: rows.length,
      total: rows.reduce((s: number, x: any) => s + x.total, 0),
      docShare: rows.reduce((s: number, x: any) => s + x.doctorShare, 0),
      hospShare: rows.reduce((s: number, x: any) => s + x.hospitalShare, 0),
    }
  }, [store, labRecords, doctorId])

  // Patients View enriched for table
  const patientsView = useMemo(() => {
    const doctorName = (id?: string) => (id ? (store.doctors.find((d: any) => d.id === id)?.name ?? "—") : "—")
    return patients
      .filter((p: any) => !doctorId || p.doctorId === doctorId)
      .map((p: any) => ({
        id: p.id,
        date: new Date(p.dateISO).toLocaleDateString(),
        patient: p.name || "—",
        phone: p.phone || "—",
        doctor: doctorName(p.doctorId),
        fee: p.fee,
        doctorShare: p.doctorShare,
        hospitalShare: p.hospitalShare,
      }))
  }, [patients, doctorId, store.doctors])

  return (
    <div className="space-y-6">
      <Card className="rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5 md:items-end">
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Doctor (optional)</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">All Doctors</option>
              {store.doctors.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialization}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>&nbsp;</Label>
            <div className="space-y-2">
              <Button className="w-full bg-primary text-primary-foreground">Apply</Button>
              <Button
                className="w-full"
                variant="secondary"
                disabled={!doctorId}
                onClick={exportDoctorPDF}
                title={doctorId ? "Download doctor report" : "Select a doctor first"}
              >
                Download Doctor PDF
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Total Collected</div>
          <div className="mt-2 text-2xl font-semibold">₹ {totals.collected}</div>
        </Card>
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Hospital Share</div>
          <div className="mt-2 text-2xl font-semibold">₹ {totals.hospitalShare}</div>
        </Card>
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Doctor Share</div>
          <div className="mt-2 text-2xl font-semibold">₹ {totals.doctorShare}</div>
        </Card>
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Referral Payout</div>
          <div className="mt-2 text-2xl font-semibold">₹ {totals.referralPayout}</div>
        </Card>
      </div>

      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-2 font-semibold">Doctor-wise Overview</div>
        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-8 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <div>Doctor</div>
            <div>Patients</div>
            <div>Services</div>
            <div>Labs</div>
            <div>Collected</div>
            <div>Doctor Share</div>
            <div>Hospital Share</div>
            <div>Payout</div>
          </div>
          {doctorRows.map((r: any) => (
            <div key={r.doctor} className="grid grid-cols-8 gap-2 border-b border-border px-3 py-2 text-sm">
              <div className="truncate">{r.doctor}</div>
              <div>{r.count}</div>
              <div>{r.services}</div>
              <div>{r.labs}</div>
              <div>₹ {r.collected}</div>
              <div>₹ {r.doctorShare}</div>
              <div>₹ {r.hospitalShare}</div>
              <div>₹ {r.payout}</div>
            </div>
          ))}
          {doctorRows.length === 0 && <div className="p-4 text-sm text-muted-foreground">No data for this period.</div>}
        </div>
      </Card>

      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-2 font-semibold">Patients List</div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground md:grid-cols-5">
          <div>Count: {patientsView.length}</div>
        </div>
        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-7 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <div>Date</div>
            <div>Patient</div>
            <div>Phone</div>
            <div>Doctor</div>
            <div className="text-right">Fee</div>
            <div className="text-right">Doc Share</div>
            <div className="text-right">Hosp Share</div>
          </div>
          {patientsView.map((r: any) => (
            <div key={r.id} className="grid grid-cols-7 items-center gap-2 border-b border-border px-3 py-2 text-sm">
              <div>{r.date}</div>
              <div className="truncate">{r.patient}</div>
              <div className="truncate">{r.phone}</div>
              <div className="truncate">{r.doctor}</div>
              <div className="text-right">₹ {r.fee}</div>
              <div className="text-right">₹ {r.doctorShare}</div>
              <div className="text-right">₹ {r.hospitalShare}</div>
            </div>
          ))}
          {patientsView.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No patients for this selection.</div>
          )}
        </div>
      </Card>

      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-2 font-semibold">References (Inbound)</div>
        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-3 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <div>Source</div>
            <div>Patient Count</div>
            <div>Avg Referral %</div>
          </div>
          {referenceRows.map((r: any) => (
            <div key={r.name} className="grid grid-cols-3 gap-2 border-b border-border px-3 py-2 text-sm">
              <div className="truncate">{r.name}</div>
              <div>{r.count}</div>
              <div>{r.avgReferralPercent}%</div>
            </div>
          ))}
          {referenceRows.length === 0 && <div className="p-4 text-sm text-muted-foreground">No references.</div>}
        </div>
      </Card>

      {/* Referrals (Outbound) */}
      {(() => {
        const outboundRefRows = patients
          .filter((p: any) => (p.referredToHospital || p.referredToDoctor) && (!doctorId || p.doctorId === doctorId))
          .map((p: any) => ({
            id: p.id,
            date: new Date(p.dateISO).toLocaleDateString(),
            patient: p.name,
            phone: p.phone,
            doctor: store.doctors.find((d: any) => d.id === p.doctorId)?.name || "—",
            hospital: p.referredToHospital || "—",
            refDoctor: p.referredToDoctor || "—",
          }))

        return (
          <Card className="rounded-xl p-4 shadow-sm">
            <div className="mb-2 font-semibold">Referrals (Outbound)</div>
            <div className="mb-3 text-sm text-muted-foreground">
              Patients you referred to external hospital/doctor within the selected date range.
            </div>
            <div className="rounded-lg border border-border">
              <div className="grid grid-cols-6 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
                <div>Date</div>
                <div>Patient</div>
                <div>Phone</div>
                <div>Attending Doctor</div>
                <div>Referred Hospital</div>
                <div>Referred Doctor</div>
              </div>
              {outboundRefRows.map((r: any) => (
                <div key={r.id} className="grid grid-cols-6 gap-2 border-b border-border px-3 py-2 text-sm">
                  <div>{r.date}</div>
                  <div className="truncate">{r.patient}</div>
                  <div className="truncate">{r.phone}</div>
                  <div className="truncate">{r.doctor}</div>
                  <div className="truncate">{r.hospital}</div>
                  <div className="truncate">{r.refDoctor}</div>
                </div>
              ))}
              {outboundRefRows.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No outbound referrals for this selection.</div>
              )}
            </div>
          </Card>
        )
      })()}

      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-2 font-semibold">Services Summary</div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground md:grid-cols-4">
          <div>Count: {servicesView.count}</div>
          <div>Total: ₹ {servicesView.total}</div>
          <div>Doctor Share: ₹ {servicesView.docShare}</div>
          <div>Hospital Share: ₹ {servicesView.hospShare}</div>
        </div>
        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-7 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <div>Date</div>
            <div>Service</div>
            <div className="col-span-2">Patient</div>
            <div>Doctor</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Shares</div>
          </div>
          {servicesView.rows.map((r: any) => (
            <div key={r.id} className="grid grid-cols-7 items-center gap-2 border-b border-border px-3 py-2 text-sm">
              <div>{r.date}</div>
              <div className="truncate">{r.service}</div>
              <div className="col-span-2 truncate">{r.patient}</div>
              <div className="truncate">{r.doctor}</div>
              <div className="text-right">₹ {r.total}</div>
              <div className="text-right">
                <span className="text-muted-foreground">D:</span> ₹ {r.doctorShare}{" "}
                <span className="text-muted-foreground">H:</span> ₹ {r.hospitalShare}
              </div>
            </div>
          ))}
          {servicesView.rows.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No service records for this selection.</div>
          )}
        </div>
      </Card>

      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-2 font-semibold">Lab Summary</div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground md:grid-cols-4">
          <div>Count: {labsView.count}</div>
          <div>Total: ₹ {labsView.total}</div>
          <div>Doctor Share: ₹ {labsView.docShare}</div>
          <div>Hospital Share: ₹ {labsView.hospShare}</div>
        </div>
        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-7 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <div>Date</div>
            <div>Lab Test</div>
            <div className="col-span-2">Patient</div>
            <div>Doctor</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Shares</div>
          </div>
          {labsView.rows.map((r: any) => (
            <div key={r.id} className="grid grid-cols-7 items-center gap-2 border-b border-border px-3 py-2 text-sm">
              <div>{r.date}</div>
              <div className="truncate">{r.test}</div>
              <div className="col-span-2 truncate">{r.patient}</div>
              <div className="truncate">{r.doctor}</div>
              <div className="text-right">₹ {r.total}</div>
              <div className="text-right">
                <span className="text-muted-foreground">D:</span> ₹ {r.doctorShare}{" "}
                <span className="text-muted-foreground">H:</span> ₹ {r.hospitalShare}
              </div>
            </div>
          ))}
          {labsView.rows.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No lab records for this selection.</div>
          )}
        </div>
      </Card>
    </div>
  )
}

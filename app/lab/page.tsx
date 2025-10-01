"use client"

import { useState } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/lib/auth"

export default function LabPage() {
  const { store, addLabTest, deleteLabTest, addLabRecord } = useHCMS()
  const { role } = useAuth()
  const isReception = role === "reception"
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [labTestId, setLabTestId] = useState(store.labTests[0]?.id ?? "")
  const [patientId, setPatientId] = useState<string | "">("")
  const [patientName, setPatientName] = useState("")
  const [doctorId, setDoctorId] = useState<string | "">("")

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const currentTime = now.toTimeString().slice(0, 5)
  const [dateStr, setDateStr] = useState(today)
  const [timeStr, setTimeStr] = useState(currentTime)

  function saveTest() {
    if (!name || !price) return
    addLabTest({ name, price: Number(price) })
    setName("")
    setPrice("")
  }

  function addRecord() {
    if (!labTestId) return
    const iso = dateStr && timeStr ? new Date(`${dateStr}T${timeStr}:00`).toISOString() : undefined
    addLabRecord(labTestId, patientId || undefined, patientName || undefined, iso, doctorId || undefined)
    setPatientId("")
    setPatientName("")
    setDoctorId("")
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {!isReception && (
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="mb-3 font-semibold">Add Lab Test</div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={saveTest}>
              Save Test
            </Button>
          </div>

          <div className="mt-6">
            <div className="mb-2 font-medium">Lab Tests</div>
            <div className="rounded-lg border border-border">
              {store.labTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
                  <div className="truncate">{t.name}</div>
                  <div className="flex items-center gap-3">
                    <div>₹ {t.price}</div>
                    <Button variant="destructive" onClick={() => deleteLabTest(t.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {store.labTests.length === 0 && <div className="p-4 text-sm text-muted-foreground">No tests.</div>}
            </div>
          </div>
        </Card>
      )}

      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-3 font-semibold">Add Lab Record</div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Lab Test</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={labTestId}
              onChange={(e) => setLabTestId(e.target.value)}
            >
              {store.labTests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — ₹{t.price}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Attach to Patient (optional)</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">General Lab</option>
              {store.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Doctor (optional)</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">No Doctor</option>
              {store.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialization}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Custom Patient Name (optional)</Label>
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Sita Devi" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Record Date</Label>
              <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div>
              <Label>Record Time</Label>
              <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
            </div>
          </div>
          <Button className="bg-accent text-accent-foreground hover:opacity-90" onClick={addRecord}>
            Save Record
          </Button>
        </div>

        <div className="mt-6">
          <div className="mb-2 font-medium">Recent Lab Records</div>
          <div className="rounded-lg border border-border">
            {store.labRecords.slice(0, 10).map((r) => {
              const t = store.labTests.find((x) => x.id === r.labTestId)
              const p = store.patients.find((x) => x.id === r.patientId)
              const d = store.doctors.find((x) => x.id === r.doctorId)
              const displayName = p?.name || r.patientName || "(General)"
              const dateLabel = new Date(r.dateISO).toLocaleString()
              return (
                <div key={r.id} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
                  <div className="truncate">
                    {t?.name} → {displayName} — ₹{r.total} • {dateLabel}
                    {d ? <span className="ml-2 text-xs text-muted-foreground">({d.name})</span> : null}
                  </div>
                  <Link
                    href={`/print/receipt?kind=lab&id=${r.id}`}
                    className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:opacity-90"
                  >
                    Print Receipt
                  </Link>
                </div>
              )
            })}
            {store.labRecords.length === 0 && <div className="p-4 text-sm text-muted-foreground">No records.</div>}
          </div>
        </div>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { uid } from "uid"

export default function LabPage() {
  const { store, addLabTest, deleteLabTest, addLabRecordsBatch } = useHCMS()
  const { role } = useAuth()
  const isReception = role === "reception"

  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [selectedTests, setSelectedTests] = useState<string[]>([])
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

  function toggleTestSelection(id: string) {
    setSelectedTests((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  function saveRecords() {
    if (selectedTests.length === 0) return
    const iso = dateStr && timeStr ? new Date(`${dateStr}T${timeStr}:00`).toISOString() : new Date().toISOString()
    const groupId = uid("labgroup")

    const records = selectedTests.map((tid) => ({
      labTestId: tid,
      patientId: patientId || undefined,
      patientName: patientName || undefined,
      dateISO: iso,
      doctorId: doctorId || undefined,
      groupId,
    }))

    addLabRecordsBatch(records)

    setSelectedTests([])
    setPatientId("")
    setPatientName("")
    setDoctorId("")
  }

  function formatDate(isoString: string) {
    const date = new Date(isoString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const ampm = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${day}/${month}/${year} ${displayHours}:${minutes} ${ampm}`
  }

  function getGroupedRecords() {
    const grouped: Record<string, any[]> = {}
    store.labRecords.forEach((r) => {
      const key = r.groupId || r.id
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(r)
    })
    return Object.values(grouped)
      .sort((a, b) => new Date(b[0].dateISO).getTime() - new Date(a[0].dateISO).getTime())
      .slice(0, 10)
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
            <Label>Select Lab Tests</Label>
            <div className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm max-h-44 overflow-auto">
              {store.labTests.map((t) => (
                <label key={t.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(t.id)}
                    onChange={() => toggleTestSelection(t.id)}
                  />
                  <span>{t.name} — ₹{t.price}</span>
                </label>
              ))}
              {store.labTests.length === 0 && <div className="text-sm text-muted-foreground">No lab tests found.</div>}
            </div>
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
            <Input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Sita Devi"
            />
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

          <Button className="bg-accent text-accent-foreground hover:opacity-90" onClick={saveRecords}>
            Save Records
          </Button>
        </div>

        <div className="mt-6">
          <div className="mb-2 font-medium">Recent Lab Records</div>
          <div className="rounded-lg border border-border">
            {getGroupedRecords().map((records) => {
              const first = records[0]
              const p = store.patients.find((x) => x.id === first.patientId)
              const d = store.doctors.find((x) => x.id === first.doctorId)
              const displayName = p?.name || first.patientName || "(General)"
              const dateLabel = formatDate(first.dateISO)
              return (
                <div key={first.groupId || first.id} className="border-b border-border px-3 py-2 text-sm">
                  <div className="font-medium">
                    {displayName} • {dateLabel}{" "}
                    {d && <span className="ml-2 text-xs text-muted-foreground">({d.name})</span>}
                  </div>

                  <ul className="ml-4 list-disc text-xs text-muted-foreground">
                    {records.map((r) => {
                      const t = store.labTests.find((x) => x.id === r.labTestId)
                      return <li key={r.id}>{t?.name} — ₹{r.total}</li>
                    })}
                  </ul>

                  <Link
                    href={`/print/receipt?kind=lab&id=${first.groupId ?? first.id}`}
                    className="mt-2 inline-block rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:opacity-90"
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

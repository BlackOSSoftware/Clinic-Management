"use client"

import { useState } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/lib/auth"

export default function ServicesPage() {
  const { store, addService, deleteService, addServiceRecordsBatch , updateService } = useHCMS()
  const { role } = useAuth()
  const isReception = role === "reception"

  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")

  // Record form states
  const [selectedServices, setSelectedServices] = useState<string[]>([]) // multiple services
  const [patientId, setPatientId] = useState<string | "">("")
  const [patientName, setPatientName] = useState("")
  const [doctorId, setDoctorId] = useState<string | "">("")

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const currentTime = now.toTimeString().slice(0, 5)
  const [dateStr, setDateStr] = useState(today)
  const [timeStr, setTimeStr] = useState(currentTime)

  // ----- SERVICES CRUD -----
  function saveService() {
    if (!name || !price) return
    addService({ name, price: Number(price) })
    setName("")
    setPrice("")
  }

  function startEdit(service: any) {
    setEditId(service.id)
    setEditName(service.name)
    setEditPrice(String(service.price))
  }

  function saveEdit(id: string) {
    if (!editName || !editPrice) return
    updateService(id, { name: editName, price: Number(editPrice) })
    setEditId(null)
    setEditName("")
    setEditPrice("")
  }

  // ----- RECORD CREATION -----
  function toggleServiceSelection(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function addRecord() {
    if (selectedServices.length === 0) {
      alert("Please select at least one service.")
      return
    }

    // Validate patient
    let validPatientId: string | undefined
    if (patientId) {
      const foundPatient = store.patients.find((p) => p.id === patientId)
      if (!foundPatient) {
        alert("Selected patient not found.")
        return
      }
      validPatientId = foundPatient.id
    }

    // Validate doctor
    let validDoctorId: string | undefined
    if (doctorId) {
      const foundDoctor = store.doctors.find((d) => d.id === doctorId)
      if (!foundDoctor) {
        alert("Selected doctor not found.")
        return
      }
      validDoctorId = foundDoctor.id
    }

    const iso = dateStr && timeStr ? new Date(`${dateStr}T${timeStr}:00`).toISOString() : undefined
    const groupId = `grp_${Date.now()}` // group ID to link multiple services

    const records = selectedServices.map((sid) => ({
  serviceId: sid,
  patientId: validPatientId,
  patientName: patientName || undefined,
  dateISO: iso,
  doctorId: validDoctorId,
  groupId,
}))

// Batch insert all at once (new helper)
addServiceRecordsBatch(records)


    setSelectedServices([])
    setPatientId("")
    setPatientName("")
    setDoctorId("")
  }

  function formatDate(isoString: string | undefined) {
    if (!isoString) return ""
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

  // Helper: group serviceRecords by groupId (fallback to record id)
  function getGroupedRecords(limit = 10) {
    const grouped = store.serviceRecords.reduce((acc: Record<string, any[]>, r: any) => {
      const key = r.groupId || r.id
      if (!acc[key]) acc[key] = []
      acc[key].push(r)
      return acc
    }, {})

    const groups = Object.values(grouped)
      .sort((a: any[], b: any[]) => {
        const ad = a[0]?.dateISO ? new Date(a[0].dateISO).getTime() : 0
        const bd = b[0]?.dateISO ? new Date(b[0].dateISO).getTime() : 0
        return bd - ad
      })
      .slice(0, limit)

    return groups
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {!isReception && (
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="mb-3 font-semibold">Add Service</div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={saveService}>
              Save Service
            </Button>
          </div>

          <div className="mt-6">
            <div className="mb-2 font-medium">Services</div>
            <div className="rounded-lg border border-border">
              {store.services.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b border-border px-3 py-2 text-sm"
                >
                  {editId === s.id ? (
                    <div className="flex w-full items-center justify-between gap-3">
                      <Input
                        className="w-1/2"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <Input
                        className="w-1/4"
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:opacity-90"
                          onClick={() => saveEdit(s.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="truncate">{s.name}</div>
                      <div className="flex items-center gap-3">
                        <div>₹ {s.price}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(s)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteService(s.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {store.services.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No services.</div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-3 font-semibold">Add Service Record</div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Select Services (multiple)</Label>
            <div className="rounded-md border border-input bg-background p-2">
              {store.services.map((s: any) => (
                <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(s.id)}
                    onChange={() => toggleServiceSelection(s.id)}
                  />
                  {s.name} — ₹{s.price}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Attach to Patient (optional)</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">General Service</option>
              {store.patients.map((p: any) => (
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
              {store.doctors.map((d: any) => (
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
              placeholder="e.g. Ramesh Kumar"
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

          <Button className="bg-accent text-accent-foreground hover:opacity-90" onClick={addRecord}>
            Save Record(s)
          </Button>
        </div>

        <div className="mt-6">
          <div className="mb-2 font-medium">Recent Service Records</div>
          <div className="rounded-lg border border-border">
            {(() => {
              const groups = getGroupedRecords(10)

              if (groups.length === 0) {
                return (
                  <div className="p-4 text-sm text-muted-foreground">No records.</div>
                )
              }

              return groups.map((records: any[]) => {
                const first = records[0]
                const p = store.patients.find((x: any) => x.id === first.patientId)
                const d = store.doctors.find((x: any) => x.id === first.doctorId)
                const displayName = p?.name || first.patientName || "(General)"
                const dateLabel = formatDate(first.dateISO)
                const groupKey = first.groupId || first.id

                // calculate group total
                const groupTotal = records.reduce((sum, r) => sum + (r.total || 0), 0)

                return (
                  <div
                    key={groupKey}
                    className="border-b border-border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <span className="font-medium">{displayName}</span> — {dateLabel}
                        {d ? (
                          <span className="ml-2 text-xs text-muted-foreground">({d.name})</span>
                        ) : null}
                      </div>
                      <div className="text-sm">₹ {groupTotal}</div>
                    </div>

                    <ul className="ml-4 mt-1 mb-2 list-disc text-xs text-muted-foreground">
                      {records.map((r) => {
                        const s = store.services.find((x: any) => x.id === r.serviceId)
                        return (
                          <li key={r.id}>
                            {s?.name || "(Service)"} — ₹{r.total}
                          </li>
                        )
                      })}
                    </ul>

                    <Link
                      href={`/print/receipt?kind=service&id=${first.groupId ?? first.id}`}
                      className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:opacity-90"
                    >
                      Print Receipt
                    </Link>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </Card>
    </div>
  )
}

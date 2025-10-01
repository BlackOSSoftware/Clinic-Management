"use client"

import { useState } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function DoctorsPage() {
  const { store, addDoctor, updateDoctor, deleteDoctor } = useHCMS()
  const [form, setForm] = useState({ name: "", specialization: "", fee: "", doctorSharePercent: "50" })

  function submit() {
    if (!form.name || !form.specialization || !form.fee) return
    addDoctor({
      name: form.name,
      specialization: form.specialization,
      fee: Number(form.fee),
      doctorSharePercent: Number(form.doctorSharePercent),
    })
    setForm({ name: "", specialization: "", fee: "", doctorSharePercent: "50" })
  }

  const monthKey = new Date().toISOString().slice(0, 7)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-3 font-semibold">Add Doctor</div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Specialization</Label>
            <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fee</Label>
              <Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
            </div>
            <div>
              <Label>Doctor Share %</Label>
              <Input
                type="number"
                value={form.doctorSharePercent}
                onChange={(e) => setForm({ ...form, doctorSharePercent: e.target.value })}
              />
            </div>
          </div>
          <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={submit}>
            Save Doctor
          </Button>
        </div>
      </Card>

      <Card className="rounded-xl p-4 shadow-sm lg:col-span-2">
        <div className="mb-3 font-semibold">Doctors</div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <div className="grid grid-cols-7 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <div>Name</div>
            <div>Specialization</div>
            <div>Fee</div>
            <div>Doctor %</div>
            <div>Patient Share</div>
            <div>Svc+Lab Share</div>
            <div className="text-right">Actions</div>
          </div>
          {store.doctors.map((d) => {
            const pat = store.patients.filter((p) => p.doctorId === d.id && p.dateISO.slice(0, 7) === monthKey)
            const patientShare = pat.reduce((sum, p) => sum + p.doctorShare, 0)

            const svcShare = store.serviceRecords
              .filter((r) => r.doctorId === d.id && r.dateISO.slice(0, 7) === monthKey)
              .reduce((s, r) => s + (r.doctorShare || 0), 0)
            const labShare = store.labRecords
              .filter((r) => r.doctorId === d.id && r.dateISO.slice(0, 7) === monthKey)
              .reduce((s, r) => s + (r.doctorShare || 0), 0)

            const payout = patientShare + svcShare + labShare

            return (
              <div key={d.id} className="grid grid-cols-7 items-center gap-2 border-b border-border px-3 py-2 text-sm">
                <div className="truncate">{d.name}</div>
                <div className="truncate">{d.specialization}</div>
                <div>₹ {d.fee}</div>
                <div>{d.doctorSharePercent}%</div>
                <div>₹ {patientShare}</div>
                <div>₹ {svcShare + labShare}</div>
                <div className="flex justify-end gap-2">
                  <div className="text-xs text-muted-foreground self-center">Total: ₹ {payout}</div>
                  <Button
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground"
                    onClick={() => updateDoctor(d.id, { doctorSharePercent: Math.min(90, d.doctorSharePercent + 5) })}
                  >
                    +5% Share
                  </Button>
                  <Button variant="destructive" onClick={() => deleteDoctor(d.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
          {store.doctors.length === 0 && <div className="p-4 text-sm text-muted-foreground">No doctors added.</div>}
        </div>
      </Card>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"

type FormState = {
  name: string
  phone: string
  age: string
  gender: "Male" | "Female" | "Other"
  address: string
  doctorId: string
  reference?: string
  discountPercent?: string
  referralPercent?: string
  addService: boolean
  serviceId: string
  addLab: boolean
  labTestId: string
  appointmentDate: string
  appointmentTime: string
}

export default function PatientsPage() {
  const { store, addPatient, updatePatient, addServiceRecord, addLabRecord } = useHCMS()

  const now = new Date()
  const todayDate = now.toISOString().slice(0, 10)
  const currentTime = now.toTimeString().slice(0, 5)

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    age: "",
    gender: "Male",
    address: "",
    doctorId: store.doctors[0]?.id ?? "",
    reference: "",
    discountPercent: "",
    referralPercent: "",
    addService: false,
    serviceId: store.services[0]?.id ?? "",
    addLab: false,
    labTestId: store.labTests[0]?.id ?? "",
    appointmentDate: todayDate,
    appointmentTime: currentTime,
  })

  const [referralDialog, setReferralDialog] = useState<{ open: boolean; patientId: string | null }>({
    open: false,
    patientId: null,
  })
  const [referralDoctor, setReferralDoctor] = useState("")
  const [referralHospital, setReferralHospital] = useState("")

  const [lookup, setLookup] = useState("")
  const matches = useMemo(() => {
    const t = lookup.trim().toLowerCase()
    if (!t) return []
    return store.patients
      .slice()
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .filter((p) => p.name.toLowerCase().includes(t) || p.phone.includes(t))
      .slice(0, 6)
  }, [lookup, store.patients])

  const selectedDoctor = store.doctors.find((d) => d.id === form.doctorId)
  const baseFee = selectedDoctor?.fee ?? 0
  const discountPct = Number(form.discountPercent || 0)
  const fee = Math.round(baseFee * (1 - Math.max(0, Math.min(100, discountPct)) / 100))

  const todayISO = new Date().toISOString().slice(0, 10)
  const [q, setQ] = useState("")
  const [showAll, setShowAll] = useState(false)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return store.patients
      .filter((p) => (showAll ? true : p.dateISO.slice(0, 10) === todayISO))
      .filter((p) => {
        if (!term) return true
        const doc = store.doctors.find((d) => d.id === p.doctorId)
        return (
          p.name.toLowerCase().includes(term) ||
          p.phone.includes(term) ||
          (doc?.name.toLowerCase().includes(term) ?? false)
        )
      })
  }, [store.patients, store.doctors, q, todayISO, showAll])

  function submit() {
    if (!form.name || !form.phone || !form.doctorId) {
      alert("Please fill in Name, Phone, and Doctor")
      return
    }

    const appointmentDateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}:00`).toISOString()

    const patient = addPatient({
      name: form.name,
      phone: form.phone,
      age: Number(form.age || 0),
      gender: form.gender,
      address: form.address,
      doctorId: form.doctorId,
      reference: form.reference,
      discountPercent: Number(form.discountPercent || 0),
      referralPercent: form.referralPercent ? Number(form.referralPercent) : undefined,
      dateISO: appointmentDateTime,
    })

    if (form.addService && form.serviceId) {
      addServiceRecord(form.serviceId, patient.id, undefined, appointmentDateTime, form.doctorId)
    }

    if (form.addLab && form.labTestId) {
      addLabRecord(form.labTestId, patient.id, undefined, appointmentDateTime, form.doctorId)
    }

    setForm((s) => ({
      ...s,
      name: "",
      phone: "",
      age: "",
      address: "",
      reference: "",
      discountPercent: "",
      referralPercent: "",
      addService: false,
      serviceId: store.services[0]?.id ?? "",
      addLab: false,
      labTestId: store.labTests[0]?.id ?? "",
      appointmentDate: todayDate,
      appointmentTime: currentTime,
    }))
    setLookup("")
  }

  function submitReferral() {
    if (!referralDialog.patientId) return
    updatePatient(referralDialog.patientId, {
      referredToDoctor: referralDoctor.trim() || undefined,
      referredToHospital: referralHospital.trim() || undefined,
      referredDate: new Date().toISOString(),
    })
    setReferralDialog({ open: false, patientId: null })
    setReferralDoctor("")
    setReferralHospital("")
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="rounded-xl p-4 shadow-sm lg:col-span-1">
        <div className="mb-3 font-semibold">Add New Patient</div>

        <div className="mb-3">
          <Label htmlFor="lookup">Search Existing (name or phone)</Label>
          <Input
            id="lookup"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="e.g. Ramesh or 98xxxxxx"
          />
          {matches.length > 0 && (
            <div className="mt-2 rounded-md border border-border">
              {matches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setForm({
                      name: p.name,
                      phone: p.phone,
                      age: String(p.age || ""),
                      gender: p.gender,
                      address: p.address,
                      doctorId: p.doctorId,
                      reference: p.reference || "",
                      discountPercent: "",
                      referralPercent: p.referralPercent ? String(p.referralPercent) : "",
                      addService: false,
                      serviceId: store.services[0]?.id ?? "",
                      addLab: false,
                      labTestId: store.labTests[0]?.id ?? "",
                      appointmentDate: todayDate,
                      appointmentTime: currentTime,
                    })
                    setLookup("")
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {p.name} • {p.phone}
                  <span className="ml-2 text-xs text-muted-foreground">
                    last: {new Date(p.dateISO).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="doctor">Doctor</Label>
            <select
              id="doctor"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.doctorId}
              onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
            >
              {store.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialization}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="appointmentDate">Appointment Date</Label>
              <Input
                id="appointmentDate"
                type="date"
                value={form.appointmentDate}
                onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="appointmentTime">Appointment Time</Label>
              <Input
                id="appointmentTime"
                type="time"
                value={form.appointmentTime}
                onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="discount">Discount %</Label>
              <Input
                id="discount"
                type="number"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                placeholder="e.g. 5 or 10"
              />
            </div>
            <div>
              <Label htmlFor="refPct">Referral %</Label>
              <Input
                id="refPct"
                type="number"
                value={form.referralPercent}
                onChange={(e) => setForm({ ...form, referralPercent: e.target.value })}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label>Fee</Label>
              <div className="mt-1 rounded-md border border-input bg-muted px-3 py-2 text-sm">₹ {fee}</div>
            </div>
            <div className="col-span-2">
              <Label htmlFor="ref">Reference</Label>
              <Input
                id="ref"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Referred by (optional)"
              />
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="mb-2 text-sm font-medium">Add Records with Patient</div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.addService}
                  onChange={(e) => setForm({ ...form, addService: e.target.checked })}
                />
                Add Service Record
              </label>
              {form.addService && (
                <select
                  className="ml-6 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                >
                  {store.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ₹{s.price}
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.addLab}
                  onChange={(e) => setForm({ ...form, addLab: e.target.checked })}
                />
                Add Lab Record
              </label>
              {form.addLab && (
                <select
                  className="ml-6 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.labTestId}
                  onChange={(e) => setForm({ ...form, labTestId: e.target.value })}
                >
                  {store.labTests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — ₹{t.price}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <Button className="bg-primary text-primary-foreground hover:opacity-90" onClick={submit}>
            Save & Add to List
          </Button>
        </div>
      </Card>

      <Card className="rounded-xl p-4 shadow-sm lg:col-span-2">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold">Patient List {showAll ? "(All)" : "(Today)"}</div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="mr-2 align-middle"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Show all patients
            </label>
            <Input
              placeholder="Search by name, number, doctor..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[900px] rounded-lg border border-border">
            <div className="grid grid-cols-7 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
              <div>ID</div>
              <div>Name</div>
              <div>Phone</div>
              <div>Doctor</div>
              <div>Fee</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            {filtered.map((p) => {
              const d = store.doctors.find((x) => x.id === p.doctorId)
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-7 items-center gap-2 border-b border-border px-3 py-2 text-sm"
                >
                  <div className="truncate">{p.id.slice(0, 6)}</div>
                  <div className="truncate">
                    <div className="truncate">{p.name}</div>
                    {(p.referredToHospital || p.referredToDoctor) && (
                      <div className="truncate text-xs text-muted-foreground">
                        {"\u2192"} Referred: {p.referredToDoctor || "—"}
                        {p.referredToHospital ? ` @ ${p.referredToHospital}` : ""}
                      </div>
                    )}
                  </div>
                  <div>{p.phone}</div>
                  <div className="truncate">{d?.name}</div>
                  <div>₹ {p.fee}</div>
                  <div>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${p.attended ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
                    >
                      {p.attended ? "Attended" : "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Dialog
                      open={referralDialog.open && referralDialog.patientId === p.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setReferralDialog({ open: true, patientId: p.id })
                          setReferralDoctor(p.referredToDoctor || "")
                          setReferralHospital(p.referredToHospital || "")
                        } else {
                          setReferralDialog({ open: false, patientId: null })
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <button className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground hover:opacity-90">
                          Refer
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Refer Patient</DialogTitle>
                          <DialogDescription>Refer {p.name} to another doctor or hospital</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="refDoctor">Doctor Name</Label>
                            <Input
                              id="refDoctor"
                              value={referralDoctor}
                              onChange={(e) => setReferralDoctor(e.target.value)}
                              placeholder="e.g. Dr. Sharma (Cardiology)"
                            />
                          </div>
                          <div>
                            <Label htmlFor="refHospital">Hospital Name (Optional)</Label>
                            <Input
                              id="refHospital"
                              value={referralHospital}
                              onChange={(e) => setReferralHospital(e.target.value)}
                              placeholder="e.g. CityCare Hospital"
                            />
                          </div>
                          <Button onClick={submitReferral} className="w-full">
                            Save Referral
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <button
                      onClick={() => updatePatient(p.id, { attended: !p.attended })}
                      className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:opacity-90"
                    >
                      {p.attended ? "Unmark" : "Mark Attended"}
                    </button>
                    <Link
                      href={`/print/receipt?kind=appointment&id=${p.id}`}
                      className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:opacity-90"
                    >
                      Print Receipt
                    </Link>
                    <Link
                      href={`/print/prescription?id=${p.id}`}
                      className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90"
                    >
                      Print Prescription
                    </Link>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <div className="p-4 text-sm text-muted-foreground">No patients found.</div>}
          </div>
        </div>
      </Card>
    </div>
  )
}

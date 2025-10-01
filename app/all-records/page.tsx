"use client"

import { useMemo, useState } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type UnifiedRecord = {
  id: string
  type: "patient" | "service" | "lab"
  dateISO: string
  name: string
  patientName?: string
  doctorName?: string
  amount: number
  details: string
}

export default function AllRecordsPage() {
  const { store } = useHCMS()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "patient" | "service" | "lab">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const unifiedRecords = useMemo(() => {
    const records: UnifiedRecord[] = []

    // Add all patients
    store.patients.forEach((p) => {
      const doctor = store.doctors.find((d) => d.id === p.doctorId)
      records.push({
        id: p.id,
        type: "patient",
        dateISO: p.dateISO,
        name: "Patient Registration",
        patientName: p.name,
        doctorName: doctor?.name,
        amount: p.fee,
        details: `${p.name} • ${p.phone} • ${p.age}y ${p.gender}`,
      })
    })

    // Add all service records
    store.serviceRecords.forEach((r) => {
      const service = store.services.find((s) => s.id === r.serviceId)
      const patient = store.patients.find((p) => p.id === r.patientId)
      const doctor = store.doctors.find((d) => d.id === r.doctorId)
      const displayName = patient?.name || r.patientName || "(General)"
      records.push({
        id: r.id,
        type: "service",
        dateISO: r.dateISO,
        name: service?.name || "Service",
        patientName: displayName,
        doctorName: doctor?.name,
        amount: r.total,
        details: `${service?.name} → ${displayName}`,
      })
    })

    // Add all lab records
    store.labRecords.forEach((r) => {
      const test = store.labTests.find((t) => t.id === r.labTestId)
      const patient = store.patients.find((p) => p.id === r.patientId)
      const doctor = store.doctors.find((d) => d.id === r.doctorId)
      const displayName = patient?.name || r.patientName || "(General)"
      records.push({
        id: r.id,
        type: "lab",
        dateISO: r.dateISO,
        name: test?.name || "Lab Test",
        patientName: displayName,
        doctorName: doctor?.name,
        amount: r.total,
        details: `${test?.name} → ${displayName}`,
      })
    })

    // Sort by date (newest first)
    return records.sort((a, b) => b.dateISO.localeCompare(a.dateISO))
  }, [store])

  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter((record) => {
      // Filter by type
      if (filterType !== "all" && record.type !== filterType) return false

      // Filter by date range
      if (dateFrom && record.dateISO < new Date(dateFrom).toISOString()) return false
      if (dateTo && record.dateISO > new Date(`${dateTo}T23:59:59`).toISOString()) return false

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        return (
          record.name.toLowerCase().includes(term) ||
          record.patientName?.toLowerCase().includes(term) ||
          record.doctorName?.toLowerCase().includes(term) ||
          record.details.toLowerCase().includes(term)
        )
      }

      return true
    })
  }, [unifiedRecords, searchTerm, filterType, dateFrom, dateTo])

  const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-4 font-semibold text-lg">All Records</div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by name, patient, doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="filterType">Filter by Type</Label>
            <select
              id="filterType"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">All Types</option>
              <option value="patient">Patients Only</option>
              <option value="service">Services Only</option>
              <option value="lab">Lab Tests Only</option>
            </select>
          </div>

          <div>
            <Label htmlFor="dateFrom">From Date</Label>
            <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="dateTo">To Date</Label>
            <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredRecords.length} of {unifiedRecords.length} records
          </div>
          <div className="text-sm font-medium">Total Amount: ₹ {totalAmount}</div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px] rounded-lg border border-border">
            <div className="grid grid-cols-6 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
              <div>Date & Time</div>
              <div>Type</div>
              <div>Name</div>
              <div>Patient</div>
              <div>Doctor</div>
              <div className="text-right">Amount</div>
            </div>

            {filteredRecords.map((record) => {
              const typeColors = {
                patient: "bg-primary/10 text-primary",
                service: "bg-accent/10 text-accent-foreground",
                lab: "bg-secondary text-secondary-foreground",
              }

              return (
                <div
                  key={`${record.type}-${record.id}`}
                  className="grid grid-cols-6 items-center gap-2 border-b border-border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <div className="text-xs">
                    {new Date(record.dateISO).toLocaleDateString()}
                    <br />
                    <span className="text-muted-foreground">
                      {new Date(record.dateISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div>
                    <span className={`rounded px-2 py-0.5 text-xs ${typeColors[record.type]}`}>
                      {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                    </span>
                  </div>
                  <div className="truncate">{record.name}</div>
                  <div className="truncate">{record.patientName || "—"}</div>
                  <div className="truncate">{record.doctorName || "—"}</div>
                  <div className="text-right font-medium">₹ {record.amount}</div>
                </div>
              )
            })}

            {filteredRecords.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No records found matching your filters.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

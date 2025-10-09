"use client"

import { useMemo, useState, useRef } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"

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

export default function AllRecords() {
  const { store } = useHCMS()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "patient" | "service" | "lab">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const tableRef = useRef<HTMLDivElement>(null)

  const unifiedRecords = useMemo(() => {
    const records: UnifiedRecord[] = []

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

    return records.sort((a, b) => b.dateISO.localeCompare(a.dateISO))
  }, [store])

  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter((record) => {
      if (filterType !== "all" && record.type !== filterType) return false
      if (dateFrom && record.dateISO < new Date(dateFrom).toISOString()) return false
      if (dateTo && record.dateISO > new Date(`${dateTo}T23:59:59`).toISOString()) return false

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

  // Print filtered table
  const handlePrint = () => {
    if (!tableRef.current) return
    const printContent = tableRef.current.innerHTML
    const newWindow = window.open("", "_blank")
    if (!newWindow) return
    newWindow.document.write(`
      <html>
        <head>
          <title>Print Records</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #999; padding: 6px; text-align: left; }
            th { background-color: #f3f3f3; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)
    newWindow.document.close()
    newWindow.focus()
    newWindow.print()
    newWindow.close()
  }

  // Export filtered table to Excel
  const handleExportExcel = () => {
    const wsData = filteredRecords.map((r) => ({
      Date: new Date(r.dateISO).toLocaleString(),
      Type: r.type,
      Name: r.name,
      Patient: r.patientName || "",
      Doctor: r.doctorName || "",
      Amount: r.amount,
      Details: r.details,
    }))
    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Records")
    XLSX.writeFile(wb, "filtered_records.xlsx")
  }

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

        <div className="mb-4 flex items-center gap-4">
          <Button onClick={handlePrint}>Print Table</Button>
          <Button onClick={handleExportExcel} variant="secondary">
            Export to Excel
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredRecords.length} of {unifiedRecords.length} records
          </div>
          <div className="text-sm font-medium">Total Amount: ₹ {totalAmount}</div>
        </div>

        <div className="overflow-x-auto" ref={tableRef}>
          <table className="min-w-[800px] border border-border">
            <thead className="bg-muted text-xs font-medium">
              <tr>
                <th className="p-2 border border-border">Date & Time</th>
                <th className="p-2 border border-border">Patient</th>
                <th className="p-2 border border-border">Type</th>
                <th className="p-2 border border-border">Name</th>
                <th className="p-2 border border-border">Doctor</th>
                <th className="p-2 border border-border">Amount</th>
              </tr>
            </thead>
            <tbody className="capitalize">
              {filteredRecords.map((record) => (
                <tr key={`${record.type}-${record.id}`} className="hover:bg-muted/50">
                  <td className="p-2 border border-border text-xs">
                    {new Date(record.dateISO).toLocaleDateString()}<br />
                    <span className="text-muted-foreground">
                      {new Date(record.dateISO).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="p-2 border border-border text-xs truncate">{record.patientName || "—"}</td>
                  <td className="p-2 border border-border text-xs">{record.type}</td>
                  <td className="p-2 border border-border text-xs truncate">{record.name}</td>
                  <td className="p-2 border border-border text-xs truncate">{record.doctorName || "—"}</td>
                  <td className="p-2 border border-border text-xs text-right">₹ {record.amount}</td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">
                    No records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

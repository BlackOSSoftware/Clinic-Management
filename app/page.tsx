"use client"

import { useMemo } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { PatientsByDoctorChart } from "@/components/charts/patients-by-doctor"
import { IncomeDistributionChart } from "@/components/charts/income-distribution"

export default function DashboardPage() {
  const { store } = useHCMS()

  const todayISO = new Date().toISOString().slice(0, 10)
  const todaysPatients = useMemo(
    () => store.patients.filter((p) => p.dateISO.slice(0, 10) === todayISO),
    [store.patients, todayISO],
  )

  const totals = useMemo(() => {
    const totalCollected =
      store.patients.reduce((sum, p) => sum + p.fee, 0) +
      store.serviceRecords.reduce((s, r) => s + r.total, 0) +
      store.labRecords.reduce((s, r) => s + r.total, 0)

    const doctorShare = store.patients.reduce((sum, p) => sum + p.doctorShare, 0)
    const hospitalShare = store.patients.reduce((sum, p) => sum + p.hospitalShare, 0)

    return { totalCollected, doctorShare, hospitalShare }
  }, [store])

  const doctorCounts = useMemo(() => {
    return store.doctors.map((d) => ({
      doctor: d.name,
      count: store.patients.filter((p) => p.doctorId === d.id).length,
    }))
  }, [store])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Today&apos;s Patients</div>
          <div className="mt-2 text-2xl font-semibold">{todaysPatients.length}</div>
        </Card>
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Total Collected</div>
          <div className="mt-2 text-2xl font-semibold">₹ {totals.totalCollected}</div>
        </Card>
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Doctors</div>
          <div className="mt-2 text-2xl font-semibold">{store.doctors.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-xl p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 font-medium">Patients per Doctor</div>
          <PatientsByDoctorChart data={doctorCounts} />
        </Card>
        <Card className="rounded-xl p-4 shadow-sm">
          <div className="mb-4 font-medium">Income Distribution</div>
          <IncomeDistributionChart
            data={[
              { name: "Doctor", value: totals.doctorShare },
              { name: "Hospital", value: totals.hospitalShare },
            ]}
          />
        </Card>
      </div>

      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-2 font-medium">Today by Doctor</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {store.doctors.map((d) => {
            const pts = todaysPatients.filter((p) => p.doctorId === d.id)
            return (
              <div key={d.id} className="rounded-lg border border-border p-3">
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.specialization}</div>
                <div className="mt-2 text-sm">Patients today: {pts.length}</div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

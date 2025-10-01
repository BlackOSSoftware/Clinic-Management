"use client"

import { useMemo } from "react"
import { useHCMS } from "@/lib/store"
import { Card } from "@/components/ui/card"

export default function ReferencesPage() {
  const { store } = useHCMS()

  const referenceCounts = useMemo(() => {
    const map = new Map<string, number>()
    store.patients.forEach((p) => {
      const key = (p.reference || "Unknown").trim() || "Unknown"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
  }, [store.patients])

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="rounded-xl p-4 shadow-sm">
        <div className="mb-3 font-semibold">Reference Summary</div>
        <div className="rounded-lg border border-border">
          <div className="grid grid-cols-2 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
            <div>Reference Source</div>
            <div>Patient Count</div>
          </div>
          {referenceCounts.map((r) => (
            <div key={r.name} className="grid grid-cols-2 gap-2 border-b border-border px-3 py-2 text-sm">
              <div className="truncate">{r.name}</div>
              <div>{r.count}</div>
            </div>
          ))}
          {referenceCounts.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No referenced patients yet.</div>
          )}
        </div>
      </Card>
    </div>
  )
}

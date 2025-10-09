"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import jsPDF from "jspdf"
import "jspdf-autotable"

export default function Expensise() {
  const [expName, setExpName] = useState("")
  const [expAmount, setExpAmount] = useState("")
  const [expDate, setExpDate] = useState("")
  const [expenses, setExpenses] = useState<any[]>([])

  // ✅ Add new expense
  const addNewExpense = () => {
    if (!expName || !expAmount || !expDate) {
      alert("Please fill all fields before adding an expense.")
      return
    }

    const newExp = {
      id: Date.now(),
      name: expName,
      amount: Number(expAmount),
      dateISO: expDate,
    }

    setExpenses((prev) => [...prev, newExp])
    setExpName("")
    setExpAmount("")
    setExpDate("")
  }

  // ✅ Delete expense
  const deleteExpense = (id: number) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  // ✅ Total amount
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  // ✅ Export to PDF
  const exportExpensesPDF = () => {
    if (expenses.length === 0) {
      alert("No expenses to export.")
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text("Expense Report", 14, 15)

    const startDate = new Date(
      Math.min(...expenses.map((e) => new Date(e.dateISO).getTime()))
    ).toLocaleDateString()
    const endDate = new Date(
      Math.max(...expenses.map((e) => new Date(e.dateISO).getTime()))
    ).toLocaleDateString()

    doc.setFontSize(10)
    doc.text(`Date Range: ${startDate} - ${endDate}`, 14, 23)

    const tableData = expenses.map((e, index) => [
      index + 1,
      new Date(e.dateISO).toLocaleDateString(),
      e.name,
      `₹ ${e.amount.toLocaleString("en-IN")}`,
    ])

    ;(doc as any).autoTable({
      head: [["#", "Date", "Expense Name", "Amount"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [60, 60, 60] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.text(
      `Total Expenses: ₹ ${expenseTotal.toLocaleString("en-IN")}`,
      14,
      finalY
    )

    doc.save("Expense_Report.pdf")
  }

  return (
    <Card className="rounded-xl p-4 shadow-sm">
      <div className="mb-3 font-semibold text-lg">Expenses (Admin)</div>

      {/* Add Form */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <Label>Name</Label>
          <Input
            value={expName}
            onChange={(e) => setExpName(e.target.value)}
            placeholder="e.g. Electricity Bill"
          />
        </div>

        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            value={expAmount}
            onChange={(e) => setExpAmount(e.target.value)}
            placeholder="e.g. 2500"
          />
        </div>

        <div>
          <Label>Date</Label>
          <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
        </div>

        <div className="md:self-end">
          <Button
            className="w-full bg-secondary text-secondary-foreground hover:opacity-90"
            onClick={addNewExpense}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* Expense List */}
      <div className="mt-4 rounded-lg border border-border">
        <div className="grid grid-cols-4 gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium">
          <div>Date</div>
          <div>Name</div>
          <div>Amount</div>
          <div className="text-right">Actions</div>
        </div>

        {expenses.map((e) => (
          <div
            key={e.id}
            className="grid grid-cols-4 items-center gap-2 border-b border-border px-3 py-2 text-sm"
          >
            <div>{new Date(e.dateISO).toLocaleDateString()}</div>
            <div className="truncate">{e.name}</div>
            <div>₹ {e.amount.toLocaleString("en-IN")}</div>
            <div className="text-right">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteExpense(e.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}

        {expenses.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">
            No expenses added yet.
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="mt-3 flex flex-col md:flex-row justify-between items-center text-sm font-medium">
        <div>Total Expenses: ₹ {expenseTotal.toLocaleString("en-IN")}</div>
        <Button
          variant="secondary"
          className="mt-2 md:mt-0"
          onClick={exportExpensesPDF}
          disabled={expenses.length === 0}
        >
          Download Expense Report (PDF)
        </Button>
      </div>
    </Card>
  )
}

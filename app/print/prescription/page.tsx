"use client";

import { useSearchParams } from "next/navigation";
import { useHCMS } from "@/lib/store";
import { Stethoscope } from "lucide-react";
import { useRef } from "react";

export default function PrintPrescriptionPage() {
  const params = useSearchParams();
  const id = params.get("id");
  const { store } = useHCMS();
  const printRef = useRef<HTMLDivElement>(null);

  const patient = store.patients.find((p) => p.id === id);
  const doctor = store.doctors.find((d) => d.id === (patient?.doctorId || ""));

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const newWindow = window.open("", "_blank");
    if (!newWindow) return;

    newWindow.document.write(`
      <html>
        <head>
          <title>Prescription - ${patient?.name || "Patient"}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: Arial, sans-serif;
              background: white;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            .prescription {
              width: 100%;
              max-width: 210mm;
              min-height: 297mm;
              margin: auto;
              padding: 25px;
              border: 1px solid #ccc;
              border-radius: 10px;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 1px solid #ccc;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .hospital-info {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .hospital-logo {
              background: #e0f0ff;
              color: #007bff;
              border-radius: 8px;
              width: 48px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .hospital-name {
              font-size: 18px;
              font-weight: bold;
            }
            .doctor-info {
              text-align: right;
              font-size: 13px;
              line-height: 1.4;
            }
            .patient-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              margin-bottom: 25px;
              font-size: 14px;
              text-transform: capitalize;
            }
            .prescription-area {
              border: 2px dashed #999;
              min-height: 600px;
              padding: 25px;
              font-size: 18px;
              color: #ccc;
            }
            .signature {
              text-align: right;
              margin-top: 60px;
            }
            .signature-box {
              width: 200px;
              height: 60px;
              border: 1px solid #999;
              margin-left: auto;
              border-radius: 6px;
            }
            .signature-label {
              font-size: 12px;
              color: #555;
              margin-top: 5px;
            }
            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);

    newWindow.document.close();
    newWindow.focus();
    newWindow.print();
  };

  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(
    today.getMonth() + 1
  ).padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen p-6">
      <div className="w-full flex flex-col items-center">
        {/* Toolbar */}
        <div className="no-print mb-4 flex items-center justify-between w-[210mm]">
          <div className="text-xl font-semibold">Preview Prescription</div>
          <button
            onClick={handlePrint}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Print
          </button>
        </div>

        {/* A4 Preview Box */}
        <div
          ref={printRef}
          className="prescription bg-white border border-gray-300 rounded-xl shadow-sm"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "25px",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div className="header flex justify-between items-start border-b border-gray-300 pb-3 mb-5">
            <div className="hospital-info flex items-center gap-3">
              <div className="hospital-logo bg-blue-100 text-blue-600 rounded-lg w-12 h-12 flex items-center justify-center">
                <Stethoscope size={28} />
              </div>
              <div>
                <div className="hospital-name text-lg font-bold">JANTA POLYCLINIC</div>
                <div className="text-sm text-gray-500">
                 
                </div>
              </div>
            </div>
            <div className="doctor-info text-right text-sm leading-tight">
              <div className="font-medium">
                {doctor?.name || "Dr. A. Khan"} <br />
                {doctor?.degree || "MBBS"}
              </div>
              <div>{doctor?.specialization || "General Physician"}</div>
            </div>
          </div>

          {/* Patient Info */}
          <div className="patient-section grid grid-cols-2 mb-6 text-sm">
            <div>
              <div className="font-medium mb-1">Patient</div>
              Name - {patient?.name || "Anas"} <br />
              Age - {patient?.age || "22"} <br />
              Gender - {patient?.gender || "Male"}
            </div>
            <div className="text-right">
              <div className="font-medium mb-1">Date</div>
              {formattedDate}
            </div>
          </div>

          {/* Prescription */}
          <div className="prescription-area border-2 border-dashed border-gray-400 min-h-[600px] p-6 text-gray-400 text-lg">
            RX
          </div>

          {/* Signature */}
          <div className="signature text-right mt-16">
            <div className="signature-box border border-gray-400 w-48 h-14 rounded-md ml-auto"></div>
            <div className="signature-label text-xs text-gray-500 mt-1">
              Doctor Signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client"

import useSWR, { mutate as globalMutate } from "swr"

export type Doctor = {
  id: string
  name: string
  specialization: string
  fee: number
  doctorSharePercent: number // e.g., 50 means 50% to doctor
}

export type Patient = {
  id: string
  name: string
  phone: string
  age: number
  gender: "Male" | "Female" | "Other"
  address: string
  doctorId: string
  dateISO: string // registration/visit date
  fee: number // fee after discount
  doctorShare: number
  hospitalShare: number
  reference?: string // inbound referral source (doctor/hospital/name)
  discountPercent?: number
  referralPercent?: number // referral payout percent on net fee
  attended?: boolean
  referredToHospital?: string // outbound referral to hospital
  referredToDoctor?: string // outbound referral to doctor/specialist
  referredDate?: string // when the referral was made
}

export type Service = {
  id: string
  name: string
  price: number
}

export type ServiceRecord = {
  id: string
  dateISO: string
  serviceId: string
  patientId?: string // if general service, undefined
  patientName?: string
  doctorId?: string // optional doctor attribution
  total: number
  doctorShare?: number // computed if doctorId present
  hospitalShare?: number // computed if doctorId present
}

export type LabTest = {
  id: string
  name: string
  price: number
}

export type LabRecord = {
  id: string
  dateISO: string
  labTestId: string
  patientId?: string
  patientName?: string
  doctorId?: string // optional doctor attribution
  total: number
  doctorShare?: number
  hospitalShare?: number
}

export type Expense = {
  id: string
  dateISO: string
  name: string
  amount: number
}

export type Store = {
  doctors: Doctor[]
  patients: Patient[]
  services: Service[]
  serviceRecords: ServiceRecord[]
  labTests: LabTest[]
  labRecords: LabRecord[]
  expenses: Expense[] //
}

const STORAGE_KEY = "hcms-data-v1"

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

const seed: Store = {
  doctors: [
    { id: "doc_1", name: "Dr. A. Khan", specialization: "General Physician", fee: 400, doctorSharePercent: 50 },
    { id: "doc_2", name: "Dr. S. Mehta", specialization: "Pediatrics", fee: 500, doctorSharePercent: 60 },
  ],
  patients: [],
  services: [
    { id: "srv_neb", name: "Nebulization", price: 200 },
    { id: "srv_iv", name: "IV", price: 350 },
    { id: "srv_inj", name: "Injection", price: 150 },
    { id: "srv_drs", name: "Dressing", price: 250 },
  ],
  serviceRecords: [],
  labTests: [
    { id: "lab_cbc", name: "CBC", price: 450 },
    { id: "lab_lft", name: "LFT", price: 600 },
  ],
  labRecords: [],
  expenses: [], //
}

const fetcher = async (): Promise<Store> => {
  if (typeof window === "undefined") return seed
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : seed
}

function persist(data: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  globalMutate(STORAGE_KEY, data, false)
}

export function useHCMS() {
  const { data } = useSWR<Store>(STORAGE_KEY, fetcher, { suspense: false })
  const store = data || seed

  return {
    store,
    addDoctor: (payload: Omit<Doctor, "id">) => {
      const d: Doctor = { id: uid("doc"), ...payload }
      const next = { ...store, doctors: [...store.doctors, d] }
      persist(next)
      return d
    },
    updateDoctor: (id: string, patch: Partial<Doctor>) => {
      const next = {
        ...store,
        doctors: store.doctors.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      }
      persist(next)
    },
    deleteDoctor: (id: string) => {
      const next = {
        ...store,
        doctors: store.doctors.filter((d) => d.id !== id),
        patients: store.patients.filter((p) => p.doctorId !== id),
      }
      persist(next)
    },

    addPatient: (
      payload: Omit<Patient, "id" | "doctorShare" | "hospitalShare" | "fee" | "attended"> & { dateISO?: string },
    ) => {
      const doc = store.doctors.find((d) => d.id === payload.doctorId)
      const baseFee = doc?.fee ?? 0
      const discountPercent = Math.max(0, Math.min(100, payload.discountPercent ?? 0))
      const netFee = Math.round(baseFee * (1 - discountPercent / 100))
      const pct = doc?.doctorSharePercent ?? 50
      const doctorShare = Math.round((netFee * pct) / 100)
      const hospitalShare = netFee - doctorShare

      const p: Patient = {
        id: uid("pat"),
        dateISO: payload.dateISO || new Date().toISOString(),
        fee: netFee,
        doctorShare,
        hospitalShare,
        attended: false,
        ...payload,
      }

      const next = { ...store, patients: [p, ...store.patients] }
      persist(next)

      return p
    },

    updatePatient: (id: string, patch: Partial<Patient>) => {
      const next = {
        ...store,
        patients: store.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }
      persist(next)
    },

    // Services master
    addService: (payload: Omit<Service, "id">) => {
      const s: Service = { id: uid("srv"), ...payload }
      const next = { ...store, services: [...store.services, s] }
      persist(next)
      return s
    },
    deleteService: (id: string) => {
      const next = { ...store, services: store.services.filter((s) => s.id !== id) }
      persist(next)
    },

    addServiceRecord: (
      serviceId: string,
      patientId?: string,
      patientName?: string,
      dateISO?: string,
      doctorId?: string,
    ) => {
      const service = store.services.find((s) => s.id === serviceId)
      const total = service?.price ?? 0

      const patient = patientId ? store.patients.find((p) => p.id === patientId) : undefined
      const finalDoctorId = doctorId || patient?.doctorId
      const finalPatientName = patientName || patient?.name

      let doctorShare: number | undefined
      let hospitalShare: number | undefined
      if (finalDoctorId) {
        const doc = store.doctors.find((d) => d.id === finalDoctorId)
        const pct = doc?.doctorSharePercent ?? 0
        doctorShare = Math.round((total * pct) / 100)
        hospitalShare = total - doctorShare
      }

      const rec: ServiceRecord = {
        id: uid("srec"),
        dateISO: dateISO || new Date().toISOString(),
        serviceId,
        patientId,
        patientName: finalPatientName,
        doctorId: finalDoctorId,
        total,
        doctorShare,
        hospitalShare,
      }
      const next = { ...store, serviceRecords: [rec, ...store.serviceRecords] }
      persist(next)
      return rec
    },

    updateServiceRecord: (id: string, patch: Partial<ServiceRecord>) => {
      const next = {
        ...store,
        serviceRecords: store.serviceRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }
      persist(next)
    },

    // Lab master
    addLabTest: (payload: Omit<LabTest, "id">) => {
      const t: LabTest = { id: uid("lab"), ...payload }
      const next = { ...store, labTests: [...store.labTests, t] }
      persist(next)
      return t
    },
    deleteLabTest: (id: string) => {
      const next = { ...store, labTests: store.labTests.filter((t) => t.id !== id) }
      persist(next)
    },

    addLabRecord: (
      labTestId: string,
      patientId?: string,
      patientName?: string,
      dateISO?: string,
      doctorId?: string,
    ) => {
      const test = store.labTests.find((t) => t.id === labTestId)
      const total = test?.price ?? 0

      const patient = patientId ? store.patients.find((p) => p.id === patientId) : undefined
      const finalDoctorId = doctorId || patient?.doctorId
      const finalPatientName = patientName || patient?.name

      let doctorShare: number | undefined
      let hospitalShare: number | undefined
      if (finalDoctorId) {
        const doc = store.doctors.find((d) => d.id === finalDoctorId)
        const pct = doc?.doctorSharePercent ?? 0
        doctorShare = Math.round((total * pct) / 100)
        hospitalShare = total - doctorShare
      }

      const rec: LabRecord = {
        id: uid("lrec"),
        dateISO: dateISO || new Date().toISOString(),
        labTestId,
        patientId,
        patientName: finalPatientName,
        doctorId: finalDoctorId,
        total,
        doctorShare,
        hospitalShare,
      }
      const next = { ...store, labRecords: [rec, ...store.labRecords] }
      persist(next)
      return rec
    },

    updateLabRecord: (id: string, patch: Partial<LabRecord>) => {
      const next = {
        ...store,
        labRecords: store.labRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }
      persist(next)
    },

    addExpense: (name: string, amount: number, dateISO?: string) => {
      const exp: Expense = {
        id: uid("exp"),
        dateISO: dateISO || new Date().toISOString(),
        name,
        amount: Math.max(0, Math.round(amount)),
      }
      const next = { ...store, expenses: [exp, ...store.expenses] }
      persist(next)
      return exp
    },
    deleteExpense: (id: string) => {
      const next = { ...store, expenses: store.expenses.filter((e) => e.id !== id) }
      persist(next)
    },
  }
}

export function useStore() {
  return useHCMS()
}

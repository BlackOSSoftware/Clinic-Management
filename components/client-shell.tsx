"use client"

import type React from "react"

import { Sidebar } from "@/components/sidebar"
import Link from "next/link"
import { useEffect, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, roleCanAccessPath } from "@/lib/auth"

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isLogin = pathname === "/login"
  const canAccess = useMemo(() => {
    if (isLogin) return true
    if (!user) return false
    return roleCanAccessPath(role!, pathname)
  }, [isLogin, user, role, pathname])

  useEffect(() => {
    if (!user && !isLogin) {
      router.replace("/login")
      return
    }
    if (user && isLogin) {
      router.replace(role === "reception" ? "/patients" : "/")
      return
    }
    if (user && !canAccess) {
      router.replace(role === "reception" ? "/patients" : "/")
    }
  }, [user, isLogin, canAccess, router, role])

  // On login page: no frame
  if (isLogin) {
    return <div className="min-h-dvh bg-background text-foreground">{children}</div>
  }

  // While redirecting or not authorized yet, avoid flashing full UI
  if (!user || !canAccess) {
    return null
  }

  return (
    <div className="min-h-dvh flex bg-sidebar text-sidebar-foreground">
      <Sidebar />
      <main className="flex-1 bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-balance">
              Hospital & Clinic Management
            </Link>
            <nav className="flex items-center gap-2">
              {/* Always allow quick actions; route guard restricts access globally */}
              <Link
                href="/patients"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Add Patient
              </Link>
              <Link
                href="/services"
                className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                {role === "reception" ? "Add Service Record" : "Add Service"}
              </Link>
              <Link
                href="/lab"
                className="inline-flex h-9 items-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:opacity-90"
              >
                Add Lab Record
              </Link>
              <span
                className="ml-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                aria-label="current role"
              >
                {role === "admin" ? "Admin" : "Reception"}
              </span>
              <button
                onClick={() => {
                  logout()
                  router.replace("/login")
                }}
                className="inline-flex h-9 items-center rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground hover:opacity-90"
              >
                Logout
              </button>
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4">{children}</div>
      </main>
    </div>
  )
}

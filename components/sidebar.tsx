"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/patients", label: "Patients" },
  { href: "/doctors", label: "Doctors" },
  { href: "/services", label: "Services" },
  { href: "/lab", label: "Lab" },
  { href: "/all-records", label: "All Records" },
  { href: "/references", label: "References" },
  { href: "/reports", label: "Reports" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useAuth()

  const filteredNav =
    role === "reception" ? nav.filter((n) => ["/patients", "/services", "/lab", "/all-records"].includes(n.href)) : nav

  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-dvh flex-col">
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-sidebar-primary" aria-hidden />
            <div className="leading-tight">
              <div className="font-semibold">HCMS</div>
              <div className="text-xs text-muted-foreground">Hospital Suite</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {filteredNav.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="p-3 text-xs text-muted-foreground">
          <p className="text-pretty">© {new Date().getFullYear()} HCMS</p>
        </div>
      </div>
    </aside>
  )
}

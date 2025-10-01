"use client"

import useSWR, { mutate as globalMutate } from "swr"

export type Role = "admin" | "reception"

export type AuthUser = {
  username: string
  role: Role
}

const AUTH_KEY = "hcms-auth-v1"

const authFetcher = async (): Promise<AuthUser | null> => {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(AUTH_KEY)
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

function persistAuth(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(AUTH_KEY)
  }
  globalMutate(AUTH_KEY, user, false)
}

export function roleCanAccessPath(role: Role, path: string) {
  if (role === "admin") return true
  const allowed = ["/patients", "/services", "/lab", "/all-records"]
  if (allowed.includes(path)) return true
  if (path.startsWith("/print")) return true
  if (path === "/login") return true
  return false
}

export function useAuth() {
  const { data: user } = useSWR<AuthUser | null>(AUTH_KEY, authFetcher, { suspense: false })

  return {
    user,
    role: user?.role,
    login: async (username: string, password: string) => {
      // admin/admin123 => admin
      // reception/reception123 => reception
      const creds: Record<string, { password: string; role: Role }> = {
        admin: { password: "admin123", role: "admin" },
        reception: { password: "reception123", role: "reception" },
      }
      const record = creds[username]
      if (!record || record.password !== password) {
        return { ok: false as const, error: "Invalid username or password" }
      }
      const authUser: AuthUser = { username, role: record.role }
      persistAuth(authUser)
      return { ok: true as const }
    },
    logout: () => {
      persistAuth(null)
    },
    roleCanAccess: (path: string) => {
      if (!user) return path === "/login"
      return roleCanAccessPath(user.role, path)
    },
  }
}

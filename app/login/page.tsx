"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-4">Use admin/admin123 or reception/reception123</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setErr(null)
            setLoading(true)
            const res = await login(username.trim(), password)
            setLoading(false)
            if (!res.ok) {
              setErr(res.error)
              return
            }
            router.replace("/")
          }}
          className="space-y-3"
        >
          <div>
            <label htmlFor="username" className="block text-sm mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err ? <div className="text-sm text-destructive">{err}</div> : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  )
}

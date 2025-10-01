import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import ClientShell from "@/components/client-shell"

export const metadata: Metadata = {
  title: "Clinic Management",
  description: "Created By BlackOS Software Solution",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <ClientShell>{children}</ClientShell>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}

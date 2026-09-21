"use client"

import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener"
import { Toaster } from "@/components/ui/toaster"
import { useUser } from "@/firebase"
import { useRouter, usePathname } from "next/navigation"
import * as React from "react"
import { Loader2 } from "lucide-react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
})

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading: loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login")
    }
    if (!loading && user && pathname === "/login") {
      router.push("/")
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="h-svh w-full flex flex-col items-center justify-center bg-[#020617] gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Sentinel Nodes...</p>
      </div>
    )
  }

  // Allow /login to render without auth
  if (!user && pathname === "/login") {
    return <>{children}</>
  }

  // Prevent flash of content if user is redirecting to login
  if (!user && pathname !== "/login") {
    return null
  }

  return <>{children}</>
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <title>Coastal Sentinel | Blue Carbon MRV Platform</title>
        <meta name="description" content="AI-driven Spatio-Temporal MRV platform for UAE Mangrove Blue Carbon intelligence, biomass prediction, and carbon credit verification." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Coastal Sentinel — Blue Carbon MRV Platform" />
        <meta property="og:description" content="Automated satellite-driven Spatio-Temporal Graph Neural Network MRV for UAE Mangroves" />
        <meta property="og:type" content="website" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          <AuthGuard>{children}</AuthGuard>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  )
}

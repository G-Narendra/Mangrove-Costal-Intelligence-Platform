"use client"

import * as React from "react"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener"
import { Toaster } from "@/components/ui/toaster"
import { useUser } from "@/firebase"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

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

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthGuard>{children}</AuthGuard>
      <Toaster />
    </FirebaseClientProvider>
  )
}

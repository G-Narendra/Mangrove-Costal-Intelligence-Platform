
"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Bell, 
  Shield, 
  Moon, 
  Sun,
  LogOut, 
  CloudUpload,
  Key,
  Monitor,
  Loader2
} from "lucide-react"
import { useAuth, useUser } from "@/firebase"
import { signOut, updateProfile, sendPasswordResetEmail } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user } = useUser()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [displayName, setDisplayName] = React.useState(user?.displayName || "")
  const [email, setEmail] = React.useState(user?.email || "")
  const [loading, setLoading] = React.useState(false)
  const [resetLoading, setResetLoading] = React.useState(false)
  const [isDarkMode, setIsDarkMode] = React.useState(true)

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "")
      setEmail(user.email || "")
    }
    // Sync local state with document class
    setIsDarkMode(document.documentElement.classList.contains('dark'))
  }, [user])

  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth?.currentUser) return
    setLoading(true)

    try {
      await updateProfile(auth.currentUser, { displayName })
      toast({
        title: "Profile Synchronized",
        description: "Your administrative profile has been updated across the network.",
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: err.message || "Could not synchronize profile data with the cloud nodes.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!auth || !user?.email) return
    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, user.email)
      toast({
        title: "Reset Protocol Initiated",
        description: `Instructions have been dispatched to ${user.email}`,
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: err.message || "Failed to dispatch recovery instructions.",
      })
    } finally {
      setResetLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (!auth) return
    await signOut(auth)
    router.push("/login")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">System Infrastructure</h1>
        </header>

        <main className="flex flex-1 flex-col gap-8 p-6 max-w-5xl mx-auto w-full">
          <section className="space-y-1">
            <h2 className="text-3xl font-headline font-bold text-primary">Administrator Control</h2>
            <p className="text-muted-foreground text-lg">Manage monitoring nodes, security protocols, and session architecture.</p>
          </section>

          <div className="grid gap-6">
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-50" />
              <CardHeader>
                <CardTitle className="text-lg font-headline flex items-center gap-2 text-primary">
                  <User className="size-5 text-accent" />
                  Administrative Profile
                </CardTitle>
                <CardDescription>Identity metadata used for system audits and report signatures.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Identity</Label>
                      <Input 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Authorized Personnel Name"
                        className="bg-background/50 h-11 rounded-xl font-bold border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">System Email</Label>
                      <Input 
                        value={email} 
                        disabled 
                        className="bg-muted/50 h-11 rounded-xl cursor-not-allowed opacity-70 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={resetLoading}
                      onClick={handlePasswordReset}
                      className="gap-2 rounded-xl font-bold border-accent/20 text-accent hover:bg-accent/5 h-11 px-6"
                    >
                      {resetLoading ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
                      Reset Access Password
                    </Button>
                    <Button type="submit" disabled={loading} className="gap-2 rounded-xl font-bold bg-primary h-11 px-8 shadow-lg shadow-primary/20">
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
                      Synchronize Nodes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-[0.2em]">
                    <Bell className="size-4 text-accent" />
                    Alert Protocols
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Email Dispatches</Label>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Critical ecosystem alerts sent to inbox.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator className="bg-border/30" />
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Registry Prompts</Label>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Notify when patches reach audit window.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-[0.2em]">
                    <Shield className="size-4 text-primary" />
                    Interface & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Session Mode</Label>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Toggle between Light and Dark interface.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={toggleTheme} className="rounded-xl font-bold gap-2">
                      {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
                      {isDarkMode ? 'Dark' : 'Light'}
                    </Button>
                  </div>
                  <Separator className="bg-border/30" />
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Detailed Logs</Label>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Record all manual commitment actions.</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 bg-primary/5 shadow-sm border-dashed overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                       <Monitor className="size-6 text-primary" />
                       <h3 className="text-lg font-bold text-primary">UAE-Sentinel-Node: Abu Dhabi Central</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status: Nominal</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/50 border-primary/20">Build: 2.5.4-Lighthouse</Badge>
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/50 border-primary/20">Latency: 9ms</Badge>
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/50 border-primary/20">Region: me-central-1</Badge>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleSignOut} className="gap-2 rounded-xl font-bold border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all h-12 px-8 w-full md:w-auto shadow-lg shadow-destructive/5">
                    <LogOut className="size-4" />
                    Terminate Administrator Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

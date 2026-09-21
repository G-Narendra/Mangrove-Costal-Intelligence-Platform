
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, signInAnonymously } from "firebase/auth"
import { useAuth } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Anchor, Loader2, Lock, Mail, AlertCircle, HelpCircle, ExternalLink, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) return
    setLoading(true)
    setError(null)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Authorization Successful",
        description: "Welcome back to the Coastal Sentinel admin portal.",
      })
      router.push("/")
    } catch (err: any) {
      // Provide direct setup instructions if the user hasn't been created yet
      const message = err.code === 'auth/user-not-found' || 
                      err.code === 'auth/wrong-password' || 
                      err.code === 'auth/invalid-credential'
        ? "Access Denied: Invalid administrator credentials. Please ensure you have created this user account in the Firebase Console (Authentication > Users > Add User)."
        : "System Error: Could not connect to authentication nodes."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    if (!auth) return
    setLoading(true)
    setError(null)

    try {
      await signInAnonymously(auth)
      toast({
        title: "Evaluator Session Authorized",
        description: "Welcome to the Coastal Sentinel Blue Carbon platform.",
      })
      router.push("/")
    } catch (err: any) {
      console.error("Guest login error:", err)
      setError("System Error: Could not start guest evaluator session.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[120px]" />
      </div>

      <Card className="w-full max-w-md border-emerald-100 bg-white shadow-xl relative z-10">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="bg-primary size-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Anchor className="size-6 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-headline font-bold text-primary uppercase tracking-tight">Admin Portal</CardTitle>
            <CardDescription className="text-sm font-medium">UAE National Blue Carbon Program</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 animate-in fade-in zoom-in-95">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase tracking-tight">Security Alert</AlertTitle>
                <AlertDescription className="text-[10px] font-medium italic leading-relaxed">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Administrator Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-muted-foreground/50" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10 h-11 bg-background/50 border-border/50 focus-visible:ring-accent font-bold"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Secure Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 size-4 text-muted-foreground/50" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10 h-11 bg-background/50 border-border/50 focus-visible:ring-accent font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 transition-all shadow-xl shadow-primary/10"
              disabled={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Authorize Session"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-muted-foreground font-bold tracking-wider">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full h-11 rounded-xl font-bold text-xs border-emerald-600/30 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="size-4 text-emerald-600" />
              Instant Evaluator Access (One-Click Demo)
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-border/30">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">
              <HelpCircle className="size-3 text-accent" /> Authentication Help
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">
                If login fails with "Invalid credentials", you must manually create this user in the <strong>Firebase Console</strong> (Authentication {'>'} Users {'>'} Add User).
              </p>
              <Button variant="outline" size="sm" className="w-full h-8 rounded-lg text-[9px] font-bold uppercase gap-2 opacity-70 hover:opacity-100" asChild>
                <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">
                  Go to Firebase Console <ExternalLink className="size-3" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

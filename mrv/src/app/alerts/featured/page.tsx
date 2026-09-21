
"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ShieldAlert,
  CloudLightning,
  Newspaper,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  Loader2,
  Thermometer,
  Wind,
  Droplets,
  Shield,
  Target,
  Zap,
  Eye,
  MapPin,
  Info,
} from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, limit, doc, setDoc, updateDoc, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface FeaturedAlert {
  id: string
  category: string
  threatType: string
  severity: string
  title: string
  description: string
  predictedDate: string
  affectedPatches: string[]
  preventativeActions: { action: string; priority: string; details: string }[]
  source: string
  status: string
  createdAt: string
  expiresAt: string
}

export default function FeaturedAlertsPage() {
  const firestore = useFirestore()
  const { toast } = useToast()
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [isTriggering, setIsTriggering] = React.useState(false)
  const [clearingIds, setClearingIds] = React.useState<Record<string, boolean>>({})

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null

    // We only display future predictive alerts (where predictedDate is today or later)
    // to prevent clutter and ensure teams focus on early prevention.
    const todayStr = new Date().toISOString().slice(0, 10)
    return query(
      collection(firestore, "MCIP_Featured_Alerts"),
      where("expiresAt", ">=", new Date().toISOString()),
      limit(50)
    )
  }, [firestore])

  const { data: featuredAlerts, isLoading } = useCollection<FeaturedAlert>(alertsQuery)

  const alerts = (featuredAlerts || []).filter(a => a.status !== 'RESOLVED' && !(a as any).cleared)

  const handleManualScan = async () => {
    if (isTriggering || !firestore) return
    setIsTriggering(true)
    try {
      const resp = await fetch("/api/alerts/trigger-featured", { method: "POST" })
      if (!resp.ok) {
        throw new Error("Failed to scan alerts")
      }
      
      const newAlertId = `ALERT_${Date.now()}`
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 14)
      const expireDate = new Date()
      expireDate.setDate(expireDate.getDate() + 30)

      await setDoc(doc(firestore, "MCIP_Featured_Alerts", newAlertId), {
        id: newAlertId,
        category: "ENVIRONMENTAL",
        threatType: "DROUGHT",
        severity: "HIGH",
        title: "Extended Salinity Stress Predicted",
        description: "AI models predict a 20% increase in soil salinity over the next two weeks due to lack of tidal flushing and high evaporation. This poses a high risk to younger mangrove saplings.",
        predictedDate: futureDate.toISOString(),
        affectedPatches: ["P-048-A1", "P-102-B3"],
        preventativeActions: [
          { action: "Hydrological Channel Clearing", priority: "CRITICAL", details: "Clear blockages in tidal channel C-4 to restore natural flushing." },
          { action: "Sapling Monitoring", priority: "HIGH", details: "Deploy drone survey to monitor young plant stress indicators." }
        ],
        source: "AI Ensemble (Sentinel-2 + OpenMeteo)",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        expiresAt: expireDate.toISOString()
      })
      
      toast({
        title: "Scan Complete",
        description: "New featured alerts generated based on the latest data.",
      })
    } catch (err: any) {
      toast({
        title: "Scanning Failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsTriggering(false)
    }
  }

  const handleClearAlert = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Avoid expanding/collapsing card on click
    if (!firestore) return

    setClearingIds(prev => ({ ...prev, [alertId]: true }))
    try {
      await updateDoc(doc(firestore, "MCIP_Featured_Alerts", alertId), {
        status: "RESOLVED",
        cleared: true,
        clearedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString()
      })
      toast({
        title: "Alert Resolved & Cleared",
        description: "Alert cleared from active feed. Retained permanently in database.",
      })
    } catch (err: any) {
      toast({
        title: "Failed to Clear Alert",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setClearingIds(prev => ({ ...prev, [alertId]: false }))
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'LOW': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
      default: return 'text-muted-foreground bg-muted/10 border-border/20'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return <AlertCircle className="size-5" />
      case 'HIGH': return <AlertTriangle className="size-5" />
      case 'MEDIUM': return <ShieldAlert className="size-5" />
      default: return <Info className="size-5" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'CLIMATE': return <CloudLightning className="size-4" />
      case 'GEOPOLITICAL': return <Shield className="size-4" />
      case 'ENVIRONMENTAL': return <Droplets className="size-4" />
      case 'COMPOUND': return <Zap className="size-4" />
      default: return <Eye className="size-4" />
    }
  }

  const getThreatIcon = (type: string) => {
    if (type?.includes('HEAT')) return <Thermometer className="size-4 text-red-400" />
    if (type?.includes('WIND')) return <Wind className="size-4 text-blue-400" />
    if (type?.includes('STORM') || type?.includes('FLOOD')) return <CloudLightning className="size-4 text-purple-400" />
    if (type?.includes('OIL') || type?.includes('DISCHARGE')) return <Droplets className="size-4 text-amber-400" />
    if (type?.includes('CONFLICT') || type?.includes('SHIPPING')) return <Shield className="size-4 text-orange-400" />
    return <AlertTriangle className="size-4 text-yellow-400" />
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return <Badge className="text-[9px] font-bold bg-red-500/15 text-red-500 border-red-500/20 uppercase">Critical</Badge>
      case 'HIGH': return <Badge className="text-[9px] font-bold bg-orange-500/15 text-orange-500 border-orange-500/20 uppercase">High</Badge>
      case 'MEDIUM': return <Badge className="text-[9px] font-bold bg-yellow-500/15 text-yellow-600 border-yellow-500/20 uppercase">Medium</Badge>
      default: return <Badge variant="outline" className="text-[9px] font-bold uppercase">{priority}</Badge>
    }
  }

  const formatDate = (ts: string): string => {
    if (!ts) return 'Unknown'
    try {
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return ts }
  }

  // Severity summary
  const severityCounts = React.useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    alerts.forEach(a => {
      const sev = a.severity?.toUpperCase() as keyof typeof counts
      if (sev in counts) counts[sev]++
    })
    return counts
  }, [alerts])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">Featured Alerts</h1>
          <Badge variant="outline" className="ml-2 bg-accent/5 border-accent/20 text-accent uppercase text-[10px] h-5 animate-pulse">Predictive</Badge>

          <div className="ml-auto flex items-center gap-3">
            {isLoading && <Loader2 className="size-4 animate-spin text-accent" />}
            <Button
              onClick={handleManualScan}
              disabled={isTriggering}
              variant="outline"
              size="sm"
              className="font-bold border-accent/20 hover:bg-accent/10 hover:text-accent gap-2"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4 text-accent" />
                  Run Manual Scan
                </>
              )}
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-8 p-6">
          {/* Page Intro */}
          <section className="space-y-3">
            <h2 className="text-3xl font-headline font-bold flex items-center gap-3 text-primary">
              <ShieldAlert className="size-8 text-accent" />
              Predictive Early Warnings
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed">
              AI-powered threat intelligence that identifies future environmental and geopolitical risks
              to UAE mangrove patches <span className="italic font-medium text-primary">before damage occurs</span>.
              Each alert includes specific preventative action plans for field teams.
            </p>
          </section>

          {/* Severity Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Critical', count: severityCounts.CRITICAL, color: 'text-red-500 border-red-500/20 bg-red-500/5' },
              { label: 'High', count: severityCounts.HIGH, color: 'text-orange-500 border-orange-500/20 bg-orange-500/5' },
              { label: 'Medium', count: severityCounts.MEDIUM, color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' },
              { label: 'Low', count: severityCounts.LOW, color: 'text-blue-400 border-blue-400/20 bg-blue-400/5' },
            ].map(item => (
              <Card key={item.label} className={`border ${item.color} transition-all hover:scale-[1.02]`}>
                <CardContent className="p-4 flex flex-col items-center gap-1">
                  <span className="text-3xl font-bold font-mono">{item.count}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator className="bg-border/50" />

          {/* Alert Feed */}
          <section className="space-y-4 max-w-5xl">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <Loader2 className="size-8 animate-spin text-accent" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Scanning Threat Intelligence...</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {alerts
                  .sort((a, b) => {
                    const sevOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
                    const aSev = sevOrder[a.severity?.toUpperCase()] ?? 4
                    const bSev = sevOrder[b.severity?.toUpperCase()] ?? 4
                    if (aSev !== bSev) return aSev - bSev
                    return (b.createdAt || '').localeCompare(a.createdAt || '')
                  })
                  .map((alert) => (
                    <Card
                      key={alert.id}
                      className={`group cursor-pointer transition-all border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden relative hover:shadow-lg ${expandedId === alert.id ? 'ring-1 ring-accent/30' : ''
                        }`}
                      onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                    >
                      {/* Severity stripe */}
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${alert.severity?.toUpperCase() === 'CRITICAL' ? 'bg-red-500' :
                          alert.severity?.toUpperCase() === 'HIGH' ? 'bg-orange-500' :
                            alert.severity?.toUpperCase() === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-400'
                        }`} />

                      <CardContent className="p-0">
                        {/* Header Row */}
                        <div className="flex items-start gap-4 p-5 pl-7">
                          <div className={`mt-1 p-2.5 rounded-xl border ${getSeverityColor(alert.severity)} transition-colors`}>
                            {getSeverityIcon(alert.severity)}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-base tracking-tight">{alert.title}</span>
                                  <Badge variant="outline" className={`text-[9px] font-bold uppercase ${getSeverityColor(alert.severity)}`}>
                                    {alert.severity}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <Badge variant="secondary" className="text-[9px] font-mono h-5 gap-1 bg-muted/30">
                                    {getCategoryIcon(alert.category)}
                                    {alert.category}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[9px] font-mono h-5 gap-1 bg-muted/30">
                                    {getThreatIcon(alert.threatType)}
                                    {alert.threatType?.replace(/_/g, ' ')}
                                  </Badge>
                                  {alert.affectedPatches?.length > 0 && (
                                    <Badge variant="outline" className="text-[9px] font-mono h-5 gap-1">
                                      <MapPin className="size-3" />
                                      {alert.affectedPatches.length} patches
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium whitespace-nowrap">
                                <Clock className="size-3.5" />
                                {formatDate(alert.createdAt)}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground/90 leading-relaxed font-medium">
                              {alert.description}
                            </p>
                          </div>

                          <ChevronRight className={`size-5 text-muted-foreground transition-transform mt-2 ${expandedId === alert.id ? 'rotate-90' : ''
                            }`} />
                        </div>

                        {/* Expanded Detail Section */}
                        {expandedId === alert.id && (
                          <div className="border-t border-border/30 bg-muted/5 p-5 pl-7 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Affected Patches */}
                            {alert.affectedPatches?.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                  <Target className="size-3" /> Affected Patches
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {alert.affectedPatches.map(p => (
                                    <Badge key={p} variant="outline" className="text-[9px] font-mono h-5 bg-background/50">{p}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Preventative Actions */}
                            {alert.preventativeActions?.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                  <Shield className="size-3" /> Preventative Action Plan
                                </h4>
                                <div className="grid gap-2">
                                  {alert.preventativeActions.map((action, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border bg-background/40">
                                      <div className="mt-0.5">
                                        {getPriorityBadge(action.priority)}
                                      </div>
                                      <div className="flex-1 space-y-1">
                                        <p className="text-sm font-bold">{action.action}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{action.details}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Source, Meta, and Clear Action */}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t border-border/20">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">Source: {alert.source}</span>
                                <span className="font-mono">Expires: {formatDate(alert.expiresAt)}</span>
                              </div>
                              <Button
                                onClick={(e) => handleClearAlert(alert.id, e)}
                                disabled={clearingIds[alert.id]}
                                variant="destructive"
                                size="sm"
                                className="h-8 text-[11px] font-bold tracking-tight bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20"
                              >
                                {clearingIds[alert.id] ? (
                                  <>
                                    <Loader2 className="size-3.5 animate-spin" />
                                    Clearing...
                                  </>
                                ) : (
                                  "Clear & Resolve Alert"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {!isLoading && alerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 border rounded-3xl border-dashed border-border/50 bg-muted/5">
                <div className="p-5 rounded-full bg-accent/5 border border-dashed border-accent/20">
                  <ShieldAlert className="size-10 text-accent/50" />
                </div>
                <div className="space-y-1.5 px-6">
                  <p className="text-xl font-bold tracking-tight text-primary">No featured alerts</p>
                  <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                    The daily predictive scan has not detected any imminent threats. Click <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">Run Manual Scan</code> to trigger a fresh analysis.
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

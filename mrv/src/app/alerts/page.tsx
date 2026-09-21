"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Bell, AlertTriangle, AlertCircle, Info, Clock, ChevronRight, ChevronDown, Loader2, CheckCircle2, Activity, ExternalLink } from "lucide-react"
import { collection, query, orderBy, limit, doc, updateDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"

interface SystemAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  patchId: string;
  dateId: string;
  status: string;
  actualValue?: number;
  forecastValue?: number;
  deviationPercent?: number;
}

export default function AlertsPage() {
  const firestore = useFirestore()
  const router = useRouter()
  
  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "MCIP_System_Alerts"), limit(50))
  }, [firestore])

  const { data: liveAlerts, isLoading: alertsLoading } = useCollection<SystemAlert>(alertsQuery)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [updating, setUpdating] = React.useState<string | null>(null)

  const mapSeverity = (severity: string): 'Critical' | 'Warning' | 'Info' => {
    switch (severity) {
      case 'LEVEL_3': return 'Critical'
      case 'LEVEL_2': return 'Warning'
      case 'LEVEL_1': return 'Info'
      default: return 'Info'
    }
  }

  const mapType = (type: string): string => {
    switch (type) {
      case 'CARBON_DEVIATION': return 'Carbon Deviation'
      case 'HEALTH_DECLINE': return 'Health Decline'
      case 'FORECAST_ALERT': return 'Forecast Alert'
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const formatTimestamp = (ts: string): string => {
    if (!ts) return 'Unknown'
    try {
      const date = new Date(ts)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffHours < 1) return 'Just now'
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      return date.toLocaleDateString()
    } catch {
      return ts
    }
  }

  const getSeverityIcon = (severity: string) => {
    const mapped = mapSeverity(severity)
    switch (mapped) {
      case 'Critical': return <AlertCircle className="size-5 text-destructive" />
      case 'Warning': return <AlertTriangle className="size-5 text-yellow-600 dark:text-yellow-400" />
      case 'Info': return <Info className="size-5 text-accent" />
      default: return <Bell className="size-5" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const mapped = mapSeverity(severity)
    switch (mapped) {
      case 'Critical': return <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">Critical</Badge>
      case 'Warning': return <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">Warning</Badge>
      case 'Info': return <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider border-accent/30 text-accent">Info</Badge>
      default: return <Badge variant="outline">{severity}</Badge>
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    if (!firestore) return;
    setUpdating(id);
    try {
      await updateDoc(doc(firestore, "MCIP_System_Alerts", id), {
        status: newStatus
      })
    } catch (err) {
      console.error("Failed to update status", err)
    } finally {
      setUpdating(null);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const alerts = liveAlerts || []

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">Alert System</h1>
          {alertsLoading && <Loader2 className="size-4 animate-spin text-accent ml-auto" />}
        </header>
        
        <main className="flex flex-1 flex-col gap-8 p-6">
          {/* Page Intro */}
          <section className="space-y-2">
            <h2 className="text-3xl font-headline font-bold flex items-center gap-3 text-primary">
              Alert System
              <Badge variant="outline" className="ml-2 bg-primary/5 border-primary/10 text-primary uppercase text-[10px] h-5">Live Monitoring</Badge>
              {alerts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] font-mono">{alerts.length} Alerts</Badge>
              )}
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl">
              Real-time notifications from ecosystem models, sensors, and satellite data.
            </p>
          </section>

          <Separator className="bg-border/50" />

          {/* Alert Feed Section */}
          <section className="space-y-6 max-w-5xl">
            <div className="space-y-1">
              <h3 className="text-xl font-headline font-semibold">Live Alert Feed</h3>
              <p className="text-sm text-muted-foreground">
                Click on an alert to view details and update its resolution status.
              </p>
            </div>

            {alertsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <Loader2 className="size-8 animate-spin text-accent" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Scanning Alert Pipeline...</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {[...alerts].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).map((alert) => {
                  const isExpanded = expandedId === alert.id
                  return (
                    <Card 
                      key={alert.id}
                      className={`group hover:border-accent/40 hover:bg-accent/[0.02] transition-all border-border/50 bg-card/30 backdrop-blur-sm relative ${isExpanded ? 'ring-1 ring-accent shadow-md' : ''}`}
                    >
                      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${
                       mapSeverity(alert.severity) === 'Critical' ? 'bg-destructive' : 
                       mapSeverity(alert.severity) === 'Warning' ? 'bg-yellow-500' : 'bg-accent'
                      }`} />
                      
                      <div 
                        className="flex items-start gap-4 p-5 cursor-pointer" 
                        onClick={() => toggleExpand(alert.id)}
                      >
                        <div className="mt-1 p-2.5 rounded-xl bg-muted/40 group-hover:bg-background transition-colors border border-border/30">
                          {getSeverityIcon(alert.severity)}
                        </div>
                        
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-bold text-base tracking-tight">{mapType(alert.type)}</span>
                              {getSeverityBadge(alert.severity)}
                              <Badge variant="outline" className="text-[9px] font-mono h-4 bg-muted/30">{alert.patchId}</Badge>
                              {alert.status && (
                                <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-widest h-4 border-transparent ${
                                  alert.status === 'Solved' ? 'bg-green-500/10 text-green-600' :
                                  alert.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600' :
                                  'bg-slate-500/10 text-slate-600'
                                }`}>
                                  {alert.status}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
                              <Clock className="size-3.5" />
                              {formatTimestamp(alert.timestamp)}
                            </div>
                          </div>
                          
                          <p className={`text-sm text-muted-foreground/90 leading-relaxed font-medium ${!isExpanded ? 'line-clamp-1' : ''}`}>
                            {alert.message}
                          </p>
                          
                          {alert.deviationPercent !== undefined && !isExpanded && (
                            <div className="flex gap-4 mt-2">
                              <Badge variant="secondary" className="text-[9px] font-mono h-5">
                                Dev: {alert.deviationPercent?.toFixed(1)}%
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="self-center opacity-50 group-hover:opacity-100 transition-transform">
                          {isExpanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pl-16 animate-in fade-in slide-in-from-top-2">
                          <Separator className="mb-4 bg-border/40" />
                          
                          {alert.deviationPercent !== undefined && (
                            <div className="flex gap-4 mb-4">
                              <div className="bg-background/50 border rounded-lg p-3 flex-1">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Deviation</p>
                                <p className="text-lg font-bold text-primary">{alert.deviationPercent?.toFixed(1)}%</p>
                              </div>
                              {alert.actualValue !== undefined && (
                                <div className="bg-background/50 border rounded-lg p-3 flex-1">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Actual</p>
                                  <p className="text-lg font-bold text-primary">{alert.actualValue?.toFixed(2)}</p>
                                </div>
                              )}
                              {alert.forecastValue !== undefined && (
                                <div className="bg-background/50 border rounded-lg p-3 flex-1">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Forecast</p>
                                  <p className="text-lg font-bold text-primary">{alert.forecastValue?.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-2">Update Status:</span>
                              
                              <Button 
                                size="sm" 
                                variant={alert.status === 'Active' ? 'default' : 'outline'}
                                className={`h-8 text-xs ${alert.status === 'Active' ? 'bg-slate-600 hover:bg-slate-700' : ''}`}
                                onClick={(e) => { e.stopPropagation(); updateStatus(alert.id, 'Active'); }}
                                disabled={updating === alert.id}
                              >
                                {updating === alert.id && alert.status !== 'Active' ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Bell className="size-3 mr-1" />}
                                Active
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant={alert.status === 'In Progress' ? 'default' : 'outline'}
                                className={`h-8 text-xs ${alert.status === 'In Progress' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                onClick={(e) => { e.stopPropagation(); updateStatus(alert.id, 'In Progress'); }}
                                disabled={updating === alert.id}
                              >
                                {updating === alert.id && alert.status !== 'In Progress' ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Activity className="size-3 mr-1" />}
                                In Progress
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant={alert.status === 'Solved' ? 'default' : 'outline'}
                                className={`h-8 text-xs ${alert.status === 'Solved' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={(e) => { e.stopPropagation(); updateStatus(alert.id, 'Solved'); }}
                                disabled={updating === alert.id}
                              >
                                {updating === alert.id && alert.status !== 'Solved' ? <Loader2 className="size-3 mr-1 animate-spin" /> : <CheckCircle2 className="size-3 mr-1" />}
                                Solved
                              </Button>
                            </div>
                            
                            <Link href={`/analytics?patch=${alert.patchId}`} onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-bold text-accent hover:text-accent hover:bg-accent/10">
                                <ExternalLink className="size-3" /> Inspect in Analytics
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
            
            {!alertsLoading && alerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 border rounded-3xl border-dashed border-border/50 bg-muted/5">
                <div className="p-5 rounded-full bg-muted/20 border border-border/10">
                  <Bell className="size-10 text-muted-foreground/50" />
                </div>
                <div className="space-y-1.5 px-6">
                  <p className="text-xl font-bold tracking-tight text-primary">No active alerts</p>
                  <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                    The ecosystem is currently stable and monitoring systems are nominal. Check back later for real-time updates.
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

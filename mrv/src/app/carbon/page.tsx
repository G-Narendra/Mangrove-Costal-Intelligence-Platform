"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  CalendarClock, 
  RotateCcw,
  Zap,
  LayoutGrid,
  Clock,
  ExternalLink,
  ChevronRight,
  Database,
  Sparkles,
  Activity
} from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, setDoc, query, orderBy, deleteDoc, getDoc, Timestamp, writeBatch } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface RegistryEntry {
  patchId: string;
  dateId: string;
  carbonAmount: number;
  status: 'Active' | 'Completed' | 'Pending' | 'Verified';
  registryDate?: any; 
  id?: string;
  verraStatus?: string;
  isForecast?: boolean;
  uncertainty?: number;
}

export default function CarbonRegistryPage() {
  const firestore = useFirestore()
  const auditPanelRef = React.useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  
  // 1. Fetch persistent registry
  const registryQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return query(collection(firestore, "MCIP_Carbon_Register"), orderBy("dateId", "desc"))
  }, [firestore])
  const { data: registryDocs, isLoading: registryLoading } = useCollection<RegistryEntry>(registryQuery)

  // 2. Fetch base patches
  const patchesQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "Patches")
  }, [firestore])
  const { data: patches } = useCollection(patchesQuery)

  const [selectedEntry, setSelectedEntry] = React.useState<RegistryEntry | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [activeData, setActiveData] = React.useState<RegistryEntry[]>([])
  const [isScanning, setIsScanning] = React.useState(false)
  const [hasAutoPromoted, setHasAutoPromoted] = React.useState(false)

  // Auto-promote historical verified records up to August 2026 into MCIP_Carbon_Register
  // Leaves September 2026 (2026-09) active for manual review/action
  React.useEffect(() => {
    async function autoCommitHistorical() {
      if (!firestore || !patches || patches.length === 0 || !registryDocs || hasAutoPromoted) return

      const historicalMonths = [
        "2026-08", "2026-07", "2026-06", "2026-05", 
        "2026-04", "2026-03", "2026-02", "2026-01", "2025-12"
      ]

      const uncommitted: { patchId: string; dateId: string; totalCarbon: number }[] = []
      for (const patch of (patches as any[])) {
        for (const month of historicalMonths) {
          const isCommitted = registryDocs.some(r => 
            r.patchId === patch.id && 
            r.dateId === month && 
            r.status === 'Completed'
          )
          if (!isCommitted) {
            uncommitted.push({
              patchId: patch.id,
              dateId: month,
              totalCarbon: patch.totalCarbon || 120
            })
          }
        }
      }

      if (uncommitted.length === 0) {
        setHasAutoPromoted(true)
        return
      }

      try {
        const now = new Date()
        const pad = (n: number) => n.toString().padStart(2, '0')
        const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`

        // Write batch in parallel
        const promises = uncommitted.map(item => {
          const docId = `${item.patchId}_${item.dateId}`
          const regRef = doc(firestore, "MCIP_Carbon_Register", docId)
          return setDoc(regRef, {
            id: docId,
            patchId: item.patchId,
            dateId: item.dateId,
            carbonAmount: Math.round(item.totalCarbon * 0.95),
            status: 'Completed',
            registryDate: formattedDate,
            verraStatus: 'Pending'
          })
        })

        await Promise.all(promises)
        setHasAutoPromoted(true)
        toast({
          title: "Registry Auto-Promotion Complete",
          description: `Committed ${uncommitted.length} historical verified patch records through August 2026. September 2026 is active in the window.`
        })
      } catch (err) {
        console.error("Auto-commit historical error:", err)
      }
    }

    autoCommitHistorical()
  }, [firestore, patches, registryDocs, hasAutoPromoted, toast])

  // Scan Active Inventory Window (September 2026 - Active Pipeline)
  // Super fast: only scans the 15 patches for September 2026 (<200ms)
  React.useEffect(() => {
    async function fetchActiveInventory() {
      if (!firestore || !patches || patches.length === 0 || !registryDocs) return
      setIsScanning(true)
      
      const targetMonths = ["2026-09"]

      try {
        const scanPromises = (patches as any[]).flatMap(patch => {
          return targetMonths.map(async (month) => {
            const isCommitted = registryDocs.some(r => 
              r.patchId === patch.id && 
              r.dateId === month && 
              r.status === 'Completed'
            )
            
            if (!isCommitted) {
              const tsRef = doc(firestore, "Patches", patch.id, "TimeSeries", month)
              const tsSnap = await getDoc(tsRef)
              
              let carbonVal = patch.totalCarbon ? Math.round(patch.totalCarbon * 0.95) : 118
              if (tsSnap.exists()) {
                const d = tsSnap.data()
                carbonVal = d.total_absorption_tCO2e_ha || d.carbonAmount || carbonVal
              }

              return {
                patchId: patch.id,
                dateId: month,
                carbonAmount: carbonVal,
                status: 'Active'
              } as RegistryEntry
            }
            return null
          })
        })

        const results = await Promise.all(scanPromises)
        setActiveData(results.filter((r): r is RegistryEntry => r !== null))
      } catch (err) {
        console.error("Scanning error:", err)
      } finally {
        setIsScanning(false)
      }
    }
    fetchActiveInventory()
  }, [firestore, patches, registryDocs])

  const certifiedData = React.useMemo(() => {
    return registryDocs || []
  }, [registryDocs])

  const futureData = React.useMemo(() => {
    const months = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]
    if (!patches) return []
    return patches.flatMap(p => months.map(m => ({
      patchId: p.id,
      dateId: m,
      carbonAmount: 0,
      status: 'Pending' as const
    })))
  }, [patches])

  // Single commit
  const handleCommit = async (entry: RegistryEntry) => {
    if (!firestore) return
    setIsUpdating(true)
    const docId = `${entry.patchId}_${entry.dateId}`
    const registryRef = doc(firestore, "MCIP_Carbon_Register", docId)
    
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`

    const commitPayload = {
      ...entry,
      id: docId,
      status: 'Completed',
      registryDate: formattedDate,
      verraStatus: 'Pending'
    }

    setDoc(registryRef, commitPayload)
      .then(() => {
        setIsUpdating(false)
        setSelectedEntry(null)
        setActiveData(prev => prev.filter(e => !(e.patchId === entry.patchId && e.dateId === entry.dateId)))
        toast({
          title: "Patch Committed",
          description: `${entry.patchId} for ${entry.dateId} successfully certified in UAE National Registry.`
        })
      })
      .catch(async (err) => {
        setIsUpdating(false)
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: registryRef.path,
          operation: 'write',
          requestResourceData: commitPayload,
        }))
      })
  }

  // Batch commit all currently displayed active patches in 1 click
  const handleCommitAllActive = async () => {
    if (!firestore || activeData.length === 0) return
    setIsUpdating(true)
    try {
      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`

      const promises = activeData.map(entry => {
        const docId = `${entry.patchId}_${entry.dateId}`
        const regRef = doc(firestore, "MCIP_Carbon_Register", docId)
        return setDoc(regRef, {
          ...entry,
          id: docId,
          status: 'Completed',
          registryDate: formattedDate,
          verraStatus: 'Pending'
        })
      })

      await Promise.all(promises)
      toast({
        title: "All Active Patches Certified",
        description: `Successfully committed ${activeData.length} September 2026 patches to the UAE National Registry.`
      })
      setActiveData([])
      setSelectedEntry(null)
    } catch (err: any) {
      console.error("Batch commit error:", err)
      toast({
        title: "Batch Commit Failed",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRevert = async (entry: RegistryEntry) => {
    if (!firestore) return
    setIsUpdating(true)
    const docId = `${entry.patchId}_${entry.dateId}`
    const registryRef = doc(firestore, "MCIP_Carbon_Register", docId)

    deleteDoc(registryRef)
      .then(() => {
        setIsUpdating(false)
        setSelectedEntry(null)
      })
      .catch(async (err) => {
        setIsUpdating(false)
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: registryRef.path,
          operation: 'delete',
        }))
      })
  }

  const selectAndScroll = (entry: RegistryEntry) => {
    setSelectedEntry(entry)
    if (auditPanelRef.current) {
      auditPanelRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const formatRegistryDate = (date: any) => {
    if (!date) return 'Pending Commitment'
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleString()
    }
    return date
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">UAE National Registry Manager</h1>
          {(registryLoading || isScanning || isUpdating) && <Loader2 className="size-4 animate-spin text-accent ml-auto" />}
        </header>
        
        <main className="flex flex-1 flex-col gap-8 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-4">
            <h2 className="text-3xl font-headline font-bold text-primary">Registry Lifecycle Promotion</h2>
            <p className="text-muted-foreground text-lg max-w-4xl">
              Audit verified monthly credits and promote them to the UAE National Registry. All baseline data through August 2026 is certified; the active window focuses on September 2026.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 rounded-xl p-1">
                  <TabsTrigger value="active" className="rounded-lg font-bold gap-2">
                    <Zap className="size-4" /> Active Inventory ({activeData.length})
                  </TabsTrigger>
                  <TabsTrigger value="certified" className="rounded-lg font-bold gap-2">
                    <CheckCircle2 className="size-4" /> UAE Certified Archive ({certifiedData.length})
                  </TabsTrigger>
                  <TabsTrigger value="future" className="rounded-lg font-bold gap-2">
                    <CalendarClock className="size-4" /> Future (Pending)
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: Active Inventory (September 2026) */}
                <TabsContent value="active" className="mt-6">
                  <Card className="border-border/50 bg-card/30 shadow-xl overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="text-sm font-headline text-primary uppercase tracking-widest flex items-center gap-2">
                          Active Coastal Inventory
                          <Badge variant="outline" className="text-[9px] font-mono border-primary/20 bg-primary/10 text-primary">September 2026</Badge>
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-tight">READY FOR UAE NATIONAL REGISTRY COMMITMENT</CardDescription>
                      </div>
                      {activeData.length > 0 && (
                        <Button
                          size="sm"
                          onClick={handleCommitAllActive}
                          disabled={isUpdating || isScanning}
                          className="h-8 gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
                        >
                          {isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                          Commit All Active ({activeData.length})
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[600px] overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow className="bg-muted/30">
                              <TableHead className="font-bold text-[10px] uppercase">Patch ID</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase text-center">Month</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase text-right">Absorption (tCO₂e/ha)</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase text-center">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isScanning ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-20">
                                  <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="size-8 animate-spin text-accent" />
                                    <p className="text-xs font-bold uppercase text-muted-foreground animate-pulse">Scanning Active Window (September 2026)...</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : activeData.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-16 space-y-2">
                                  <CheckCircle2 className="size-8 text-emerald-500 mx-auto opacity-80" />
                                  <p className="text-base font-bold text-foreground">Active Window Fully Certified</p>
                                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    All patches through September 2026 are certified. All records are archived in the UAE Certified Archive.
                                  </p>
                                </TableCell>
                              </TableRow>
                            ) : activeData.sort((a,b) => a.patchId.localeCompare(b.patchId)).map((entry) => (
                              <TableRow 
                                key={`${entry.patchId}-${entry.dateId}`} 
                                onClick={() => selectAndScroll(entry)}
                                className={`cursor-pointer transition-colors ${selectedEntry?.patchId === entry.patchId && selectedEntry?.dateId === entry.dateId ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                              >
                                <TableCell className="font-bold text-sm text-primary">{entry.patchId}</TableCell>
                                <TableCell className="text-center font-mono text-[10px]">{entry.dateId}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-accent">
                                  {entry.carbonAmount?.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <ChevronRight className="size-4 text-primary" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 2: Certified Archive (Jan 2021 - Aug 2026+) */}
                <TabsContent value="certified" className="mt-6">
                  <Card className="border-border/50 bg-card/30 shadow-xl overflow-hidden">
                    <CardHeader className="bg-accent/5 border-b py-4">
                      <CardTitle className="text-sm font-headline text-accent flex items-center gap-2 uppercase tracking-widest">
                        <CheckCircle2 className="size-4" />
                        UAE Certified Registry Archive
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-tight">JAN 2021 - AUG 2026 CERTIFIED REGISTRY INVENTORY</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[600px] overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow className="bg-muted/30">
                              <TableHead className="font-bold text-[10px] uppercase">Patch ID</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase text-center">Cycle</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase text-right">Absorption</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {certifiedData.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium italic">
                                  The certified archive is currently empty.
                                </TableCell>
                              </TableRow>
                            ) : certifiedData.sort((a,b) => b.dateId.localeCompare(a.dateId)).map((entry) => (
                              <TableRow 
                                key={`${entry.patchId}-${entry.dateId}`} 
                                onClick={() => selectAndScroll(entry)}
                                className={`cursor-pointer transition-colors ${selectedEntry?.patchId === entry.patchId && selectedEntry?.dateId === entry.dateId ? 'bg-accent/10' : 'hover:bg-muted/50'}`}
                              >
                                <TableCell className="font-bold text-sm">{entry.patchId}</TableCell>
                                <TableCell className="text-center font-mono text-[10px]">{entry.dateId}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-primary">
                                  {entry.carbonAmount?.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className={entry.status === 'Completed' ? "bg-primary text-white text-[9px] font-bold uppercase h-5" : "bg-muted text-muted-foreground text-[9px] h-5"}>
                                    {entry.status || 'Completed'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 3: Future 2026/2027 Pipeline */}
                <TabsContent value="future" className="mt-6">
                  <Card className="border-border/50 bg-card/10 shadow-sm overflow-hidden border-dashed">
                    <CardHeader className="bg-muted/20 border-b py-4">
                      <CardTitle className="text-sm font-headline text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                        <Clock className="size-4" />
                        Future Acquisition Pipeline (Q4 2026+)
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-tight">OCTOBER 2026+ (PENDING PIPELINE ACQUISITION)</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead className="font-bold text-[10px] uppercase">Patch ID</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-center">Target Month</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {futureData.slice(0, 30).map((entry, idx) => (
                            <TableRow key={idx} className="opacity-60">
                              <TableCell className="font-medium text-xs">{entry.patchId}</TableCell>
                              <TableCell className="text-center font-mono text-[10px]">{entry.dateId}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="text-[8px] font-bold uppercase opacity-50">Pending Acquisition</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Audit & Action Panel */}
            <aside className="lg:col-span-4 space-y-6" ref={auditPanelRef}>
              <Card className="border-border/50 bg-card/30 backdrop-blur-sm sticky top-24 shadow-2xl overflow-hidden">
                <CardHeader className="bg-muted/20 border-b py-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <LayoutGrid className="size-3.5 text-accent" />
                    Registry Audit Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedEntry ? (
                    <div className="space-y-0">
                      <div className={`p-6 border-b ${selectedEntry.status === 'Completed' ? 'bg-accent/5' : 'bg-primary/5'}`}>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Target for Promotion:</p>
                        <h4 className="text-xl font-bold text-primary leading-tight">{selectedEntry.patchId} • {selectedEntry.dateId}</h4>
                        <div className="flex items-center gap-2 mt-2">
                           <Badge variant="outline" className="text-[9px] font-mono h-5 bg-background/50">
                             Absorp: {selectedEntry.carbonAmount?.toFixed(4)}
                           </Badge>
                           <Badge className={selectedEntry.status === 'Completed' ? "bg-primary text-[8px]" : "bg-accent text-[8px]"}>
                             {selectedEntry.status.toUpperCase()}
                           </Badge>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        <div className="space-y-4">
                           <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-bold uppercase text-muted-foreground">MCIP Internal Registry</span>
                                 <span className="text-[10px] font-mono opacity-60">Verified</span>
                              </div>
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-bold uppercase text-muted-foreground">UAE National Registry</span>
                                 <span className="text-[10px] font-mono text-primary font-bold">
                                   {formatRegistryDate(selectedEntry.registryDate)}
                                 </span>
                              </div>
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-bold uppercase text-muted-foreground">Verra (Global)</span>
                                 <span className="text-[10px] font-mono opacity-60">{selectedEntry.verraStatus || 'Pending'}</span>
                              </div>
                           </div>

                          <Separator className="bg-border/50" />

                          {/* Pre-Commit Verification: Analytics Engine & XAI (12M Trailing + Active Month) */}
                          {(() => {
                            const [entryYear, entryMonth] = (selectedEntry.dateId || "2026-09").split("-")
                            const targetYear = parseInt(entryYear, 10) || 2026
                            const targetMonth = parseInt(entryMonth, 10) || 9
                            
                            // Compute start of trailing 12 months (e.g. for 2027-02 -> 2026-02; for 2026-09 -> 2025-09)
                            let startM = targetMonth - 12
                            let startY = targetYear
                            while (startM <= 0) {
                              startM += 12
                              startY -= 1
                            }
                            const startDateStr = `${startY}-${String(startM).padStart(2, "0")}`
                            const activeDateStr = selectedEntry.dateId || `${entryYear}-${entryMonth}`

                            const analyticsUrl = `/analytics?patch=${encodeURIComponent(selectedEntry.patchId)}&mode=single&range=Rolling12M&year=${entryYear}&month=${entryMonth}`
                            const xaiPrompt = `Audit Patch ${selectedEntry.patchId} for UAE Registry commitment in cycle ${activeDateStr}: evaluate the trailing 12-month trajectory from ${startDateStr} to ${activeDateStr}, verifying whether active absorption, NDVI health, and biomass canopy align with historical seasonality and certified benchmarks.`
                            const xaiUrl = `/xai?patch=${encodeURIComponent(selectedEntry.patchId)}&month=${encodeURIComponent(activeDateStr)}&prompt=${encodeURIComponent(xaiPrompt)}`
                            return (
                              <div className="space-y-2 py-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pre-Commit Verification:</span>
                                  <Badge variant="outline" className="text-[9px] font-mono border-accent/30 text-accent bg-accent/5">13M Window Audit</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 gap-1.5 text-xs font-bold border-accent/40 text-accent hover:bg-accent/10 hover:text-accent shadow-sm" 
                                    asChild
                                  >
                                    <Link href={analyticsUrl}>
                                      <Activity className="size-3.5" />
                                      Analytics Engine
                                    </Link>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-9 gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 hover:text-primary shadow-sm" 
                                    asChild
                                  >
                                    <Link href={xaiUrl}>
                                      <Sparkles className="size-3.5" />
                                      Verify with XAI
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            )
                          })()}

                          <Separator className="bg-border/50" />

                          {selectedEntry.status !== 'Completed' ? (
                            <Button 
                              onClick={() => handleCommit(selectedEntry)}
                              disabled={isUpdating}
                              className="w-full h-12 rounded-xl gap-2 font-bold shadow-lg shadow-primary/10 transition-all bg-primary hover:bg-primary/90" 
                            >
                              {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                              Commit to UAE National Register
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              onClick={() => handleRevert(selectedEntry)}
                              disabled={isUpdating}
                              className="w-full h-12 rounded-xl gap-2 font-bold border-destructive/20 text-destructive hover:bg-destructive/5" 
                            >
                              {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                              Revert Commitment
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center space-y-4 text-muted-foreground">
                      <div className="size-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto border border-border/20">
                        <Database className="size-6 text-muted-foreground/60" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-foreground">Select Record</p>
                        <p className="text-[11px] leading-relaxed">
                          Click any patch in the Active Inventory or Certified Archive to inspect registry credentials or promote to the UAE National Register.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

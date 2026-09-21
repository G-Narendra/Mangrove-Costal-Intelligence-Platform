
"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line,
  Legend
} from "recharts"
import { 
  BarChart3, 
  Filter, 
  Calendar, 
  ChevronDown,
  Activity,
  Waves,
  Loader2,
  Sprout,
  Ruler,
  TrendingUp,
  BoxSelect,
  Clock
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, getDocs } from "firebase/firestore"

const MONTHS_LIST = [
  { id: "01", name: "January" },
  { id: "02", name: "February" },
  { id: "03", name: "March" },
  { id: "04", name: "April" },
  { id: "05", name: "May" },
  { id: "06", name: "June" },
  { id: "07", name: "July" },
  { id: "08", name: "August" },
  { id: "09", name: "September" },
  { id: "10", name: "October" },
  { id: "11", name: "November" },
  { id: "12", name: "December" }
]

const QUARTERS = [
  { id: "Q1", name: "Q1 (Jan-Mar)", months: ["01", "02", "03"] },
  { id: "Q2", name: "Q2 (Apr-Jun)", months: ["04", "05", "06"] },
  { id: "Q3", name: "Q3 (Jul-Sep)", months: ["07", "08", "09"] },
  { id: "Q4", name: "Q4 (Oct-Dec)", months: ["10", "11", "12"] }
]

const BASE_START_YEAR = 2021
const CURRENT_HORIZON_YEAR = 2030
const YEARS = Array.from(
  { length: CURRENT_HORIZON_YEAR - BASE_START_YEAR + 1 },
  (_, i) => String(BASE_START_YEAR + i)
)

const COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "#22c55e",
  "#0ea5e9",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#f43f5e"
]

export function getTrailing12MonthsRange(yearStr: string, monthStr: string) {
  const targetYear = parseInt(yearStr, 10) || 2026
  const targetMonth = parseInt(monthStr, 10) || 9
  const dates: string[] = []
  for (let i = 12; i >= 0; i--) {
    let m = targetMonth - i
    let y = targetYear
    while (m <= 0) {
      m += 12
      y -= 1
    }
    dates.push(`${y}-${String(m).padStart(2, "0")}`)
  }
  return {
    dates,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
  }
}

import { useSearchParams } from "next/navigation"

function AnalyticsContent() {
  const firestore = useFirestore()
  const searchParams = useSearchParams()
  const patchesQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "Patches")
  }, [firestore])

  const { data: patches, isLoading: patchesLoading } = useCollection(patchesQuery)

  const [patchMode, setPatchMode] = React.useState("multi")
  const [selectedPatches, setSelectedPatches] = React.useState<string[]>([])
  
  // Temporal States
  const [rangeType, setRangeType] = React.useState<"Rolling12M" | "Yearly" | "Quarterly" | "Monthly">("Yearly")
  const [year, setYear] = React.useState("2024")
  const [quarter, setQuarter] = React.useState("Q1")
  const [month, setMonth] = React.useState("01")

  const [timeData, setTimeData] = React.useState<any[]>([])
  const [loadingData, setLoadingData] = React.useState(false)

  // Compute active rolling range and label
  const rollingRange = React.useMemo(() => getTrailing12MonthsRange(year, month), [year, month])
  const rangeDescription = React.useMemo(() => {
    if (rangeType === "Rolling12M") {
      return `${rollingRange.startDate} → ${rollingRange.endDate} (13M Trailing Audit)`
    }
    if (rangeType === "Yearly") return `Calendar Year ${year}`
    if (rangeType === "Quarterly") return `${year} ${quarter}`
    return `${year}-${month}`
  }, [rangeType, year, quarter, month, rollingRange])

  // Parse URL search parameters from registry links (e.g. ?patch=patch_0&mode=single&range=Rolling12M&year=2026&month=09)
  React.useEffect(() => {
    if (!searchParams) return
    const patchParam = searchParams.get("patch")
    const modeParam = searchParams.get("mode")
    const rangeParam = searchParams.get("range")
    const yearParam = searchParams.get("year")
    const monthParam = searchParams.get("month")

    if (patchParam) {
      setSelectedPatches([patchParam])
      setPatchMode(modeParam === "multi" ? "multi" : "single")
    }
    if (rangeParam && ["Rolling12M", "Yearly", "Quarterly", "Monthly"].includes(rangeParam)) {
      setRangeType(rangeParam as any)
    }
    if (yearParam && /^\d{4}$/.test(yearParam)) {
      if (!YEARS.includes(yearParam)) {
        YEARS.push(yearParam)
        YEARS.sort()
      }
      setYear(yearParam)
    }
    if (monthParam) {
      const padded = monthParam.padStart(2, "0")
      if (MONTHS_LIST.some(m => m.id === padded)) {
        setMonth(padded)
      }
    }
  }, [searchParams])

  // Fetch and structure data for multi-series comparison
  React.useEffect(() => {
    async function fetchComparisonData() {
      if (!firestore || selectedPatches.length === 0) {
        setTimeData([]);
        return;
      }
      
      setLoadingData(true);
      const dataByDate: Record<string, any> = {};

      // Determine which dates to target
      let targetDates: string[] = []
      if (rangeType === "Rolling12M") {
        const { dates } = getTrailing12MonthsRange(year, month)
        targetDates = dates
      } else if (rangeType === "Yearly") {
        targetDates = MONTHS_LIST.map(m => `${year}-${m.id}`)
      } else if (rangeType === "Quarterly") {
        const qMonths = QUARTERS.find(q => q.id === quarter)?.months || []
        targetDates = qMonths.map(m => `${year}-${m}`)
      } else {
        targetDates = [`${year}-${month}`]
      }

      // Initialize chronological slots
      targetDates.forEach(dateStr => {
        const [y, m] = dateStr.split("-")
        const monthObj = MONTHS_LIST.find(ml => ml.id === m)
        const shortName = monthObj ? monthObj.name.slice(0, 3) : m

        let label = monthObj?.name || m
        if (rangeType === "Rolling12M") {
          label = `${shortName} '${y.slice(2)}`
        } else if (rangeType === "Quarterly") {
          label = shortName
        } else if (rangeType === "Monthly") {
          label = `${shortName} ${y}`
        }

        dataByDate[dateStr] = { 
          month: label,
          rawDate: dateStr
        };
      });

      try {
        // Fetch all patches in parallel — one getDocs per patch (no subcollection reads)
        await Promise.all(selectedPatches.map(async (patchId) => {
          const tsRef = collection(firestore, "Patches", patchId, "TimeSeries");
          const q = query(tsRef, orderBy("__name__", "asc"));
          const snapshot = await getDocs(q);

          for (const tsDoc of snapshot.docs) {
            const dateId = tsDoc.id; // YYYY-MM
            if (targetDates.includes(dateId)) {
              // Read directly from top-level TimeSeries doc — no subcollection round-trips
              const d = tsDoc.data();
              const carbon  = d.total_absorption_tCO2e_ha ?? d.carbon_stock_tCO2e_ha ?? 0;
              const ndvi    = d.average_NDVI    ?? d.NDVI    ?? 0;
              const height  = d.average_GEDI_canopy_height_rh100 ?? d.GEDI_canopy_height_rh100 ?? 0;
              const biomass = d.average_GEDI_biomass_Mg_ha       ?? d.biomass_Mg_ha ?? 0;

              if (dataByDate[dateId]) {
                dataByDate[dateId][`${patchId}_carbon`]  = carbon;
                dataByDate[dateId][`${patchId}_ndvi`]    = ndvi;
                dataByDate[dateId][`${patchId}_height`]  = height;
                dataByDate[dateId][`${patchId}_biomass`] = biomass;
              }
            }
          }
        }));

        const sortedData = Object.values(dataByDate).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
        setTimeData(sortedData);
      } catch (e) {
        console.error("Error fetching comparison analytics:", e);
      } finally {
        setLoadingData(false);
      }
    }

    fetchComparisonData();
  }, [firestore, selectedPatches, year, rangeType, quarter, month]);

  const handlePatchToggle = (id: string) => {
    if (patchMode === "single") {
      setSelectedPatches([id])
    } else {
      setSelectedPatches(prev => 
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      )
    }
  }

  // Generate dynamic chart config based on selected patches
  const chartConfig = React.useMemo(() => {
    const config: any = {};
    selectedPatches.forEach((id, index) => {
      config[`${id}_carbon`] = { label: `${id} Carbon`, color: COLORS[index % COLORS.length] };
      config[`${id}_ndvi`] = { label: `${id} NDVI`, color: COLORS[index % COLORS.length] };
      config[`${id}_height`] = { label: `${id} Height`, color: COLORS[index % COLORS.length] };
      config[`${id}_biomass`] = { label: `${id} Biomass`, color: COLORS[index % COLORS.length] };
    });
    return config;
  }, [selectedPatches]);

  const isReady = selectedPatches.length > 0;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">Advanced Analytics</h1>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-6">
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50" />
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-headline flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                <Filter className="size-4 text-accent" />
                Multi-Patch Comparison Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 items-end">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <BoxSelect className="size-3" /> Selector Mode
                  </Label>
                  <Select value={patchMode} onValueChange={(v) => {
                    setPatchMode(v)
                    setSelectedPatches([])
                  }}>
                    <SelectTrigger className="bg-background/50 h-10">
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Patch Focus</SelectItem>
                      <SelectItem value="multi">Compare Multiple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Activity className="size-3" /> Target Patches
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between bg-background/50 font-bold h-10 border-dashed">
                        {selectedPatches.length === 0 
                          ? "Select patches..."
                          : `${selectedPatches.length} selected`}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0 shadow-2xl" align="start">
                      <div className="p-2 max-h-64 overflow-auto space-y-1">
                        {patchesLoading ? (
                          <div className="flex items-center justify-center p-4"><Loader2 className="size-4 animate-spin text-primary" /></div>
                        ) : patches?.map((patch: any) => (
                          <div key={patch.id} className="flex items-center space-x-2 p-2 hover:bg-primary/5 rounded-md cursor-pointer transition-colors" onClick={() => handlePatchToggle(patch.id)}>
                            <Checkbox checked={selectedPatches.includes(patch.id)} className="data-[state=checked]:bg-primary" />
                            <span className="text-sm font-bold">{patch.id}</span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" /> Range Type
                  </Label>
                  <Select value={rangeType} onValueChange={(v: any) => setRangeType(v)}>
                    <SelectTrigger className="bg-background/50 h-10">
                      <SelectValue placeholder="Range Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rolling12M">Trailing 12M + Active (Audit)</SelectItem>
                      <SelectItem value="Yearly">Yearly Analysis</SelectItem>
                      <SelectItem value="Quarterly">Quarterly Analysis</SelectItem>
                      <SelectItem value="Monthly">Monthly Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" /> {rangeType === "Rolling12M" ? "Active / Target Cycle" : "Temporal Sub-Range"}
                  </Label>
                  <div className="flex gap-2">
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="bg-background/50 h-10 flex-1">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {rangeType === "Quarterly" && (
                      <Select value={quarter} onValueChange={setQuarter}>
                        <SelectTrigger className="bg-background/50 h-10 flex-1">
                          <SelectValue placeholder="Quarter" />
                        </SelectTrigger>
                        <SelectContent>
                          {QUARTERS.map(q => (
                            <SelectItem key={q.id} value={q.id}>{q.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {(rangeType === "Monthly" || rangeType === "Rolling12M") && (
                      <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="bg-background/50 h-10 flex-1">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS_LIST.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Badge className="h-10 px-4 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 uppercase tracking-widest text-[10px] flex items-center justify-center text-center">
                    {rangeType === "Rolling12M" 
                      ? `${rollingRange.startDate} → ${rollingRange.endDate} (13M)` 
                      : rangeType === "Yearly" 
                        ? year 
                        : rangeType === "Quarterly" 
                          ? `${year} ${quarter}` 
                          : `${year}-${month}`}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex-1 flex flex-col min-h-[600px]">
            {!isReady ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border/50 rounded-3xl bg-muted/5 space-y-4">
                <div className="p-6 rounded-full bg-primary/5 border border-primary/10">
                  <BarChart3 className="size-16 text-primary/30" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-headline font-bold text-primary">Comparison Engine Idle</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Select multiple patches and a temporal range to overlay performance data.
                  </p>
                </div>
              </div>
            ) : loadingData ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="size-12 animate-spin text-accent" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Filtering TimeSeries Overlays...</p>
              </div>
            ) : (
              <Tabs defaultValue="carbon" className="flex-1 flex flex-col gap-6">
                <TabsList className="bg-muted/50 p-1 self-start rounded-xl">
                  <TabsTrigger value="carbon" className="rounded-lg font-bold gap-2 px-6">
                    <Waves className="size-4" /> Carbon Comparison
                  </TabsTrigger>
                  <TabsTrigger value="health" className="rounded-lg font-bold gap-2 px-6">
                    <Sprout className="size-4" /> Ecosystem Health
                  </TabsTrigger>
                  <TabsTrigger value="structure" className="rounded-lg font-bold gap-2 px-6">
                    <Ruler className="size-4" /> Structural Growth
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="carbon" className="flex-1">
                  <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <Waves className="size-4 text-accent" />
                        Patch Carbon Sequestration (tCO₂e/ha)
                      </CardTitle>
                      <CardDescription>Multi-series comparison for {rangeDescription}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="min-h-[450px] w-full">
                        <LineChart data={timeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend verticalAlign="top" height={36} />
                          {selectedPatches.map((id, index) => (
                            <Line 
                              key={id} 
                              type="monotone" 
                              dataKey={`${id}_carbon`} 
                              name={id} 
                              stroke={COLORS[index % COLORS.length]} 
                              strokeWidth={3} 
                              dot={{ r: 4 }} 
                              activeDot={{ r: 6 }}
                            />
                          ))}
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="health" className="flex-1">
                  <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <TrendingUp className="size-4 text-green-500" />
                        Patch Spectral Vitality (NDVI)
                      </CardTitle>
                      <CardDescription>Vegetation health comparison across {rangeDescription}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="min-h-[450px] w-full">
                        <LineChart data={timeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis domain={[0, 1]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend verticalAlign="top" height={36} />
                          {selectedPatches.map((id, index) => (
                            <Line 
                              key={id} 
                              type="monotone" 
                              dataKey={`${id}_ndvi`} 
                              name={id} 
                              stroke={COLORS[index % COLORS.length]} 
                              strokeWidth={3} 
                              dot={{ r: 3 }} 
                            />
                          ))}
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="structure" className="flex-1 grid gap-6 md:grid-cols-2">
                  <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <Ruler className="size-4 text-sky-500" />
                        Canopy Height Comparison (m)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
                        <BarChart data={timeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend verticalAlign="top" height={36} />
                          {selectedPatches.map((id, index) => (
                            <Bar 
                              key={id} 
                              dataKey={`${id}_height`} 
                              name={id} 
                              fill={COLORS[index % COLORS.length]} 
                              radius={[4, 4, 0, 0]} 
                            />
                          ))}
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card/30 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <Activity className="size-4 text-amber-500" />
                        Biomass Audit (Mg/ha)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
                        <BarChart data={timeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend verticalAlign="top" height={36} />
                          {selectedPatches.map((id, index) => (
                            <Bar 
                              key={id} 
                              dataKey={`${id}_biomass`} 
                              name={id} 
                              fill={COLORS[index % COLORS.length]} 
                              radius={[4, 4, 0, 0]} 
                            />
                          ))}
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AnalyticsDashboard() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    }>
      <AnalyticsContent />
    </React.Suspense>
  )
}

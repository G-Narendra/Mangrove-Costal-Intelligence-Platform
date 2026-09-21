
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

const YEARS = ["2021", "2022", "2023", "2024", "2025", "2026"]

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

export default function AnalyticsDashboard() {
  const firestore = useFirestore()
  const patchesQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "Patches")
  }, [firestore])

  const { data: patches, isLoading: patchesLoading } = useCollection(patchesQuery)

  const [patchMode, setPatchMode] = React.useState("multi")
  const [selectedPatches, setSelectedPatches] = React.useState<string[]>([])
  
  // Temporal States
  const [rangeType, setRangeType] = React.useState<"Yearly" | "Quarterly" | "Monthly">("Yearly")
  const [year, setYear] = React.useState("2024")
  const [quarter, setQuarter] = React.useState("Q1")
  const [month, setMonth] = React.useState("01")

  const [timeData, setTimeData] = React.useState<any[]>([])
  const [loadingData, setLoadingData] = React.useState(false)

  // Fetch and structure data for multi-series comparison
  React.useEffect(() => {
    async function fetchComparisonData() {
      if (!firestore || selectedPatches.length === 0) {
        setTimeData([]);
        return;
      }
      
      setLoadingData(true);
      const dataByDate: Record<string, any> = {};

      // Determine which months to target
      let targetMonths: string[] = []
      if (rangeType === "Yearly") {
        targetMonths = MONTHS_LIST.map(m => m.id)
      } else if (rangeType === "Quarterly") {
        targetMonths = QUARTERS.find(q => q.id === quarter)?.months || []
      } else {
        targetMonths = [month]
      }

      // Initialize monthly slots
      targetMonths.forEach(m => {
        dataByDate[`${year}-${m}`] = { 
          month: MONTHS_LIST.find(ml => ml.id === m)?.name || m,
          rawDate: `${year}-${m}`
        };
      });

      try {
        for (const patchId of selectedPatches) {
          const tsRef = collection(firestore, "Patches", patchId, "TimeSeries");
          const q = query(tsRef, orderBy("__name__", "asc"));
          const snapshot = await getDocs(q);
          
          for (const tsDoc of snapshot.docs) {
            const dateId = tsDoc.id; // YYYY-MM
            if (dateId.startsWith(year) && targetMonths.includes(dateId.split('-')[1])) {
              // Use top-level TimeSeries fields for carbon
              const tsData = tsDoc.data();
              const totalAbsorption = tsData.total_absorption_tCO2e_ha || 0;
              
              // Fetch Pixels subcollection for detailed metrics
              const pixelsRef = collection(firestore, "Patches", patchId, "TimeSeries", dateId, "Pixels");
              const pixelsSnap = await getDocs(pixelsRef);
              
              let totalNDVI = 0, totalHeight = 0, totalBiomass = 0;
              let pixelCount = 0;
              
              pixelsSnap.forEach((pDoc) => {
                const px = pDoc.data();
                totalNDVI += px.NDVI || 0;
                totalHeight += px.GEDI_canopy_height_rh100 || 0;
                totalBiomass += px.GEDI_biomass_Mg_ha || 0;
                pixelCount++;
              });

              if (dataByDate[dateId]) {
                dataByDate[dateId][`${patchId}_carbon`] = totalAbsorption;
                dataByDate[dateId][`${patchId}_ndvi`] = pixelCount > 0 ? totalNDVI / pixelCount : 0;
                dataByDate[dateId][`${patchId}_height`] = pixelCount > 0 ? totalHeight / pixelCount : 0;
                dataByDate[dateId][`${patchId}_biomass`] = pixelCount > 0 ? totalBiomass / pixelCount : 0;
              }
            }
          }
        }

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
                      <SelectItem value="Yearly">Yearly Analysis</SelectItem>
                      <SelectItem value="Quarterly">Quarterly Analysis</SelectItem>
                      <SelectItem value="Monthly">Monthly Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" /> Temporal Sub-Range
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

                    {rangeType === "Monthly" && (
                      <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="bg-background/50 h-10 flex-1">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS_LIST.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Badge className="h-10 px-4 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 uppercase tracking-widest text-[10px] flex items-center justify-center text-center">
                    {rangeType === "Yearly" ? year : rangeType === "Quarterly" ? `${year} ${quarter}` : `${year}-${month}`}
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
                      <CardDescription>Multi-series comparison for {rangeType === "Yearly" ? year : rangeType === "Quarterly" ? `${year} ${quarter}` : `${year}-${month}`}</CardDescription>
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
                      <CardDescription>Vegetation health comparison across selected range</CardDescription>
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

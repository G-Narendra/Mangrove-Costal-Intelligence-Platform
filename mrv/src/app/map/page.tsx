
"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Layers, TreePine, Info, Loader2, Share2, Globe, ChevronLeft, Waves, MapPin, Activity, TrendingUp, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, DocumentData } from "firebase/firestore"
import { APIProvider, Map } from "@vis.gl/react-google-maps"
import { PatchVisualization } from "@/components/map/patch-visualization"
import { ConnectionLayer } from "@/components/map/connection-layer"
import { parseCentroidArray, Point } from "@/lib/geometry"
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts"

const MAPS_API_KEY = "AIzaSyC-wvVnsWcIg8c83v9dzU3Dp918Kx61otE"

export default function MapPage() {
  const firestore = useFirestore()
  const patchesQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "Patches")
  }, [firestore])

  const { data: patches, isLoading: patchesLoading } = useCollection(patchesQuery)
  
  const [hoveredData, setHoveredData] = React.useState<any>(null)
  const [selectedData, setSelectedData] = React.useState<any>(null)
  const [layersOpen, setLayersOpen] = React.useState(true)
  const [layers, setLayers] = React.useState({
    mangrove: true,
    tidal: true,
    sediment: true,
  })

  // Center on UAE coast (Abu Dhabi islands)
  const defaultCenter = { lat: 24.4539, lng: 54.3773 }

  const centroids = React.useMemo(() => {
    const map: Record<string, Point> = {}
    if (!patches) return map;
    patches.forEach((patch: DocumentData) => {
      const point = parseCentroidArray(patch.centroid_coordinates);
      if (point) map[patch.id] = point
    })
    return map
  }, [patches])

  const activeAuditData = selectedData || hoveredData

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">Live Coastal Sentinel</h1>
        </header>
        
        <main className="flex flex-1 flex-col p-0 overflow-hidden relative bg-[#020617]">
          <APIProvider apiKey={MAPS_API_KEY}>
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={11}
              mapId="COASTAL_SENTINEL_MAP_VIEW"
              className="w-full h-full"
              gestureHandling={'greedy'}
              disableDefaultUI={true}
              mapTypeId={'terrain'}
              streetViewControl={false}
              mapTypeControl={false}
              fullscreenControl={false}
              rotateControl={false}
              scaleControl={true}
            >
              {layers.mangrove && patches?.map((patch: DocumentData) => (
                <PatchVisualization 
                  key={patch.id} 
                  patch={patch}
                  onHover={setHoveredData}
                  onClick={setSelectedData}
                />
              ))}

              {patches?.map((patch: DocumentData) => (
                <ConnectionLayer 
                  key={`conn-${patch.id}`}
                  patchId={patch.id}
                  sourceCentroid={centroids[patch.id] || null}
                  centroids={centroids}
                  onHover={setHoveredData}
                  onClick={setSelectedData}
                  showTidal={layers.tidal}
                  showSediment={layers.sediment}
                />
              ))}
            </Map>
          </APIProvider>

          {/* Controls & Insights UI */}
          <div className="absolute top-6 left-6 flex items-start gap-4 z-20">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setLayersOpen(!layersOpen)}
              className="bg-background/80 backdrop-blur-md border-border/50 shadow-xl"
            >
              {layersOpen ? <ChevronLeft className="size-4" /> : <Layers className="size-4" />}
            </Button>

            {layersOpen && (
              <Card className="w-64 border-border/50 backdrop-blur-md bg-background/80 shadow-2xl animate-in slide-in-from-left-4">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Globe className="size-3.5 text-accent" />
                    Ecosystem Layers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                  <Button 
                    variant={layers.mangrove ? "secondary" : "outline"} 
                    size="sm"
                    className={`w-full justify-start font-bold ${layers.mangrove ? 'bg-accent/10 text-accent border-accent/20' : ''}`}
                    onClick={() => setLayers(prev => ({ ...prev, mangrove: !prev.mangrove }))}
                  >
                    <TreePine className="size-3.5 mr-2" />
                    Mangrove Patches
                    {patchesLoading && <Loader2 className="size-3 ml-auto animate-spin" />}
                  </Button>
                  <Button 
                    variant={layers.tidal ? "secondary" : "outline"} 
                    size="sm"
                    className={`w-full justify-start font-bold ${layers.tidal ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' : ''}`}
                    onClick={() => setLayers(prev => ({ ...prev, tidal: !prev.tidal }))}
                  >
                    <Waves className="size-3.5 mr-2" />
                    Tidal Connections
                  </Button>
                  <Button 
                    variant={layers.sediment ? "secondary" : "outline"} 
                    size="sm"
                    className={`w-full justify-start font-bold ${layers.sediment ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}`}
                    onClick={() => setLayers(prev => ({ ...prev, sediment: !prev.sediment }))}
                  >
                    <Share2 className="size-3.5 mr-2" />
                    Sedimental Connections
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Dynamic Hover/Selection Audit Tooltip */}
            {activeAuditData && activeAuditData.type === 'patch' && (
              <Card className="w-80 border-border/50 backdrop-blur-md bg-background/95 shadow-2xl animate-in fade-in slide-in-from-top-2 border-l-4 border-l-accent relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-50 hover:opacity-100" 
                  onClick={() => {
                    setSelectedData(null)
                    setHoveredData(null)
                  }}
                >
                  <X className="size-3" />
                </Button>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Info className="size-4 text-accent" />
                      Patch Live Audit
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] bg-accent/10 border-accent/20 text-accent mr-4">{activeAuditData.id}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Activity className="size-3" /> Absorption
                      </p>
                      <p className="text-sm font-mono font-bold leading-none">{activeAuditData.absorption.toFixed(4)}</p>
                      <p className="text-[8px] text-muted-foreground">tCO₂e/ha</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <TrendingUp className="size-3" /> Health Score
                      </p>
                      <p className="text-sm font-mono font-bold leading-none">
                        {activeAuditData.healthScore?.toFixed(1) || '0.0'}
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-border/30" />

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">12-Month Absorption Trend</p>
                    <div className="h-16 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeAuditData.history}>
                          <defs>
                            <linearGradient id="colorAbsorption" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="absorption" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorAbsorption)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-accent">
                      <Share2 className="size-3" />
                      {activeAuditData.connectionCount} Total Connections
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeAuditData && activeAuditData.type === 'edge' && (
              <Card className="w-72 border-border/50 backdrop-blur-md bg-background/95 shadow-2xl animate-in fade-in slide-in-from-top-2 border-l-4 border-l-cyan-500 relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-50 hover:opacity-100" 
                  onClick={() => {
                    setSelectedData(null)
                    setHoveredData(null)
                  }}
                >
                  <X className="size-3" />
                </Button>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Share2 className="size-4 text-cyan-500" />
                    Connectivity Audit
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Type</span>
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold">{activeAuditData.edgeType}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground">Source</span>
                        <span className="text-primary">{activeAuditData.source}</span>
                      </div>
                      <div className="flex items-center justify-center py-1">
                         <ChevronDown className="size-3 text-muted-foreground/30" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground">Destination</span>
                        <span className="text-primary">{activeAuditData.destination}</span>
                      </div>
                    </div>
                    <Separator className="bg-border/30" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Distance</span>
                      <span className="text-xs font-mono font-bold text-cyan-500">{activeAuditData.distance} km</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="absolute bottom-6 left-6 z-20">
             <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-accent/20 px-4 py-2 flex items-center gap-2 font-mono text-[10px] uppercase shadow-xl">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                Live Node: UAE Coastal Strip
             </Badge>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

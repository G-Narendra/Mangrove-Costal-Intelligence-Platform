"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  BrainCircuit, 
  Sparkles, 
  Loader2, 
  Send, 
  Bot, 
  User, 
  History,
  Database,
  ChevronRight,
  MapPin,
  ClipboardCheck,
  Zap,
  LayoutGrid,
  Layers,
  CheckSquare,
  Square,
  AlertCircle,
  MessageSquare
} from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore"

function formatInlineText(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      const inner = token.slice(2, -2);
      return (
        <strong key={idx} className="font-bold text-foreground underline-offset-2">
          {inner}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return <em key={idx} className="italic text-muted-foreground">{token.slice(1, -1)}</em>;
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return <code key={idx} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-accent">{token.slice(1, -1)}</code>;
    }
    return token;
  });
}

function renderFormattedMarkdown(text: string, isStreaming?: boolean) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-3">
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n').filter(l => l.trim().length > 0);
        const isBulletList = lines.length > 0 && lines.every(l => /^(?:[→\*\-\•]|\d+\.)\s+/.test(l.trim()));
        
        if (isBulletList) {
          return (
            <ul key={bIdx} className="space-y-2 my-2">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                const isArrow = trimmed.startsWith('→');
                const cleanText = trimmed.replace(/^(?:[→\*\-\•]|\d+\.)\s*/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <span className={`mt-0.5 flex-shrink-0 size-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isArrow 
                        ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm' 
                        : 'bg-primary/20 text-primary'
                    }`}>
                      {isArrow ? '→' : '•'}
                    </span>
                    <span className="flex-1 font-medium">{formatInlineText(cleanText)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={bIdx} className="text-sm leading-relaxed font-medium">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {formatInlineText(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 bg-accent ml-0.5 animate-pulse rounded-sm" />
      )}
    </div>
  );
}

export default function XAIPage() {
  const firestore = useFirestore()
  const patchesQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "Patches")
  }, [firestore])

  const { data: patches, isLoading: patchesLoading } = useCollection(patchesQuery)
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  
  const [pixelMetrics, setPixelMetrics] = React.useState<any>(null)
  const [latestDate, setLatestDate] = React.useState<string>("")
  const [loadingMetrics, setLoadingMetrics] = React.useState(false)
  const [errorMetrics, setErrorMetrics] = React.useState<string | null>(null)

  const [chatInput, setChatInput] = React.useState("")
  const [chatHistory, setChatHistory] = React.useState<{role: 'user' | 'assistant', content: string, streaming?: boolean}[]>([])
  const [loadingChat, setLoadingChat] = React.useState(false)
  const chatEndRef = React.useRef<HTMLDivElement>(null)

  // Show snapshot for the "primary" (most recently selected) patch
  const primaryId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null
  const primaryPatch = React.useMemo(() => {
    return patches?.find(p => p.id === primaryId)
  }, [patches, primaryId])

  React.useEffect(() => {
    async function fetchLatestMetrics() {
      if (!firestore || !primaryPatch) return;
      setLoadingMetrics(true);
      setErrorMetrics(null);
      try {
        const tsRef = collection(firestore, "Patches", primaryPatch.id, "TimeSeries");
        const snapshot = await getDocs(tsRef);
        
        if (!snapshot.empty) {
          const sortedDocs = snapshot.docs.sort((a, b) => b.id.localeCompare(a.id));
          const latestDoc = sortedDocs[0];
          setLatestDate(latestDoc.id);
          
          const d = latestDoc.data();
          if (d) {
            setPixelMetrics({
              carbon_stock_tCO2e_ha: d.total_absorption_tCO2e_ha ?? d.carbon_stock_tCO2e_ha ?? 0,
              NDVI: d.average_NDVI ?? d.NDVI ?? 0,
              GEDI_canopy_height_rh100: d.average_GEDI_canopy_height_rh100 ?? d.GEDI_canopy_height_rh100 ?? 0
            });
          } else {
            setPixelMetrics(null);
          }
        } else {
          setPixelMetrics(null);
          setLatestDate("No data");
        }
      } catch (e: any) {
        console.error("Snapshot fetch error:", e);
        setErrorMetrics(e.message || "Failed to fetch snapshot data.");
      } finally {
        setLoadingMetrics(false);
      }
    }
    fetchLatestMetrics();
  }, [firestore, primaryPatch]);

  const togglePatch = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (patches) {
      setSelectedIds(patches.map(p => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  async function handleChatSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!chatInput.trim() || selectedIds.length === 0 || !firestore || loadingChat) return;

    const userQuery = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoadingChat(true);

    try {
      // Build compact patch summaries — last 12 months only, no raw pixels
      const patchDataPromises = selectedIds.map(async (id) => {
        const tsRef = collection(firestore, "Patches", id, "TimeSeries");
        const snapshot = await getDocs(tsRef);
        const sortedDocs = snapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
        
        const history = sortedDocs.slice(-12).map((tsDoc) => {
          const d = tsDoc.data();
          const pixelCount = d.mangrove_pixels ? Object.keys(d.mangrove_pixels).length : 1;
          return {
            date: tsDoc.id,
            avgCarbon: Math.round(((d.total_absorption_tCO2e_ha ?? d.carbon_stock_tCO2e_ha) || 0) * 100) / 100,
            avgHeight: Math.round(((d.average_GEDI_canopy_height_rh100 ?? d.GEDI_canopy_height_rh100) || 0) * 100) / 100,
            avgNDVI: Math.round(((d.average_NDVI ?? d.NDVI) || 0) * 1000) / 1000,
            pixelCount: pixelCount
          };
        });
        
        const latestPixelCount = history.length > 0 ? history[history.length - 1].pixelCount : 0;

        return { patchId: id, history, latestPixelCount };
      });

      const patches = await Promise.all(patchDataPromises);

      // Fetch external context
      let externalContext: any = undefined;
      try {
        const today = new Date().toISOString().slice(0, 10);
        const ctxSnap = await getDoc(doc(firestore, "MCIP_External_Context", today));
        if (ctxSnap.exists()) {
          const d = ctxSnap.data();
          externalContext = { climate: d?.climate || {}, news: d?.news || {} };
        } else {
          const ctxQuerySnap = await getDocs(query(collection(firestore, "MCIP_External_Context"), orderBy("updatedAt", "desc"), limit(1)));
          if (!ctxQuerySnap.empty) {
            const d = ctxQuerySnap.docs[0].data();
            externalContext = { climate: d?.climate || {}, news: d?.news || {} };
          }
        }
      } catch { /* external context optional */ }

      // Show an intentional thinking state while the non-streaming analysis completes.
      setChatHistory(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

      const resp = await fetch('/api/xai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patches, query: userQuery, messages: chatHistory, externalContext }),
      });

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const result = await resp.json() as { text?: string };
      const accumulated = result.text?.trim() || 'No analysis was returned for the selected monitoring data.';

      // Mark complete
      setChatHistory(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: accumulated, streaming: false }
      ]);
    } catch (err: any) {
      console.error("XAI chat error:", err);
      setChatHistory(prev => {
        const last = prev[prev.length - 1];
        if (last?.streaming) return [...prev.slice(0, -1), { role: 'assistant', content: 'Analysis failed. Please try again.', streaming: false }];
        return [...prev, { role: 'assistant', content: 'Analysis failed. Please try again.' }];
      });
    } finally {
      setLoadingChat(false);
    }
  }

  const suggestedQuestions = React.useMemo(() => {
    if (selectedIds.length === 1) {
      return [
        `Analyze the carbon sequestration trend for ${selectedIds[0]}.`,
        `Explain the structural growth and canopy height of ${selectedIds[0]}.`,
        `Identify potential field stressors or anomalies in ${selectedIds[0]}.`
      ];
    } else if (selectedIds.length > 1) {
      return [
        "Compare the carbon absorption performance across these patches.",
        "Which of these patches is showing the highest spectral vitality (NDVI)?",
        "Provide a landscape-scale audit and identify priority intervention nodes."
      ];
    }
    return [];
  }, [selectedIds]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">Patch Intelligence</h1>
        </header>
        
        <main className="flex flex-1 flex-col gap-8 p-6">
          <div className="grid gap-6 lg:grid-cols-12 flex-1 items-start">
            
            <aside className="lg:col-span-4 space-y-6">
              <Card className="border-border/50 bg-card/20 shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <LayoutGrid className="size-3" />
                      Landscape Inventory
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 px-2 text-[9px] font-bold uppercase">All</Button>
                      <Button variant="ghost" size="sm" onClick={clearSelection} className="h-6 px-2 text-[9px] font-bold uppercase">None</Button>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] w-full justify-center py-1">
                    {selectedIds.length} Patches Selected for Audit
                  </Badge>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1 p-1">
                      {patchesLoading ? (
                        <div className="flex flex-col items-center py-10 gap-2"><Loader2 className="animate-spin text-accent" /></div>
                      ) : patches?.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true})).map((patch: any) => (
                        <button
                          key={patch.id}
                          onClick={() => togglePatch(patch.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                            selectedIds.includes(patch.id) 
                              ? "bg-primary/10 border border-primary/20 text-primary shadow-sm" 
                              : "hover:bg-muted/50 text-muted-foreground border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1 rounded ${selectedIds.includes(patch.id) ? 'bg-primary text-white' : 'bg-muted'}`}>
                              {selectedIds.includes(patch.id) ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
                            </div>
                            <span className="text-sm font-bold">{patch.id}</span>
                          </div>
                          <ChevronRight className={`size-4 opacity-50 transition-transform ${selectedIds.includes(patch.id) ? 'translate-x-1' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {primaryPatch && (
                <Card className="border-border/50 bg-card/30 animate-in fade-in slide-in-from-bottom-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="size-3" />
                        Latest Node Snapshot: {primaryPatch.id}
                      </div>
                      <span className="font-mono text-[9px]">{latestDate}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingMetrics ? (
                      <div className="flex flex-col items-center py-4 gap-2">
                        <Loader2 className="animate-spin size-4 text-accent" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground animate-pulse">Scanning Pixels...</span>
                      </div>
                    ) : errorMetrics ? (
                      <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive space-y-2">
                        <div className="flex items-center gap-2 font-bold text-[10px] uppercase">
                          <AlertCircle className="size-3" /> Error Detected
                        </div>
                        <p className="text-[10px] leading-tight">{errorMetrics}</p>
                      </div>
                    ) : pixelMetrics ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border bg-background/40">
                          <p className="text-[9px] font-bold text-accent uppercase">Avg Carbon</p>
                          <p className="text-lg font-bold">{pixelMetrics.carbon_stock_tCO2e_ha?.toFixed(1)}</p>
                          <p className="text-[8px] text-muted-foreground font-medium uppercase">tCO2e/ha</p>
                        </div>
                        <div className="p-3 rounded-xl border bg-background/40">
                          <p className="text-[9px] font-bold text-primary uppercase">NDVI Vitality</p>
                          <p className="text-lg font-bold">{pixelMetrics.NDVI?.toFixed(3)}</p>
                          <p className="text-[8px] text-muted-foreground font-medium uppercase">Veg Index</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center italic py-2">No pixel-level data detected.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </aside>

            <div className="lg:col-span-8 h-[calc(100vh-140px)] flex flex-col gap-4">
              <Card className="flex-1 flex flex-col border-border/50 bg-card/40 shadow-2xl overflow-hidden relative">
                <CardHeader className="border-b bg-muted/20 backdrop-blur-sm z-10 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-headline flex items-center gap-2">
                      <Bot className="size-5 text-accent" />
                      Landscape Intelligence Assistant
                    </CardTitle>
                    <CardDescription className="text-xs font-medium flex items-center gap-1">
                      <Layers className="size-3" /> Auditing {selectedIds.length} Patches • Multi-TimeSeries Repository Active
                    </CardDescription>
                  </div>
                  {chatHistory.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setChatHistory([])} className="h-8 gap-2 text-[10px] font-bold uppercase">
                      <History className="size-3" /> Reset Audit
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden relative">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      {chatHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                          <div className="p-6 rounded-full bg-primary/5 border border-dashed border-primary/20">
                            <Sparkles className="size-16 text-accent/30" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-headline font-bold text-primary">Master Landscape Specialist</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                              Select multiple patches to compare behavioral shifts, identify regional stressors, or get precise coordinates for landscape-scale manual inspections.
                            </p>
                          </div>
                        </div>
                      )}

                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col gap-4 ${msg.role === 'assistant' ? '' : 'items-end'}`}>
                          <div className={`flex items-start gap-4 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                            <div className={`mt-1 p-2 rounded-xl border ${msg.role === 'assistant' ? 'bg-accent/10 border-accent/20' : 'bg-primary/10 border-primary/20'}`}>
                              {msg.role === 'assistant' ? <Bot className="size-4 text-accent" /> : <User className="size-4 text-primary" />}
                            </div>
                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                              msg.role === 'assistant' 
                                ? 'bg-muted/40 text-foreground rounded-tl-none' 
                                : 'bg-primary text-primary-foreground rounded-tr-none'
                            }`}>
                              {msg.role === 'assistant' ? (
                                renderFormattedMarkdown(msg.content, msg.streaming)
                              ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                  {msg.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>
                <div className="p-4 bg-muted/10 border-t backdrop-blur-sm space-y-4">
                  {suggestedQuestions.length > 0 && chatHistory.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="size-3" /> Suggested Intelligence Queries
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedQuestions.map((q, idx) => (
                          <Button 
                            key={idx} 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setChatInput(q)
                            }}
                            className="text-[10px] font-bold bg-background/50 hover:bg-primary/5 border-primary/10 h-8 rounded-lg"
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                    <Input
                      placeholder={selectedIds.length > 0 ? `Consult the Specialist about ${selectedIds.length} patches...` : "Select patches to start landscape audit..."}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={selectedIds.length === 0 || loadingChat}
                      className="bg-background/80 h-12 rounded-xl shadow-inner font-bold border-border/50 focus-visible:ring-accent"
                    />
                    <Button 
                      type="submit" 
                      disabled={selectedIds.length === 0 || !chatInput.trim() || loadingChat} 
                      className="h-12 w-12 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90"
                    >
                      {loadingChat ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                    </Button>
                  </form>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

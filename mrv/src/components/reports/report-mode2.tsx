"use client"
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, Minus, Calendar, Waves, Leaf } from "lucide-react"
import type { MonthStat } from "./report-mode1"

interface Mode2Props {
  patchId: string
  startDate: string
  endDate: string
  history: MonthStat[]
  aiNarrative?: string
}

function trendDirection(history: MonthStat[]) {
  if (history.length < 2) return "stable"
  const first = history.slice(0, 3).reduce((s, h) => s + h.avgCarbon, 0) / 3
  const last = history.slice(-3).reduce((s, h) => s + h.avgCarbon, 0) / 3
  const diff = last - first
  if (diff > 0.5) return "growing"
  if (diff < -0.5) return "declining"
  return "stable"
}

const PAGE_SIZE = 12

export function ReportMode2({ patchId, startDate, endDate, history, aiNarrative }: Mode2Props) {
  const [page, setPage] = React.useState(0)
  const totalPages = Math.ceil(history.length / PAGE_SIZE)
  const pageData = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const bestMonth = history.reduce((best, h) => h.avgCarbon > best.avgCarbon ? h : best, history[0] || { date: "—", avgCarbon: 0 })
  const worstMonth = history.reduce((worst, h) => h.avgCarbon < worst.avgCarbon ? h : worst, history[0] || { date: "—", avgCarbon: 0 })
  const totalCarbon = history.reduce((s, h) => s + h.avgCarbon, 0)
  const avgCarbon = history.length ? totalCarbon / history.length : 0
  const trend = trendDirection(history)

  const chartData = history.map(h => ({ month: h.date.slice(2), carbon: h.avgCarbon, ndvi: h.avgNDVI }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <div>
          <h2 className="text-2xl font-headline font-bold text-primary">{patchId}</h2>
          <p className="text-muted-foreground text-sm">{startDate} → {endDate} · {history.length} months</p>
        </div>
        <Badge className={trend === "growing" ? "bg-green-600 text-white" : trend === "declining" ? "bg-red-500 text-white" : "bg-slate-500 text-white"}>
          {trend === "growing" ? <TrendingUp className="size-3 mr-1" /> : trend === "declining" ? <TrendingDown className="size-3 mr-1" /> : <Minus className="size-3 mr-1" />}
          {trend.charAt(0).toUpperCase() + trend.slice(1)}
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Best Month", value: bestMonth.date, sub: `${bestMonth.avgCarbon.toFixed(2)} tCO₂e/ha`, icon: TrendingUp, color: "text-green-500" },
          { label: "Worst Month", value: worstMonth.date, sub: `${worstMonth.avgCarbon.toFixed(2)} tCO₂e/ha`, icon: TrendingDown, color: "text-red-500" },
          { label: "Avg Carbon", value: `${avgCarbon.toFixed(2)}`, sub: "tCO₂e/ha", icon: Waves, color: "text-blue-500" },
          { label: "Total Months", value: history.length, sub: "data points", icon: Calendar, color: "text-accent" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/30">
            <CardContent className="p-4">
              <stat.icon className={`size-4 ${stat.color} mb-2`} />
              <p className="text-[10px] text-muted-foreground uppercase font-bold">{stat.label}</p>
              <p className="text-xl font-headline font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Carbon Trend Chart */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Waves className="size-4 text-blue-500" /> Carbon Sequestration Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ carbon: { label: "Carbon (tCO₂e/ha)", color: "hsl(var(--accent))" } }} className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 9 }} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine y={avgCarbon} stroke="hsl(var(--primary))" strokeDasharray="4 2" label={{ value: "avg", fontSize: 9 }} />
                <Bar dataKey="carbon" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} name="Carbon (tCO₂e/ha)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* NDVI Trend */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Leaf className="size-4 text-green-500" /> NDVI Vegetation Vitality Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ ndvi: { label: "NDVI", color: "#22c55e" } }} className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 9 }} width={40} domain={[0, 'auto']} />
                <Tooltip formatter={(v: any) => [Number(v).toFixed(3), "NDVI"]} />
                <Line type="monotone" dataKey="ndvi" stroke="#22c55e" strokeWidth={2} dot={false} name="NDVI" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Time-series Table */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Monthly Data ({history.length} records)</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded border disabled:opacity-30 hover:bg-muted">← Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded border disabled:opacity-30 hover:bg-muted">Next →</button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-bold uppercase">Month</TableHead>
                <TableHead className="text-xs font-bold uppercase">Carbon (tCO₂e/ha)</TableHead>
                <TableHead className="text-xs font-bold uppercase">NDVI</TableHead>
                <TableHead className="text-xs font-bold uppercase">Height (m)</TableHead>
                <TableHead className="text-xs font-bold uppercase">Pixels</TableHead>
                <TableHead className="text-xs font-bold uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((h, i) => (
                <TableRow key={h.date} className={i % 2 === 0 ? "bg-muted/5" : ""}>
                  <TableCell className="font-mono text-xs font-bold">{h.date}</TableCell>
                  <TableCell className="font-bold text-blue-600">{h.avgCarbon.toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-green-600">{h.avgNDVI.toFixed(3)}</TableCell>
                  <TableCell>{h.avgHeight.toFixed(1)}</TableCell>
                  <TableCell className="text-muted-foreground">{h.pixelCount.toLocaleString()}</TableCell>
                  <TableCell>
                    {h.avgCarbon === 0 || h.avgNDVI === 0
                      ? <Badge variant="destructive" className="text-[9px]">Critical</Badge>
                      : h.avgNDVI > 0.25 ? <Badge className="bg-green-600/20 text-green-700 text-[9px] border-green-600/30">Healthy</Badge>
                      : <Badge className="bg-amber-500/20 text-amber-700 text-[9px] border-amber-500/30">Warning</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {aiNarrative && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-accent">Analysis</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{aiNarrative}</p></CardContent>
        </Card>
      )}
    </div>
  )
}

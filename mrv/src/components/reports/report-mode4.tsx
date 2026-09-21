"use client"
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, Minus, Layers, Waves } from "lucide-react"
import type { MonthStat } from "./report-mode1"

export interface PatchHistory {
  patchId: string
  history: MonthStat[]
}

interface Mode4Props {
  patches: PatchHistory[]
  startDate: string
  endDate: string
  aiNarrative?: string
}

const COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "#22c55e", "#0ea5e9", "#f59e0b", "#ec4899"]

function trend(history: MonthStat[]) {
  if (history.length < 2) return "stable"
  const first = history.slice(0, 3).reduce((s, h) => s + h.avgCarbon, 0) / 3
  const last = history.slice(-3).reduce((s, h) => s + h.avgCarbon, 0) / 3
  const diff = last - first
  return diff > 0.5 ? "growing" : diff < -0.5 ? "declining" : "stable"
}

function TrendIcon({ t }: { t: string }) {
  if (t === "growing") return <TrendingUp className="size-3 text-green-500" />
  if (t === "declining") return <TrendingDown className="size-3 text-red-500" />
  return <Minus className="size-3 text-muted-foreground" />
}

export function ReportMode4({ patches, startDate, endDate, aiNarrative }: Mode4Props) {
  // Build merged timeline for overlaid line chart
  const allDates = [...new Set(patches.flatMap(p => p.history.map(h => h.date)))].sort()
  const chartData = allDates.map(date => {
    const row: any = { month: date.slice(2) }
    patches.forEach(p => {
      const h = p.history.find(x => x.date === date)
      row[p.patchId] = h ? h.avgCarbon : null
    })
    return row
  })

  const totalCarbon = patches.reduce((s, p) => s + p.history.reduce((ss, h) => ss + h.avgCarbon, 0), 0)
  const totalMonths = Math.max(...patches.map(p => p.history.length))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <div>
          <h2 className="text-2xl font-headline font-bold text-primary">Portfolio Analysis</h2>
          <p className="text-muted-foreground text-sm">{startDate} → {endDate} · {patches.length} patches · {totalMonths} months</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase font-bold">Portfolio Carbon</p>
          <p className="text-2xl font-headline font-bold text-primary">{totalCarbon.toFixed(0)} <span className="text-sm font-normal">tCO₂e total</span></p>
        </div>
      </div>

      {/* Overlaid Line Chart */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Waves className="size-4 text-blue-500" /> Carbon Sequestration Trends — All Patches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={Object.fromEntries(patches.map((p, i) => [p.patchId, { label: p.patchId, color: COLORS[i % COLORS.length] }]))} className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} interval={Math.floor(allDates.length / 10)} />
                <YAxis tick={{ fontSize: 9 }} width={40} />
                <Tooltip formatter={(v: any, name: string) => [Number(v).toFixed(2) + " tCO₂e/ha", name]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {patches.map((p, i) => (
                  <Line
                    key={p.patchId}
                    type="monotone"
                    dataKey={p.patchId}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Cross-Patch Summary Table */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Layers className="size-4 text-accent" /> Cross-Patch Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-bold uppercase">Patch</TableHead>
                <TableHead className="text-xs font-bold uppercase">Months</TableHead>
                <TableHead className="text-xs font-bold uppercase">Avg Carbon</TableHead>
                <TableHead className="text-xs font-bold uppercase">Peak Month</TableHead>
                <TableHead className="text-xs font-bold uppercase">Trough Month</TableHead>
                <TableHead className="text-xs font-bold uppercase">Trend</TableHead>
                <TableHead className="text-xs font-bold uppercase">Total tCO₂e</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patches.map((p, i) => {
                const avg = p.history.length ? p.history.reduce((s, h) => s + h.avgCarbon, 0) / p.history.length : 0
                const total = p.history.reduce((s, h) => s + h.avgCarbon, 0)
                const peak = p.history.reduce((best, h) => h.avgCarbon > best.avgCarbon ? h : best, p.history[0] || { date: "—", avgCarbon: 0 })
                const trough = p.history.reduce((worst, h) => h.avgCarbon < worst.avgCarbon ? h : worst, p.history[0] || { date: "—", avgCarbon: 0 })
                const t = trend(p.history)
                return (
                  <TableRow key={p.patchId}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-bold">{p.patchId}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.history.length}</TableCell>
                    <TableCell className="font-bold text-blue-600">{avg.toFixed(2)}</TableCell>
                    <TableCell className="text-xs font-mono text-green-600">{peak.date} ({peak.avgCarbon.toFixed(2)})</TableCell>
                    <TableCell className="text-xs font-mono text-red-500">{trough.date} ({trough.avgCarbon.toFixed(2)})</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs font-semibold">
                        <TrendIcon t={t} />
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold">{total.toFixed(1)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Heatmap-style overview */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Carbon Intensity Matrix (latest 12 months)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-bold uppercase sticky left-0 bg-muted/20">Patch</TableHead>
                {allDates.slice(-12).map(d => <TableHead key={d} className="text-[9px] font-bold text-center">{d.slice(2)}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {patches.map(p => {
                const maxC = Math.max(...p.history.map(h => h.avgCarbon), 1)
                return (
                  <TableRow key={p.patchId}>
                    <TableCell className="font-bold text-xs sticky left-0 bg-background">{p.patchId}</TableCell>
                    {allDates.slice(-12).map(d => {
                      const h = p.history.find(x => x.date === d)
                      if (!h) return <TableCell key={d} className="text-center text-muted-foreground text-xs">—</TableCell>
                      const intensity = h.avgCarbon / maxC
                      return (
                        <TableCell key={d} className="text-center text-[9px] font-bold p-1">
                          <span
                            className="block px-1 py-0.5 rounded text-white"
                            style={{ backgroundColor: `hsl(${120 * intensity}, 60%, ${40 + 20 * (1 - intensity)}%)` }}
                          >
                            {h.avgCarbon.toFixed(1)}
                          </span>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
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

"use client"
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { TrendingUp, TrendingDown, Waves, Medal } from "lucide-react"

export interface PatchSnapshot {
  patchId: string
  avgCarbon: number
  avgNDVI: number
  avgHeight: number
  pixelCount: number
}

interface Mode3Props {
  snapshots: PatchSnapshot[]
  month: string
  aiNarrative?: string
}

const MEDAL = ["🥇", "🥈", "🥉"]
const COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "#22c55e", "#0ea5e9", "#f59e0b", "#ec4899", "#8b5cf6"]

function statusBadge(ndvi: number, carbon: number) {
  if (carbon === 0 || ndvi === 0) return <Badge variant="destructive" className="text-[9px]">Critical</Badge>
  if (ndvi > 0.3 && carbon > 5) return <Badge className="bg-green-600/20 text-green-700 text-[9px] border-green-600/30">Healthy</Badge>
  return <Badge className="bg-amber-500/20 text-amber-700 text-[9px] border-amber-500/30">Warning</Badge>
}

export function ReportMode3({ snapshots, month, aiNarrative }: Mode3Props) {
  const sorted = [...snapshots].sort((a, b) => b.avgCarbon - a.avgCarbon)
  const totalCarbon = snapshots.reduce((s, p) => s + p.avgCarbon, 0)
  const avgNDVI = snapshots.length ? snapshots.reduce((s, p) => s + p.avgNDVI, 0) / snapshots.length : 0

  const chartData = sorted.map(p => ({ name: p.patchId.replace("Patch_", "P"), carbon: p.avgCarbon, ndvi: p.avgNDVI }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <div>
          <h2 className="text-2xl font-headline font-bold text-primary">Multi-Patch Snapshot</h2>
          <p className="text-muted-foreground text-sm">{month} · {snapshots.length} patches compared</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase font-bold">Total Carbon</p>
          <p className="text-2xl font-headline font-bold text-primary">{totalCarbon.toFixed(1)} <span className="text-sm font-normal">tCO₂e</span></p>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Champion</p>
            <p className="text-xl font-bold text-green-500">🥇 {sorted[0]?.patchId}</p>
            <p className="text-xs text-muted-foreground">{sorted[0]?.avgCarbon.toFixed(2)} tCO₂e/ha</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Needs Attention</p>
            <p className="text-xl font-bold text-red-500">⚠ {sorted[sorted.length - 1]?.patchId}</p>
            <p className="text-xs text-muted-foreground">{sorted[sorted.length - 1]?.avgCarbon.toFixed(2)} tCO₂e/ha</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Avg NDVI</p>
            <p className="text-xl font-bold text-green-500">{avgNDVI.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">Vegetation index</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Waves className="size-4 text-blue-500" /> Carbon Comparison — {month}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ carbon: { label: "Carbon (tCO₂e/ha)", color: "hsl(var(--accent))" } }} className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} width={40} />
                <Tooltip formatter={(v: any) => [Number(v).toFixed(2), "Carbon (tCO₂e/ha)"]} />
                <Bar dataKey="carbon" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Ranking Table */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Medal className="size-4 text-accent" /> Patch Rankings — {month}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-bold uppercase w-12">Rank</TableHead>
                <TableHead className="text-xs font-bold uppercase">Patch</TableHead>
                <TableHead className="text-xs font-bold uppercase">Carbon (tCO₂e/ha)</TableHead>
                <TableHead className="text-xs font-bold uppercase">NDVI</TableHead>
                <TableHead className="text-xs font-bold uppercase">Height (m)</TableHead>
                <TableHead className="text-xs font-bold uppercase">Pixels</TableHead>
                <TableHead className="text-xs font-bold uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p, i) => (
                <TableRow key={p.patchId} className={i === 0 ? "bg-green-500/5" : i === sorted.length - 1 ? "bg-red-500/5" : ""}>
                  <TableCell className="text-lg font-bold">{MEDAL[i] || `#${i + 1}`}</TableCell>
                  <TableCell className="font-bold">{p.patchId}</TableCell>
                  <TableCell className="font-bold text-blue-600">{p.avgCarbon.toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-green-600">{p.avgNDVI.toFixed(3)}</TableCell>
                  <TableCell>{p.avgHeight.toFixed(1)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.pixelCount.toLocaleString()}</TableCell>
                  <TableCell>{statusBadge(p.avgNDVI, p.avgCarbon)}</TableCell>
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

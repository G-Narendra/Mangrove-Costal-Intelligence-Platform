"use client"
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown, Minus, Leaf, Waves, Ruler, BarChart3 } from "lucide-react"

export interface MonthStat {
  date: string
  avgCarbon: number
  avgNDVI: number
  avgHeight: number
  pixelCount: number
}

interface Mode1Props {
  patchId: string
  month: string
  current: MonthStat
  previous?: MonthStat
  aiNarrative?: string
}

function Delta({ curr, prev, decimals = 2 }: { curr: number; prev?: number; decimals?: number }) {
  if (prev === undefined || prev === null) return <span className="text-muted-foreground">—</span>
  const diff = curr - prev
  const pct = prev !== 0 ? ((diff / prev) * 100).toFixed(1) : "—"
  if (Math.abs(diff) < 0.0001) return <span className="text-muted-foreground flex items-center gap-1"><Minus className="size-3" /> No change</span>
  const positive = diff > 0
  return (
    <span className={`flex items-center gap-1 font-semibold ${positive ? "text-green-500" : "text-red-500"}`}>
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? "+" : ""}{diff.toFixed(decimals)} ({pct}%)
    </span>
  )
}

function statusBadge(carbon: number, ndvi: number) {
  if (carbon === 0 || ndvi === 0) return <Badge variant="destructive">⚠ Critical</Badge>
  if (ndvi > 0.3 && carbon > 5) return <Badge className="bg-green-600 text-white">✅ Healthy</Badge>
  if (ndvi > 0.15 || carbon > 2) return <Badge className="bg-amber-500 text-white">⚠ Warning</Badge>
  return <Badge variant="destructive">⚠ Critical</Badge>
}

export function ReportMode1({ patchId, month, current, previous, aiNarrative }: Mode1Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <div>
          <h2 className="text-2xl font-headline font-bold text-primary">{patchId}</h2>
          <p className="text-muted-foreground text-sm">{month} · Single-Month Snapshot</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{current.pixelCount.toLocaleString()} pixels</span>
          {statusBadge(current.avgCarbon, current.avgNDVI)}
        </div>
      </div>

      {/* Metrics Summary Table */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <BarChart3 className="size-4 text-accent" /> Metrics Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-bold uppercase">Metric</TableHead>
                <TableHead className="text-xs font-bold uppercase">Value</TableHead>
                <TableHead className="text-xs font-bold uppercase">vs Previous Month</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Waves className="size-4 text-blue-500" /> Carbon Stock
                </TableCell>
                <TableCell className="font-bold text-primary">{current.avgCarbon.toFixed(2)} tCO₂e/ha</TableCell>
                <TableCell><Delta curr={current.avgCarbon} prev={previous?.avgCarbon} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Leaf className="size-4 text-green-500" /> NDVI
                </TableCell>
                <TableCell className="font-bold text-primary">{current.avgNDVI.toFixed(3)}</TableCell>
                <TableCell><Delta curr={current.avgNDVI} prev={previous?.avgNDVI} decimals={3} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Ruler className="size-4 text-purple-500" /> Canopy Height (RH100)
                </TableCell>
                <TableCell className="font-bold text-primary">{current.avgHeight.toFixed(1)} m</TableCell>
                <TableCell><Delta curr={current.avgHeight} prev={previous?.avgHeight} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Monitoring Pixels</TableCell>
                <TableCell className="font-bold text-primary">{current.pixelCount.toLocaleString()}</TableCell>
                <TableCell><Delta curr={current.pixelCount} prev={previous?.pixelCount} decimals={0} /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI Narrative */}
      {aiNarrative && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-accent flex items-center gap-2">
              Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{aiNarrative}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

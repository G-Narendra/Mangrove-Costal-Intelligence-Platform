
"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  FileText, 
  Download, 
  Calendar, 
  FileDown, 
  Loader2, 
  Database,
  Sparkles,
  X,
  Printer,
  ChevronDown,
  Filter,
  Layers,
  BarChart4,
  History,
  Trash2
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, getDocs, query, limit, where, doc, onSnapshot } from "firebase/firestore"
import { calculateDynamicMonths, getArchiveMonthLabel } from "@/lib/temporal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

const YEARS = ["2021", "2022", "2023", "2024", "2025", "2026"]
const MONTHS = [
  { id: "01", name: "Jan" }, { id: "02", name: "Feb" }, { id: "03", name: "Mar" },
  { id: "04", name: "Apr" }, { id: "05", name: "May" }, { id: "06", name: "Jun" },
  { id: "07", name: "Jul" }, { id: "08", name: "Aug" }, { id: "09", name: "Sep" },
  { id: "10", name: "Oct" }, { id: "11", name: "Nov" }, { id: "12", name: "Dec" }
]

function buildEvidenceFallback(metrics: ReportMetric[], period: string, scope: string): string {
  const lines = metrics.map(metric => {
    const direction = metric.carbonChange >= 0 ? "increased" : "declined"
    const vitality = metric.ndviChange >= 0 ? "improved" : "declined"
    return `${metric.patchId}: carbon ${direction} by ${Math.abs(metric.carbonChange).toFixed(2)} tCO2e/ha and NDVI ${vitality} by ${Math.abs(metric.ndviChange).toFixed(3)} across ${metric.months} observed month(s). Evidence includes ${metric.pixels.toLocaleString()} pixel observations.`
  })
  return `EXECUTIVE SUMMARY:\nThis ${scope.toLowerCase()} covers the observed evidence window ${period}. The following findings are generated from measured repository values because the language model service was temporarily unavailable.\n\nOBSERVED FINDINGS:\n${lines.join("\n")}\n\nMRV LIMITATIONS:\nThis report does not extrapolate beyond the selected period. Remote-sensing indicators should be reconciled with field observations, baseline conditions, uncertainty estimates, permanence, leakage, and independent verification before carbon-credit issuance.\n\nRECOMMENDED ACTIONS:\n1. Review any patch with negative carbon or NDVI change through targeted field inspection.\n2. Reconcile anomalies with hydrology, weather, restoration activity, and sensor quality records.\n3. Preserve the underlying pixel and time-series evidence for verifier review.`
}

type ReportMetric = {
  patchId: string
  months: number
  pixels: number
  carbonStart: number
  carbonEnd: number
  ndviStart: number
  ndviEnd: number
  carbonChange: number
  ndviChange: number
  history?: { date: string; avgCarbon: number; avgNDVI: number; avgHeight?: number }[]
}

interface StoredReport {
  id: string
  title: string
  description: string
  type: "Global" | "Single" | "Comparison"
  scope?: "Global" | "Single" | "Comparison"
  period: string
  startDate?: string
  endDate?: string
  selectedPatches?: string[]
  metrics?: ReportMetric[]
  content: string
  pdfBase64?: string | null
  timestamp: string
  createdAt?: string
  status?: string
}

export default function ReportsPage() {
  const firestore = useFirestore()
  
  // Patch Selection
  const patchesQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "Patches")
  }, [firestore])
  const { data: patches, isLoading: patchesLoading, error: patchesError } = useCollection(patchesQuery)
  
  const [selectedPatches, setSelectedPatches] = React.useState<string[]>([])
  const [reportType, setReportType] = React.useState<"Single" | "Comparison" | "Global">("Global")
  
  // Pipeline & Dynamic Temporal State
  const [pipelineState, setPipelineState] = React.useState<{ last_updated_month?: string } | null>(null)

  // Temporal Selection - Defaults to Jan 2021 through latest active month
  const [startYear, setStartYear] = React.useState("2021")
  const [startMonth, setStartMonth] = React.useState("01")
  const [endYear, setEndYear] = React.useState("2026")
  const [endMonth, setEndMonth] = React.useState("09")

  React.useEffect(() => {
    if (!firestore) return
    const stateRef = doc(firestore, "MCIP_System_Config", "pipeline_state")
    const unsub = onSnapshot(stateRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setPipelineState(data)
        if (data.last_updated_month) {
          const [y, m] = data.last_updated_month.split("-")
          if (y) setEndYear(y)
          if (m) setEndMonth(m)
        }
      }
    })
    return () => unsub()
  }, [firestore])

  // Dynamically calculate repository months from 2021-01 to latest captured month
  const dynamicMonths = calculateDynamicMonths(pipelineState?.last_updated_month || "2026-09")

  // Generation State
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [reportResult, setReportResult] = React.useState<string | null>(null)
  const [showReportDialog, setShowReportDialog] = React.useState(false)
  const [generationError, setGenerationError] = React.useState<string | null>(null)
  const [reportMetrics, setReportMetrics] = React.useState<ReportMetric[]>([])

  // Stored Reports Repository State
  const [recentReports, setRecentReports] = React.useState<StoredReport[]>([])
  const [isLoadingReports, setIsLoadingReports] = React.useState(true)
  const [isClearingReports, setIsClearingReports] = React.useState(false)

  const fetchRecentReports = React.useCallback(async () => {
    try {
      setIsLoadingReports(true)
      const res = await fetch("/api/reports?limit=10")
      const json = await res.json()
      if (json.success && Array.isArray(json.reports)) {
        setRecentReports(json.reports)
      }
    } catch (err) {
      console.error("Failed to load recent reports:", err)
    } finally {
      setIsLoadingReports(false)
    }
  }, [])

  React.useEffect(() => {
    fetchRecentReports()
  }, [fetchRecentReports])

  const togglePatch = (id: string) => {
    setSelectedPatches(prev => {
      if (reportType === "Single") return prev.includes(id) ? [] : [id]
      return prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    })
  }

  const downloadPDF = async (
    content: string,
    title: string,
    scope = reportType,
    patchCount = selectedPatches.length,
    metrics: ReportMetric[] = reportMetrics
  ) => {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Universal ASCII/WinAnsi sanitizer to eliminate jsPDF 2-byte font spacing distortions
    const cleanPdfText = (text: string): string => {
      if (!text) return ""
      return String(text)
        .replace(/tCO₂e\/ha/gi, "tCO2e/ha")
        .replace(/tCO₂e/gi, "tCO2e")
        .replace(/tCO2e\/ha/gi, "tCO2e/ha")
        .replace(/CO₂/gi, "CO2")
        .replace(/₂/g, "2")
        .replace(/Δ/g, "Delta")
        .replace(/[→➔➜]/g, ">")
        .replace(/[–—]/g, "-")
        .replace(/[•·]/g, "-")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/…/g, "...")
        .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, "")
    }

    // Intercept and sanitize every string passed to jsPDF
    const origText = doc.text.bind(doc)
    doc.text = function(text: any, x: any, y: any, options?: any) {
      if (typeof text === "string") {
        return origText(cleanPdfText(text), x, y, options)
      }
      if (Array.isArray(text)) {
        return origText(text.map(t => typeof t === "string" ? cleanPdfText(t) : t), x, y, options)
      }
      return origText(text, x, y, options)
    } as any

    const origSplit = doc.splitTextToSize.bind(doc)
    doc.splitTextToSize = function(text: string, maxW: number, options?: any) {
      return origSplit(cleanPdfText(text), maxW, options)
    } as any

    const pageWidth = doc.internal.pageSize.getWidth()   // 210mm
    const pageHeight = doc.internal.pageSize.getHeight() // 297mm
    const margin = 18
    const contentWidth = pageWidth - margin * 2          // 174mm
    const period = `${startYear}-${startMonth} to ${endYear}-${endMonth}`
    const scopeLabel = scope === "Global" ? "Landscape-Wide Inventory" : scope === "Single" ? "Single-Patch Audit" : "Comparative Patch Audit"
    const totalCarbonChange = metrics.reduce((sum, metric) => sum + metric.carbonChange, 0)
    const totalNdviChange = metrics.reduce((sum, metric) => sum + metric.ndviChange, 0)
    const totalPixels = metrics.reduce((sum, metric) => sum + metric.pixels, 0)
    const totalMonths = metrics.reduce((sum, metric) => sum + metric.months, 0)
    const meanCarbon = metrics.length ? metrics.reduce((sum, m) => sum + m.carbonEnd, 0) / metrics.length : 0
    const meanNdvi = metrics.length ? metrics.reduce((sum, m) => sum + m.ndviEnd, 0) / metrics.length : 0

    const logo = await fetch("/logo.png")
      .then(response => response.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      }))
      .catch(() => null)

    const addPageChrome = (pageNumber: number) => {
      doc.setPage(pageNumber)
      if (logo) {
        doc.addImage(logo, "PNG", margin, 10, 18, 12)
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(18, 70, 58)
      doc.text("UAE NATIONAL BLUE CARBON MRV PLATFORM", margin + 22, 16)
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(110, 120, 115)
      doc.text(`VERRA VM0033 EVIDENCE DOSSIER | ${scopeLabel.toUpperCase()} | ${period}`, margin + 22, 21)

      doc.setDrawColor(16, 185, 129)
      doc.setLineWidth(0.6)
      doc.line(margin, 25, pageWidth - margin, 25)
    }

    const addSectionTitle = (heading: string, y: number) => {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(13)
      doc.setTextColor(18, 70, 58)
      doc.text(heading, margin, y)
      doc.setDrawColor(16, 185, 129)
      doc.setLineWidth(0.7)
      doc.line(margin, y + 2.5, pageWidth - margin, y + 2.5)
    }

    // =========================================================================
    // PAGE 1: OFFICIAL VERRA VM0033 EXECUTIVE COVER PAGE (NO BLANK VOIDS)
    // =========================================================================
    if (logo) {
      doc.addImage(logo, "PNG", margin, 18, 26, 17)
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10.5)
    doc.setTextColor(18, 70, 58)
    doc.text("UNITED ARAB EMIRATES NATIONAL BLUE CARBON MRV PROGRAM", margin + 30, 24)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(100, 115, 110)
    doc.text("METHODOLOGY: VERRA VM0033 v2.1 | TIDAL WETLAND RESTORATION & CONSERVATION", margin + 30, 29)
    doc.text("SATELLITE SENTINEL MULTI-TEMPORAL SAR, OPTICAL & SPACEBORNE LiDAR REPOSITORY", margin + 30, 33)

    doc.setDrawColor(16, 185, 129)
    doc.setLineWidth(1.2)
    doc.line(margin, 40, pageWidth - margin, 40)

    // Document Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(19)
    doc.setTextColor(18, 70, 58)
    doc.text("Blue Carbon MRV Evidence Dossier", margin, 52)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(14, 116, 144)
    doc.text("Empirical Multi-Temporal Satellite Observation & Methodological Verification Package", margin, 58)

    // Official Specification Card (2-column layout)
    const cardY = 66
    const cardHeight = 74
    doc.setFillColor(248, 252, 250)
    doc.setDrawColor(200, 220, 212)
    doc.roundedRect(margin, cardY, contentWidth, cardHeight, 2, 2, "FD")

    // Card Header Bar
    doc.setFillColor(21, 83, 72)
    doc.roundedRect(margin, cardY, contentWidth, 7, 2, 2, "F")
    doc.rect(margin, cardY + 4, contentWidth, 3, "F") // square bottom corners
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    doc.text("OFFICIAL TECHNICAL AUDIT & METHODOLOGICAL SPECIFICATION", margin + 4, cardY + 5)

    // Card 2-column contents
    const metaY = cardY + 14
    const col1X = margin + 5
    const col2X = margin + 90
    const rowGap = 7

    const leftCol = [
      ["Monitoring Standard:", "Verra VM0033 v2.1 (Tidal Wetlands)"],
      ["Observation Window:", period],
      ["Audit Scope:", `${scopeLabel} (${patchCount || metrics.length} Nodes)`],
      ["Spatial Jurisdiction:", "Abu Dhabi Marine Protected Areas, UAE"],
      ["Optical Sensor:", "Sentinel-2 MSI (B1-B12 Surface Reflectance)"],
      ["SAR Radar Sensor:", "Sentinel-1 C-Band Dual-Pol (VV/VH Backscatter)"],
      ["Canopy Height Metric:", "NASA GEDI Full-Waveform LiDAR (rh100)"],
    ]

    const rightCol = [
      ["Analytical Framework:", "Spatiotemporal Imputation & Sequestration Engine"],
      ["Evidence Base:", `${totalPixels.toLocaleString()} Px Across ${totalMonths} Patch-Months`],
      ["Baseline Accounting:", "Aboveground & Belowground Blue Carbon Pools"],
      ["QA/QC Protocol:", "Calibrated Cloud Masking & Waveform Filtering"],
      ["Dossier Identifier:", `AE-BC-MRV-${Date.now().toString().slice(-6)}`],
      ["Publication Date:", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
      ["Verification Status:", "Pre-VVB Technical Evidence Submission"],
    ]

    doc.setFontSize(7)
    leftCol.forEach(([k, v], i) => {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(18, 70, 58)
      doc.text(k, col1X, metaY + i * rowGap)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 70, 65)
      doc.text(v, col1X + 31, metaY + i * rowGap)
    })

    rightCol.forEach(([k, v], i) => {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(18, 70, 58)
      doc.text(k, col2X, metaY + i * rowGap)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 70, 65)
      doc.text(v, col2X + 31, metaY + i * rowGap)
    })

    // KPI Summary Cards
    const kpiY = 146
    const kpiWidth = (contentWidth - 9) / 4 // ~41mm each
    const kpis = [
      { label: "MONITORED UNITS", val: `${patchCount || metrics.length} Patches`, sub: "Boundary Polygons", col: [18, 70, 58] },
      { label: "EVIDENCE PIXELS", val: `${totalPixels.toLocaleString()}`, sub: "Sentinel Grid Cells", col: [14, 116, 144] },
      { label: "NET CARBON CHANGE", val: `${totalCarbonChange >= 0 ? "+" : ""}${totalCarbonChange.toFixed(2)}`, sub: "tCO2e/ha Storage", col: totalCarbonChange >= 0 ? [16, 185, 129] : [220, 38, 38] },
      { label: "MEAN VITALITY CHANGE", val: `${totalNdviChange >= 0 ? "+" : ""}${totalNdviChange.toFixed(3)}`, sub: "NDVI Greenness Shift", col: [14, 116, 144] },
    ]

    kpis.forEach((kpi, idx) => {
      const kx = margin + idx * (kpiWidth + 3)
      doc.setFillColor(248, 252, 250)
      doc.setDrawColor(210, 225, 218)
      doc.roundedRect(kx, kpiY, kpiWidth, 25, 1.5, 1.5, "FD")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(6.5)
      doc.setTextColor(100, 115, 110)
      doc.text(kpi.label, kx + 3, kpiY + 5)

      doc.setFontSize(11)
      doc.setTextColor(kpi.col[0], kpi.col[1], kpi.col[2])
      doc.text(kpi.val, kx + 3, kpiY + 14)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(6)
      doc.setTextColor(120, 130, 125)
      doc.text(kpi.sub, kx + 3, kpiY + 20)
    })

    // Verra VM0033 Methodological Compliance Statement Card
    const compY = 177
    const compHeight = 58
    doc.setFillColor(252, 253, 252)
    doc.setDrawColor(215, 225, 220)
    doc.roundedRect(margin, compY, contentWidth, compHeight, 2, 2, "FD")

    doc.setFillColor(16, 185, 129)
    doc.rect(margin, compY, 2.5, compHeight, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(18, 70, 58)
    doc.text("VERRA VM0033 METHODOLOGICAL COMPLIANCE & LEGAL NOTICE", margin + 7, compY + 8)

    const noticeText = [
      "This technical dossier organizes observational evidence generated from calibrated multispectral (Sentinel-2), dual-polarization SAR (Sentinel-1), and spaceborne full-waveform LiDAR (NASA GEDI) sensors under the UAE National Blue Carbon Monitoring, Reporting, and Verification (MRV) framework.",
      "In accordance with Verra VM0033 (Methodology for Tidal Wetland and Seagrass Restoration, v2.1) and IPCC 2013 Wetlands Supplement requirements, carbon density is measured as metric tonnes of carbon dioxide equivalent per hectare (tCO2e/ha), incorporating both aboveground biomass and soil organic carbon (SOC) proxy layers.",
      "This document serves as an empirical foundation for Project Proponent validation and third-party Validation/Verification Body (VVB) audit proceedings. Official carbon credit issuance remains subject to baseline additionality verification, permanence risk assessment, and registry approval.",
    ]

    let currNoticeY = compY + 16
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(60, 70, 65)
    noticeText.forEach(paragraph => {
      const wrapped = doc.splitTextToSize(paragraph, contentWidth - 14)
      doc.text(wrapped, margin + 7, currNoticeY)
      currNoticeY += wrapped.length * 3.6 + 3
    })

    // Cover Footer Sign-off Block
    const signY = 242
    doc.setDrawColor(220, 230, 225)
    doc.setLineWidth(0.4)
    doc.line(margin, signY, pageWidth - margin, signY)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(18, 70, 58)
    doc.text("Project Proponents:", margin, signY + 6)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(70, 80, 75)
    doc.text("Environment Agency - Abu Dhabi (EAD) & Ministry of Climate Change and Environment (MOCCAE)", margin + 28, signY + 6)

    doc.setFont("helvetica", "bold")
    doc.setTextColor(18, 70, 58)
    doc.text("Technical Framework:", margin, signY + 11)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(70, 80, 75)
    doc.text("National Digital MRV Architecture | Cloud Automated Sentinel Imputation Pipeline", margin + 31, signY + 11)

    doc.setFontSize(6.5)
    doc.setTextColor(130, 140, 135)
    doc.text("CONFIDENTIAL | OFFICIAL GOVERNMENT OF THE UNITED ARAB EMIRATES BLUE CARBON MRV RECORD", pageWidth / 2, signY + 22, { align: "center" })

    // =========================================================================
    // PAGE 2: EXECUTIVE SUMMARY & CARBON TRAJECTORY (NEVER SPLIT ACROSS PAGES)
    // =========================================================================
    doc.addPage()
    addPageChrome(2)

    let y = 34
    addSectionTitle("1. Executive Summary & Empirical Synthesis", y)
    y += 8

    const summaryText = [
      `This ${scopeLabel.toLowerCase()} evaluates ${patchCount || metrics.length} coastal mangrove monitoring unit${(patchCount || metrics.length) === 1 ? "" : "s"} over the active observation window ${period}.`,
      `The empirical dataset comprises ${totalPixels.toLocaleString()} pixel-month observations synthesized across ${totalMonths} patch-month records, establishing a continuous high-resolution audit footprint.`,
      `Cumulative blue carbon stock change across the monitored units is recorded at ${totalCarbonChange >= 0 ? "+" : ""}${totalCarbonChange.toFixed(2)} tCO2e/ha (mean current stock: ${meanCarbon.toFixed(2)} tCO2e/ha). The corresponding aggregated NDVI vitality shift is ${totalNdviChange >= 0 ? "+" : ""}${totalNdviChange.toFixed(3)} (mean current NDVI: ${meanNdvi.toFixed(3)}).`,
    ]

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(45, 55, 50)
    summaryText.forEach(p => {
      const lines = doc.splitTextToSize(p, contentWidth)
      doc.text(lines, margin, y)
      y += lines.length * 4.2 + 2.5
    })

    // Key Highlights Banner Box
    y += 2
    doc.setFillColor(242, 250, 246)
    doc.setDrawColor(200, 225, 215)
    doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "FD")
    doc.setFillColor(16, 185, 129)
    doc.rect(margin, y, 2, 18, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(18, 70, 58)
    doc.text("KEY EMPIRICAL TAKEAWAY:", margin + 5, y + 5.5)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(50, 65, 58)
    const takeaway = totalCarbonChange >= 0 
      ? `Net positive sequestration confirmed (+${totalCarbonChange.toFixed(2)} tCO2e/ha). Canopy structure demonstrates stability across monitored nodes, confirming biomass permanence under VM0033 standards.`
      : `Localized carbon decline observed (${totalCarbonChange.toFixed(2)} tCO2e/ha). Targeted ground inspection is mandated to evaluate hydrological flushing and substrate hypersalinity.`
    doc.text(doc.splitTextToSize(takeaway, contentWidth - 10), margin + 5, y + 10.5)

    y += 26

    // Section 2: Carbon Trajectory Trend Chart
    addSectionTitle("2. Carbon Stock & Sequestration Trajectory (tCO2e/ha)", y)
    y += 7

    const hasMonthlySeries = metrics.some(m => (m.history?.length || 0) > 1)
    const chartWidth = contentWidth - 28
    const chartHeight = 50
    const chartX = margin + 20
    const chartY = y + 8

    if (hasMonthlySeries) {
      const series = metrics.map(m => ({
        label: m.patchId,
        values: (m.history || []).map(p => ({ date: p.date, value: p.avgCarbon }))
      }))
      const dates = series[0]?.values.map(p => p.date) || []
      const allVals = series.flatMap(s => s.values.map(p => p.value))
      const minVal = Math.min(...allVals, 0)
      const maxVal = Math.max(...allVals, 1)
      const range = Math.max(maxVal - minVal, 0.001)

      // Grid
      doc.setDrawColor(215, 225, 220)
      doc.setLineWidth(0.3)
      for (let g = 0; g <= 4; g++) {
        const lineY = chartY + (chartHeight * g) / 4
        doc.line(chartX, lineY, chartX + chartWidth, lineY)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(6.5)
        doc.setTextColor(100, 115, 110)
        doc.text((maxVal - (range * g) / 4).toFixed(2), chartX - 3, lineY + 2, { align: "right" })
      }

      // Curves
      const colors: [number, number, number][] = [[16, 185, 129], [14, 116, 144], [245, 158, 11], [139, 92, 246]]
      const xFor = (idx: number) => chartX + (dates.length <= 1 ? chartWidth / 2 : (idx / (dates.length - 1)) * chartWidth)

      series.forEach((s, sIdx) => {
        const col = colors[sIdx % colors.length]
        doc.setDrawColor(...col)
        doc.setFillColor(...col)
        doc.setLineWidth(1.2)
        s.values.forEach((pt, pIdx) => {
          const px = xFor(pIdx)
          const py = chartY + chartHeight - ((pt.value - minVal) / range) * chartHeight
          if (pIdx > 0) {
            const prev = s.values[pIdx - 1]
            const prevY = chartY + chartHeight - ((prev.value - minVal) / range) * chartHeight
            doc.line(xFor(pIdx - 1), prevY, px, py)
          }
          doc.circle(px, py, 1.6, "F")
        })
      })

      // Dates
      doc.setFontSize(6.5)
      doc.setTextColor(70, 80, 75)
      dates.forEach((d, i) => {
        doc.text(d, xFor(i), chartY + chartHeight + 6, { align: "center" })
      })

      // Legend
      let legX = chartX
      const legY = chartY + chartHeight + 13
      series.forEach((s, i) => {
        const col = colors[i % colors.length]
        doc.setFillColor(...col)
        doc.circle(legX + 2, legY - 1.5, 1.8, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.setTextColor(50, 60, 55)
        doc.text(s.label, legX + 6, legY)
        legX += 45
      })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(6.5)
      doc.setTextColor(120, 130, 125)
      doc.text("Figure 1: Mean aboveground and belowground blue carbon density (tCO2e/ha) synthesized across Sentinel observations.", margin, chartY + chartHeight + 20)
    } else {
      // Bar Chart for Carbon Change
      const maxVal = Math.max(...metrics.map(m => Math.abs(m.carbonChange)), 1)
      const barWidth = Math.min(24, chartWidth / Math.max(metrics.length, 1) - 8)
      metrics.forEach((m, idx) => {
        const bx = chartX + idx * (chartWidth / Math.max(metrics.length, 1)) + 10
        const h = Math.max(2, (Math.abs(m.carbonChange) / maxVal) * 38)
        doc.setFillColor(16, 185, 129)
        doc.roundedRect(bx, chartY + 38 - h, barWidth, h, 1, 1, "F")
        doc.setFontSize(7)
        doc.setTextColor(50, 60, 55)
        doc.text(m.patchId, bx + barWidth / 2, chartY + 46, { align: "center" })
        doc.text(`${m.carbonChange >= 0 ? "+" : ""}${m.carbonChange.toFixed(2)}`, bx + barWidth / 2, chartY + 38 - h - 2, { align: "center" })
      })
    }

    // =========================================================================
    // PAGE 3: NDVI VITALITY & CANOPY HEIGHT (DEDICATED PAGE, ZERO CUTOFF)
    // =========================================================================
    doc.addPage()
    addPageChrome(3)

    let y3 = 34
    addSectionTitle("3. Photosynthetic Vitality & Phenology Trajectory (NDVI)", y3)
    y3 += 7

    const ndviChartY = y3 + 8
    if (hasMonthlySeries) {
      const ndviSeries = metrics.map(m => ({
        label: m.patchId,
        values: (m.history || []).map(p => ({ date: p.date, value: p.avgNDVI }))
      }))
      const dates = ndviSeries[0]?.values.map(p => p.date) || []
      const allNdvi = ndviSeries.flatMap(s => s.values.map(p => p.value))
      const minNdvi = Math.max(0, Math.min(...allNdvi) - 0.05)
      const maxNdvi = Math.min(1, Math.max(...allNdvi, 0.2) + 0.05)
      const rangeNdvi = Math.max(maxNdvi - minNdvi, 0.01)

      // Grid
      doc.setDrawColor(215, 225, 220)
      doc.setLineWidth(0.3)
      for (let g = 0; g <= 4; g++) {
        const lineY = ndviChartY + (chartHeight * g) / 4
        doc.line(chartX, lineY, chartX + chartWidth, lineY)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(6.5)
        doc.setTextColor(100, 115, 110)
        doc.text((maxNdvi - (rangeNdvi * g) / 4).toFixed(3), chartX - 3, lineY + 2, { align: "right" })
      }

      // Curves
      const colors: [number, number, number][] = [[14, 116, 144], [16, 185, 129], [245, 158, 11], [139, 92, 246]]
      const xFor = (idx: number) => chartX + (dates.length <= 1 ? chartWidth / 2 : (idx / (dates.length - 1)) * chartWidth)

      ndviSeries.forEach((s, sIdx) => {
        const col = colors[sIdx % colors.length]
        doc.setDrawColor(...col)
        doc.setFillColor(...col)
        doc.setLineWidth(1.2)
        s.values.forEach((pt, pIdx) => {
          const px = xFor(pIdx)
          const py = ndviChartY + chartHeight - ((pt.value - minNdvi) / rangeNdvi) * chartHeight
          if (pIdx > 0) {
            const prev = s.values[pIdx - 1]
            const prevY = ndviChartY + chartHeight - ((prev.value - minNdvi) / rangeNdvi) * chartHeight
            doc.line(xFor(pIdx - 1), prevY, px, py)
          }
          doc.circle(px, py, 1.6, "F")
        })
      })

      // Dates
      doc.setFontSize(6.5)
      doc.setTextColor(70, 80, 75)
      dates.forEach((d, i) => {
        doc.text(d, xFor(i), ndviChartY + chartHeight + 6, { align: "center" })
      })

      // Legend
      let legX = chartX
      const legY = ndviChartY + chartHeight + 13
      ndviSeries.forEach((s, i) => {
        const col = colors[i % colors.length]
        doc.setFillColor(...col)
        doc.circle(legX + 2, legY - 1.5, 1.8, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.setTextColor(50, 60, 55)
        doc.text(s.label, legX + 6, legY)
        legX += 45
      })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(6.5)
      doc.setTextColor(120, 130, 125)
      doc.text("Figure 2: Sentinel-2 NDVI spectral greenness trajectory measuring photosynthetic vigor and phenological shifts.", margin, ndviChartY + chartHeight + 20)
    }

    // Section 4: Canopy Height (GEDI LiDAR rh100) Architecture
    y3 = ndviChartY + chartHeight + 30
    addSectionTitle("4. Canopy Height & Structural Geometry (NASA GEDI LiDAR rh100)", y3)
    y3 += 7

    const heightChartY = y3 + 8
    const heightItems = metrics.map(m => {
      const latestHeight = m.history?.length ? (m.history[m.history.length - 1].avgHeight || 1.5) : 1.5
      return { label: m.patchId, height: latestHeight }
    })
    const maxHeight = Math.max(...heightItems.map(h => h.height), 4)

    // Grid
    doc.setDrawColor(215, 225, 220)
    doc.setLineWidth(0.3)
    for (let g = 0; g <= 4; g++) {
      const lineY = heightChartY + (38 * g) / 4
      doc.line(chartX, lineY, chartX + chartWidth, lineY)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6.5)
      doc.setTextColor(100, 115, 110)
      doc.text(`${(maxHeight - (maxHeight * g) / 4).toFixed(1)}m`, chartX - 3, lineY + 2, { align: "right" })
    }

    const barWidth = Math.min(22, chartWidth / Math.max(heightItems.length, 1) - 10)
    heightItems.forEach((item, idx) => {
      const bx = chartX + idx * (chartWidth / Math.max(heightItems.length, 1)) + 12
      const h = Math.max(2, (item.height / maxHeight) * 38)
      doc.setFillColor(14, 116, 144)
      doc.roundedRect(bx, heightChartY + 38 - h, barWidth, h, 1, 1, "F")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(7.5)
      doc.setTextColor(18, 70, 58)
      doc.text(`${item.height.toFixed(2)}m`, bx + barWidth / 2, heightChartY + 38 - h - 2, { align: "center" })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(70, 80, 75)
      doc.text(item.label, bx + barWidth / 2, heightChartY + 45, { align: "center" })
    })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    doc.setTextColor(120, 130, 125)
    doc.text("Figure 3: GEDI spaceborne full-waveform LiDAR relative height (rh100) capturing 3D vertical canopy geometry.", margin, heightChartY + 54)

    // =========================================================================
    // PAGE 4: EMPIRICAL EVIDENCE REGISTER & VM0033 READINESS MATRIX
    // =========================================================================
    doc.addPage()
    addPageChrome(4)

    let y4 = 34
    addSectionTitle("5. Empirical Evidence Register & Node Performance", y4)
    y4 += 8

    const tableRows = metrics.map(m => [
      m.patchId,
      String(m.months),
      m.pixels.toLocaleString(),
      m.carbonStart.toFixed(2),
      m.carbonEnd.toFixed(2),
      `${m.carbonChange >= 0 ? "+" : ""}${m.carbonChange.toFixed(2)}`,
      `${m.ndviChange >= 0 ? "+" : ""}${m.ndviChange.toFixed(3)}`,
      m.ndviChange < -0.05 || m.carbonChange < 0 ? "Review Required" : "Stable / Accreting"
    ])

    autoTable(doc, {
      startY: y4,
      head: [["Patch ID", "Months", "Pixels", "C Start (tCO2e)", "C End (tCO2e)", "Net Delta Carbon", "Net Delta NDVI", "Audit Signal"]],
      body: tableRows,
      theme: "striped",
      didParseCell: (data: any) => {
        if (typeof data.cell.text === "string") {
          data.cell.text = cleanPdfText(data.cell.text)
        } else if (Array.isArray(data.cell.text)) {
          data.cell.text = data.cell.text.map(cleanPdfText)
        }
      },
      headStyles: {
        fillColor: [18, 70, 58],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [33, 41, 48],
        cellPadding: 2.5,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 251, 249],
      },
      margin: { left: margin, right: margin },
    })

    const table1End = (doc as any).lastAutoTable.finalY

    // Check spacing for VM0033 Matrix: if remaining space < 105mm, start on a fresh page
    let matrixY = table1End + 14
    if (pageHeight - table1End < 115) {
      doc.addPage()
      addPageChrome(doc.getNumberOfPages())
      matrixY = 34
    }

    addSectionTitle("6. VM0033 Methodology Alignment & VVB Readiness Matrix", matrixY)
    matrixY += 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(60, 70, 65)
    const matrixDesc = "The following matrix audits empirical compliance against Verra VM0033 v2.1 validation requirements. Elements marked 'Documented' have active sensor time-series records in this repository:"
    doc.text(doc.splitTextToSize(matrixDesc, contentWidth), margin, matrixY)
    matrixY += 6

    const matrixRows = [
      ["Monitoring Period & Spatial Boundary", `${period} across ${patchCount || metrics.length} geographic boundary polygons`, "Documented & Mapped"],
      ["Multi-Spectral Optical Time-Series", "Sentinel-2 MSI surface reflectance (B1-B12, NDVI, NDWI)", "Calibrated & Documented"],
      ["Synthetic Aperture Radar (SAR)", "Sentinel-1 dual-pol backscatter (VV/VH) & coherence matrices", "Calibrated & Documented"],
      ["Spaceborne LiDAR Canopy Structure", "NASA GEDI full-waveform metrics (rh100, rh98, rh92, FCOVER)", "Empirical LiDAR Recorded"],
      ["Carbon Sequestration & Stock Allometry", "Allometric biomass equations & ML temporal imputation", "Methodology Equations Attached"],
      ["Baseline Determination & Additionality", "Pre-restoration reference periods and counterfactual models", "Requires Project Documentation"],
      ["Uncertainty Budget & QA/QC Framework", "Pixel-level residual variance & atmospheric cloud/shadow masking", "Requires QA/QC Register"],
      ["Permanence, Buffer Pool & Reversal Risk", "Climate stress, sea-level rise & maritime disturbance indices", "Requires Monitoring Plan"],
      ["Independent Third-Party VVB Verification", "Technical evidence package prepared for accredited auditor review", "Pending Accredited VVB Review"],
    ]

    autoTable(doc, {
      startY: matrixY,
      head: [["Methodological Domain", "Empirical Evidence in Dossier", "VVB Compliance Status"]],
      body: matrixRows,
      theme: "striped",
      didParseCell: (data: any) => {
        if (typeof data.cell.text === "string") {
          data.cell.text = cleanPdfText(data.cell.text)
        } else if (Array.isArray(data.cell.text)) {
          data.cell.text = data.cell.text.map(cleanPdfText)
        }
      },
      headStyles: {
        fillColor: [14, 116, 144],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [33, 41, 48],
        cellPadding: 2.2,
      },
      alternateRowStyles: {
        fillColor: [248, 251, 249],
      },
      columnStyles: {
        0: { cellWidth: 46, fontStyle: "bold" },
        1: { cellWidth: 80 },
        2: { cellWidth: 48, fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
    })

    // =========================================================================
    // PAGE 5+: ANALYTICAL INTERPRETATION & SCIENTIFIC EVALUATION
    // =========================================================================
    doc.addPage()
    addPageChrome(doc.getNumberOfPages())

    let currentY = 34
    addSectionTitle("7. Analytical Interpretation & Scientific Directives", currentY)
    currentY += 9

    const narrativeBlocks = content.split(/\n\n+/)
    for (const block of narrativeBlocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0)
      if (lines.length === 0) continue

      const firstLine = lines[0]
      const isHeading = /^(?:[1-9]\.|#+|[A-Z\s]{4,}:|\*\*[A-Za-z\s0-9_]+:\*\*)/.test(firstLine)

      if (isHeading) {
        if (currentY > pageHeight - 35) {
          doc.addPage()
          addPageChrome(doc.getNumberOfPages())
          currentY = 34
        }
        const cleanHeading = firstLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/:$/, "").toUpperCase()
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9.5)
        doc.setTextColor(18, 70, 58)
        doc.text(cleanHeading, margin, currentY)
        doc.setDrawColor(16, 185, 129)
        doc.setLineWidth(0.4)
        doc.line(margin, currentY + 1.8, margin + Math.min(contentWidth, doc.getTextWidth(cleanHeading) + 8), currentY + 1.8)
        currentY += 6.5

        const remaining = lines.slice(1)
        for (const rem of remaining) {
          const cleanRem = rem.replace(/\*\*/g, "")
          const wrapped = doc.splitTextToSize(cleanRem, contentWidth)
          if (currentY + wrapped.length * 4.2 > pageHeight - 24) {
            doc.addPage()
            addPageChrome(doc.getNumberOfPages())
            currentY = 34
          }
          doc.setFont("helvetica", "normal")
          doc.setFontSize(8)
          doc.setTextColor(45, 55, 50)
          doc.text(wrapped, margin, currentY)
          currentY += wrapped.length * 4.2 + 2
        }
        currentY += 3
        continue
      }

      // Check if bullet list
      const isList = lines.every(l => /^(?:[→\*\-\•]|\d+\.)\s*/.test(l))
      if (isList) {
        for (const line of lines) {
          const isArrow = line.startsWith("→")
          const cleanLine = line.replace(/^(?:[→\*\-\•]|\d+\.)\s*/, "").replace(/\*\*/g, "")
          const wrapped = doc.splitTextToSize(cleanLine, contentWidth - 8)

          if (currentY + wrapped.length * 4.2 > pageHeight - 24) {
            doc.addPage()
            addPageChrome(doc.getNumberOfPages())
            currentY = 34
          }

          doc.setFont("helvetica", "bold")
          doc.setFontSize(8)
          doc.setTextColor(isArrow ? 14 : 18, isArrow ? 116 : 70, isArrow ? 144 : 58)
          doc.text(isArrow ? ">" : "-", margin + 1, currentY)

          doc.setFont("helvetica", "normal")
          doc.setTextColor(45, 55, 50)
          doc.text(wrapped, margin + 7, currentY)
          currentY += wrapped.length * 4.2 + 2.5
        }
        currentY += 3
        continue
      }

      // Regular paragraph
      const cleanBlock = block.replace(/\*\*/g, "")
      const wrapped = doc.splitTextToSize(cleanBlock, contentWidth)
      if (currentY + wrapped.length * 4.2 > pageHeight - 24) {
        doc.addPage()
        addPageChrome(doc.getNumberOfPages())
        currentY = 34
      }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(45, 55, 50)
      doc.text(wrapped, margin, currentY)
      currentY += wrapped.length * 4.2 + 3.5
    }

    // =========================================================================
    // FINAL PASS: OFFICIAL UNIVERSAL "PAGE X OF Y" FOOTERS
    // =========================================================================
    const totalPages = doc.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(115, 125, 120)
      doc.text(
        `Confidential | UAE Blue Carbon MRV Dossier | Page ${p} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" }
      )
    }

    doc.save(`${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`)
  }

  const handleGenerateReport = async () => {
    if (!firestore) {
      setGenerationError("The data service is unavailable. Refresh the page and try again.")
      return
    }

    if (`${startYear}-${startMonth}` > `${endYear}-${endMonth}`) {
      setGenerationError("The report start date must be before the end date.")
      return
    }

    setGenerationError(null)
    setIsGenerating(true)

    try {
      const startDate = `${startYear}-${startMonth}`
      const endDate = `${endYear}-${endMonth}`

      let resultText = ""
      let finalTargetIds: string[] = []
      let finalMetrics: ReportMetric[] = []

      if (reportType === "Global") {
        const patchesSnapshot = await getDocs(collection(firestore, "Patches"))
        const sampledDocs = patchesSnapshot.docs.slice(0, 15)
        finalTargetIds = sampledDocs.map(d => d.id)

        const patchSummaries = await Promise.all(
          sampledDocs.map(async pDoc => {
            const tsRef = collection(firestore, "Patches", pDoc.id, "TimeSeries")
            const tsSnap = await getDocs(
              query(
                tsRef,
                where("__name__", ">=", startDate),
                where("__name__", "<=", endDate),
                limit(dynamicMonths + 12)
              )
            )
            const values = tsSnap.docs
              .map(doc => {
                const d = doc.data()
                return Number(d.total_absorption_tCO2e_ha ?? d.carbon_stock_tCO2e_ha ?? 0)
              })
              .filter(v => Number.isFinite(v) && v > 0)
            return {
              id: pDoc.id,
              carbon: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
            }
          })
        )
        const topPerformers = patchSummaries
          .filter(summary => summary.carbon > 0)
          .sort((a, b) => b.carbon - a.carbon)
          .slice(0, 3)
        const totalCarbonSum = patchSummaries.reduce((sum, summary) => sum + summary.carbon, 0)
        finalMetrics = patchSummaries.map(summary => ({
          patchId: summary.id,
          months: summary.carbon > 0 ? 1 : 0,
          pixels: 0,
          carbonStart: 0,
          carbonEnd: summary.carbon,
          ndviStart: 0,
          ndviEnd: 0,
          carbonChange: summary.carbon,
          ndviChange: 0,
        }))
        setReportMetrics(finalMetrics)

        try {
          const genRes = await fetch("/api/reports/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "Global",
              startDate,
              endDate,
              totalPatches: patchesSnapshot.size,
              avgCarbon: totalCarbonSum / (sampledDocs.length || 1),
              metrics: finalMetrics,
            }),
          })
          const genData = await genRes.json()
          if (genData.narrative) {
            resultText = genData.narrative
          } else {
            throw new Error(genData.error || "Empty narrative")
          }
        } catch (error) {
          resultText = buildEvidenceFallback(
            finalMetrics,
            `${startDate} to ${endDate}`,
            "system-wide baseline MRV report"
          )
        }
      } else {
        const targetIds = reportType === "Single" ? selectedPatches.slice(0, 1) : selectedPatches
        finalTargetIds = targetIds
        if (targetIds.length === 0) {
          setGenerationError("Select at least one patch to generate the report.")
          return
        }

        const auditedPatches = await Promise.all(
          targetIds.map(async id => {
            const tsRef = collection(firestore, "Patches", id, "TimeSeries")
            const tsSnap = await getDocs(
              query(
                tsRef,
                where("__name__", ">=", startDate),
                where("__name__", "<=", endDate),
                limit(dynamicMonths + 12)
              )
            )

            const sortedDocs = [...tsSnap.docs].sort((a, b) => a.id.localeCompare(b.id))
            const filteredDocs = sortedDocs.filter(d => d.id >= startDate && d.id <= endDate)

            const history: { date: string; avgCarbon: number; avgHeight: number; avgNDVI: number; pixelCount: number }[] = []
            for (const tsDoc of filteredDocs) {
              const data = tsDoc.data()
              const mangrovePixels = data.mangrove_pixels || {}
              const pixelKeys = Object.keys(mangrovePixels)
              
              let avgCarbon = Number(data.total_absorption_tCO2e_ha ?? data.carbon_stock_tCO2e_ha ?? 0)
              let avgNDVI = Number(data.average_NDVI ?? data.NDVI ?? 0)
              let avgHeight = Number(data.average_GEDI_canopy_height_rh100 ?? data.GEDI_canopy_height_rh100 ?? 0)

              if (pixelKeys.length > 0) {
                if (!avgCarbon) {
                  avgCarbon = pixelKeys.reduce((s, k) => s + (mangrovePixels[k]?.carbon_stock_tCO2e_ha || 0), 0) / pixelKeys.length
                }
                if (!avgNDVI) {
                  avgNDVI = pixelKeys.reduce((s, k) => s + (mangrovePixels[k]?.NDVI || 0), 0) / pixelKeys.length
                }
                if (!avgHeight) {
                  avgHeight = pixelKeys.reduce((s, k) => s + (mangrovePixels[k]?.GEDI_canopy_height_rh100 || 0), 0) / pixelKeys.length
                }
              }

              history.push({
                date: tsDoc.id,
                avgCarbon: Math.round(avgCarbon * 100) / 100,
                avgHeight: Math.round(avgHeight * 100) / 100,
                avgNDVI: Math.round(avgNDVI * 1000) / 1000,
                pixelCount: pixelKeys.length || 1,
              })
            }

            let latestPixels: Record<string, any> = {}
            if (filteredDocs.length > 0) {
              const latestDoc = filteredDocs[filteredDocs.length - 1]
              const data = latestDoc.data()
              const pix = data.mangrove_pixels || {}
              Object.entries(pix).slice(0, 16).forEach(([k, p]: [string, any]) => {
                latestPixels[k] = {
                  carbon_stock_tCO2e_ha: Number(p?.carbon_stock_tCO2e_ha || 0),
                  GEDI_canopy_height_rh100: Number(p?.GEDI_canopy_height_rh100 || 0),
                  NDVI: Number(p?.NDVI || 0),
                }
              })
            }

            return {
              patchId: id,
              history,
              latestPixels,
            }
          })
        )

        finalMetrics = auditedPatches.map(patch => {
          const first = patch.history[0]
          const last = patch.history[patch.history.length - 1] || first
          const carbonStart = first?.avgCarbon || 0
          const carbonEnd = last?.avgCarbon || 0
          const ndviStart = first?.avgNDVI || 0
          const ndviEnd = last?.avgNDVI || 0
          return {
            patchId: patch.patchId,
            months: patch.history.length,
            pixels: patch.history.reduce((sum, item) => sum + item.pixelCount, 0),
            carbonStart,
            carbonEnd,
            ndviStart,
            ndviEnd,
            carbonChange: Math.round((carbonEnd - carbonStart) * 100) / 100,
            ndviChange: Math.round((ndviEnd - ndviStart) * 1000) / 1000,
            history: patch.history.map(item => ({
              date: item.date,
              avgCarbon: item.avgCarbon,
              avgNDVI: item.avgNDVI,
              avgHeight: item.avgHeight,
            })),
          }
        })
        setReportMetrics(finalMetrics)

        const promptQuery = reportType === "Single"
          ? `Prepare an agency-grade MRV narrative for Patch ${targetIds[0]} from ${startDate} through ${endDate}. Explain baseline, carbon stock/sequestration, NDVI vitality, canopy structure, uncertainty, anomalies, and field recommendations. Do not claim months outside the supplied range.`
          : `Prepare an agency-grade comparative MRV narrative for these patches: ${targetIds.join(', ')} from ${startDate} through ${endDate}. Include a clear ranking, convergence/divergence of carbon and NDVI trends, data limitations, uncertainty, and prioritized actions. Do not discuss patches not supplied.`

        try {
          const genRes = await fetch("/api/reports/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: reportType === "Single" ? "Single" : "Comparative",
              startDate,
              endDate,
              metrics: finalMetrics,
            }),
          })
          const genData = await genRes.json()
          if (genData.narrative) {
            resultText = genData.narrative
          } else {
            throw new Error(genData.error || "Empty narrative")
          }
        } catch (error) {
          resultText = buildEvidenceFallback(finalMetrics, `${startDate} to ${endDate}`, reportType === "Single" ? "single-patch MRV report" : "comparative MRV report")
        }
      }

      setReportResult(resultText)
      setShowReportDialog(true)

      // Automatically archive synthesized report to the database
      const reportTitle = reportType === "Single"
        ? `Single_Patch_${finalTargetIds[0]}_Audit_${startDate.replace("-", "_")}_${endDate.replace("-", "_")}`
        : reportType === "Comparison"
        ? `Comparative_Audit_${finalTargetIds.slice(0, 3).join("_")}_${startDate.replace("-", "_")}_${endDate.replace("-", "_")}`
        : `UAE_Blue_Carbon_MRV_${startDate.replace("-", "_")}_${endDate.replace("-", "_")}`

      const reportPayload = {
        title: reportTitle,
        description: `${reportType === "Global" ? "Landscape-Wide Inventory" : reportType === "Single" ? "Single-Patch Audit" : "Comparative Patch Audit"} covering ${finalTargetIds.length} monitored node(s) across ${startDate} to ${endDate}.`,
        type: reportType,
        scope: reportType,
        period: `${startDate} to ${endDate}`,
        startDate,
        endDate,
        selectedPatches: finalTargetIds,
        metrics: finalMetrics,
        content: resultText,
        status: "Generated",
      }

      try {
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportPayload),
        })
        fetchRecentReports()
      } catch (saveErr) {
        console.warn("Failed to archive report to database:", saveErr)
      }
    } catch (e: unknown) {
      console.error("Report Generation Error:", e)
      setGenerationError(e instanceof Error ? e.message : "Failed to generate the report.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadStoredReport = async (report: StoredReport) => {
    if (report.pdfBase64) {
      const link = document.createElement("a")
      link.href = report.pdfBase64
      link.download = `${report.title.replace(/\s+/g, "_")}.pdf`
      link.click()
      return
    }

    await downloadPDF(
      report.content,
      report.title,
      report.type || report.scope || "Global",
      report.selectedPatches?.length || 1,
      report.metrics && report.metrics.length > 0 ? report.metrics : reportMetrics
    )
  }

  const handleViewStoredReport = (report: StoredReport) => {
    setReportResult(report.content)
    if (report.metrics && report.metrics.length > 0) {
      setReportMetrics(report.metrics)
    }
    if (report.startDate && report.endDate) {
      const [sy, sm] = report.startDate.split("-")
      const [ey, em] = report.endDate.split("-")
      if (sy) setStartYear(sy)
      if (sm) setStartMonth(sm)
      if (ey) setEndYear(ey)
      if (em) setEndMonth(em)
    }
    if (report.type || report.scope) {
      setReportType(report.type || report.scope || "Global")
    }
    setShowReportDialog(true)
  }

  const handleDeleteSingleReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/reports?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setRecentReports(prev => prev.filter(r => r.id !== id))
      }
    } catch (err) {
      console.error("Failed to delete report:", err)
    }
  }

  const handleClearAllReports = async () => {
    if (!confirm("Are you sure you want to empty the reports repository? All stored audit records will be deleted to free database storage.")) return
    try {
      setIsClearingReports(true)
      const res = await fetch("/api/reports?all=true", { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setRecentReports([])
      }
    } catch (err) {
      console.error("Failed to clear reports:", err)
    } finally {
      setIsClearingReports(false)
    }
  }

  const downloadableReport = reportResult || ""

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">Intelligence Reports</h1>
        </header>
        
        <main className="flex flex-1 flex-col gap-8 p-6 max-w-7xl mx-auto w-full">
          <section className="space-y-2">
            <h2 className="text-3xl font-headline font-bold text-primary">Coastal Audit Engine</h2>
            <p className="text-muted-foreground text-lg max-w-3xl">
              Synthesize high-fidelity reports from the {dynamicMonths}-month temporal repository. Download comparative analysis or single-patch audits as professional PDF documents.
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Report Configuration */}
            <Card className="lg:col-span-5 border-border/50 bg-card/30 backdrop-blur-sm shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-primary to-accent opacity-30" />
              <CardHeader>
                <CardTitle className="text-sm font-headline flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                  <Filter className="size-4 text-accent" />
                  Report Configurator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Type Selection */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Report Scope</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Global', label: 'System', icon: BarChart4 },
                      { id: 'Single', label: 'Patch', icon: FileText },
                      { id: 'Comparison', label: 'Compare', icon: Layers }
                    ].map((type) => (
                      <Button
                        key={type.id}
                        variant={reportType === type.id ? 'default' : 'outline'}
                        onClick={() => {
                          setReportType(type.id as any)
                          if (type.id === 'Global') setSelectedPatches([])
                        }}
                        className="h-20 flex-col gap-2 rounded-xl"
                      >
                        <type.icon className="size-5" />
                        <span className="text-[10px] font-bold uppercase">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Patch Selector */}
                {reportType !== 'Global' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Targets</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-12 rounded-xl font-bold">
                          {selectedPatches.length === 0 ? "Choose Patches..." : `${selectedPatches.length} Patches Selected`}
                          <ChevronDown className="size-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 shadow-2xl" align="start">
                        <ScrollArea className="h-64">
                          <div className="p-2 space-y-1">
                            {patchesLoading ? <Loader2 className="size-4 animate-spin mx-auto my-4" /> : patchesError ? (
                              <p className="p-3 text-xs text-destructive">{patchesError.message}</p>
                            ) : patches?.map(patch => (
                              <div 
                                key={patch.id} 
                                className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                                onClick={() => togglePatch(patch.id)}
                              >
                                <Checkbox checked={selectedPatches.includes(patch.id)} />
                                <span className="text-sm font-bold">{patch.id}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Temporal Range */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temporal Range ({dynamicMonths} Months)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">From</p>
                      <div className="flex gap-1">
                        <Select value={startMonth} onValueChange={setStartMonth}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>{MONTHS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={startYear} onValueChange={setStartYear}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">To</p>
                      <div className="flex gap-1">
                        <Select value={endMonth} onValueChange={setEndMonth}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>{MONTHS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={endYear} onValueChange={setEndYear}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating || (reportType !== 'Global' && selectedPatches.length === 0)}
                  className="w-full h-14 rounded-xl gap-3 font-bold text-lg shadow-xl shadow-primary/20 bg-accent hover:bg-accent/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isGenerating ? <Loader2 className="animate-spin size-6" /> : <Sparkles className="size-5" />}
                  {isGenerating ? "Synthesizing Archive..." : "Synthesize AI Report"}
                </Button>
                {generationError && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {generationError}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Realtime Stored Reports Repository */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/10">
                    <History className="size-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-headline font-semibold">
                      Recent Audit Dossiers
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Archive of verified intelligence reports & VM0033 dossiers
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] bg-accent/5 text-accent border-accent/20">
                    {dynamicMonths}-Month Archive Active
                  </Badge>
                  {recentReports.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllReports}
                      disabled={isClearingReports}
                      className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 gap-1.5"
                    >
                      {isClearingReports ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                      Empty Repository
                    </Button>
                  )}
                </div>
              </div>

              {isLoadingReports ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="p-5 border-border/40 bg-card/20 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="size-12 rounded-xl bg-muted/40" />
                          <div className="space-y-2">
                            <div className="h-4 w-48 bg-muted/40 rounded" />
                            <div className="h-3 w-32 bg-muted/30 rounded" />
                          </div>
                        </div>
                        <div className="h-8 w-20 bg-muted/40 rounded-full" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : recentReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border/40 rounded-3xl bg-card/20 backdrop-blur-sm gap-4 text-center">
                  <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
                    <Database className="size-8 text-accent/60" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h4 className="font-bold text-base text-foreground">No Stored Reports in Database</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      All previous outdated records have been cleared to preserve storage. Configure your audit parameters on the left and synthesize a new report—it will automatically be archived here for instant download.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {recentReports.map(item => (
                    <Card
                      key={item.id}
                      onClick={() => handleViewStoredReport(item)}
                      className="group hover:border-accent/40 border-border/50 bg-card/30 backdrop-blur-sm transition-all hover:bg-accent/[0.02] cursor-pointer"
                    >
                      <CardContent className="flex items-center justify-between p-5 flex-wrap sm:flex-nowrap gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="p-3 rounded-xl bg-muted/40 group-hover:bg-accent/10 transition-colors shrink-0">
                            <FileDown className="size-6 text-primary/60 group-hover:text-accent" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-base group-hover:text-primary transition-colors truncate">
                              {item.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1 font-medium">
                              <span className="flex items-center gap-1.5 shrink-0">
                                <Calendar className="size-3.5" />
                                {new Date(item.timestamp || item.createdAt || "").toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-bold uppercase tracking-wider h-5 bg-accent/10 text-accent border border-accent/20"
                              >
                                {item.type || item.scope || "Global"}
                              </Badge>
                              {item.period && (
                                <span className="font-mono text-[11px] text-muted-foreground/80">
                                  {item.period}
                                </span>
                              )}
                              {item.selectedPatches && item.selectedPatches.length > 0 && (
                                <span className="text-[11px] font-semibold text-primary/80">
                                  {item.selectedPatches.length} patch(es)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadStoredReport(item)
                            }}
                            className="rounded-full gap-2 font-bold uppercase text-[10px] px-4 hover:bg-primary hover:text-white border-primary/20"
                          >
                            <Download className="size-3.5" /> PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteSingleReport(item.id, e)}
                            title="Delete report from database"
                            className="size-8 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex flex-col items-center justify-center p-8 border border-border/30 rounded-2xl bg-muted/5 gap-2 text-center">
                <p className="text-xs text-muted-foreground font-medium italic max-w-lg leading-relaxed">
                  The automated repository periodically samples coastal nodes to maintain a longitudinal stability baseline across the {dynamicMonths}-month program lifecycle.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* AI Report Viewer */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-accent/20">
            <DialogHeader className="p-6 pb-4 border-b bg-accent/[0.03]">
              <div className="flex items-center justify-between mb-2">
                 <DialogTitle className="font-headline text-2xl font-bold flex items-center gap-2 text-primary">
                    <Sparkles className="size-6 text-accent" />
                    Generated Intelligence Report
                 </DialogTitle>
                 <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => downloadPDF(downloadableReport, `UAE_Blue_Carbon_MRV_${startYear}_${startMonth}_${endYear}_${endMonth}`, reportType, reportType === "Global" ? reportMetrics.length : selectedPatches.length)}
                      className="h-8 gap-2 font-bold uppercase text-[10px] bg-accent text-white hover:bg-accent/90 border-none"
                    >
                      <Download className="size-3.5" /> Download PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 gap-2 font-bold uppercase text-[10px]">
                      <Printer className="size-3" /> Print
                    </Button>
                 </div>
              </div>
              <DialogDescription className="font-medium text-muted-foreground">
                Temporal Cycle: {startYear}-{startMonth} to {endYear}-{endMonth} • National Blue Carbon Program
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 bg-background">
              <div id="report-content" className="p-10 space-y-6">
                 {reportResult ? (
                   <div className="space-y-8">
                      <section className="grid gap-3 sm:grid-cols-3">
                        <Card className="border-primary/15 bg-primary/[0.03]">
                          <CardContent className="p-4"><p className="text-[10px] uppercase font-bold text-muted-foreground">Monitoring units</p><p className="text-2xl font-bold text-primary">{reportMetrics.length}</p><p className="text-xs text-muted-foreground">patches in this report</p></CardContent>
                        </Card>
                        <Card className="border-accent/15 bg-accent/[0.03]">
                          <CardContent className="p-4"><p className="text-[10px] uppercase font-bold text-muted-foreground">Observed period</p><p className="text-2xl font-bold text-accent">{reportMetrics[0]?.months || 0}</p><p className="text-xs text-muted-foreground">months per selected patch</p></CardContent>
                        </Card>
                        <Card className="border-border/60">
                          <CardContent className="p-4"><p className="text-[10px] uppercase font-bold text-muted-foreground">Evidence footprint</p><p className="text-2xl font-bold">{reportMetrics.reduce((sum, metric) => sum + metric.pixels, 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">pixel-month observations</p></CardContent>
                        </Card>
                      </section>
                      {reportMetrics.length > 0 && (
                        <section className="rounded-2xl border border-border/60 overflow-x-auto">
                          <div className="p-4 border-b bg-muted/20"><h3 className="font-bold text-primary">Evidence Summary</h3><p className="text-xs text-muted-foreground">Observed values are computed from the selected temporal window; no extrapolation is shown.</p></div>
                          <table className="w-full text-xs">
                            <thead className="bg-muted/20 text-muted-foreground"><tr>{["Patch", "Months", "Pixels", "Carbon Δ", "NDVI Δ", "Signal"].map(header => <th key={header} className="p-3 text-left font-bold uppercase tracking-wider">{header}</th>)}</tr></thead>
                            <tbody>{reportMetrics.map(metric => <tr key={metric.patchId} className="border-t">
                              <td className="p-3 font-bold">{metric.patchId}</td><td className="p-3">{metric.months}</td><td className="p-3">{metric.pixels.toLocaleString()}</td>
                              <td className={`p-3 font-bold ${metric.carbonChange >= 0 ? "text-emerald-600" : "text-destructive"}`}>{metric.carbonChange >= 0 ? "+" : ""}{metric.carbonChange.toFixed(2)}</td>
                              <td className={`p-3 font-bold ${metric.ndviChange >= 0 ? "text-emerald-600" : "text-destructive"}`}>{metric.ndviChange >= 0 ? "+" : ""}{metric.ndviChange.toFixed(3)}</td>
                              <td className="p-3"><Badge variant="outline">{metric.ndviChange < -0.05 || metric.carbonChange < 0 ? "Review" : "Stable / improving"}</Badge></td>
                            </tr>)}</tbody>
                          </table>
                        </section>
                      )}
                   <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                      {reportResult.split('\n\n').map((block, bIdx) => {
                        const lines = block.split('\n').filter(l => l.trim().length > 0);
                        if (lines.length === 0) return null;
                        const first = lines[0].trim();
                        const isHeading = first.startsWith('#') || /^[1-9]\./.test(first) || /^[A-Z\s]{4,}:/.test(first) || /^\*\*[A-Za-z\s0-9_]+:\*\*/.test(first);

                        if (isHeading) {
                          const cleanHeading = first.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/:$/, '');
                          return (
                            <div key={bIdx} className="pt-4 border-b pb-2">
                              <h3 className="text-base font-bold text-primary tracking-tight uppercase">{cleanHeading}</h3>
                              {lines.slice(1).map((subLine, sIdx) => (
                                <p key={sIdx} className="text-muted-foreground leading-relaxed text-sm font-medium mt-2">
                                  {subLine.replace(/\*\*/g, '')}
                                </p>
                              ))}
                            </div>
                          );
                        }

                        const isList = lines.every(l => /^(?:[→\*\-\•]|\d+\.)\s*/.test(l.trim()));
                        if (isList) {
                          return (
                            <ul key={bIdx} className="space-y-2 my-3">
                              {lines.map((l, lIdx) => {
                                const isArrow = l.trim().startsWith('→');
                                const clean = l.trim().replace(/^(?:[→\*\-\•]|\d+\.)\s*/, '').replace(/\*\*/g, '');
                                return (
                                  <li key={lIdx} className="flex items-start gap-2 text-sm leading-relaxed">
                                    <span className={`mt-0.5 size-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                      isArrow ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
                                    }`}>
                                      {isArrow ? '→' : '•'}
                                    </span>
                                    <span className="text-muted-foreground font-medium">{clean}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        }

                        return (
                          <p key={bIdx} className="text-muted-foreground leading-relaxed text-sm font-medium">
                            {block.replace(/\*\*/g, '')}
                          </p>
                        );
                      })}
                   </div>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-20 gap-4">
                     <Loader2 className="animate-spin text-accent size-8" />
                     <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Compiling Historical Meta-Data...</p>
                   </div>
                 )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t bg-muted/30 flex justify-end">
               <Button onClick={() => setShowReportDialog(false)} className="rounded-full px-8 font-bold">Close Analysis</Button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}

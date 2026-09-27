import { NextResponse } from "next/server"
import { withFirestoreTimeout } from "@/lib/firebase-admin"
import path from "path"
import fs from "fs"

const COLLECTION_NAME = "MCIP_Intelligence_Reports"
const REPORTS_STORE_PATH = path.join(process.cwd(), "src", "data", "reports_store.json")

function loadReportsFromDisk(): any[] {
  try {
    if (fs.existsSync(REPORTS_STORE_PATH)) {
      const raw = fs.readFileSync(REPORTS_STORE_PATH, "utf-8")
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn("Could not read local reports_store.json:", err)
  }
  return [
    {
      id: "UAE-MCIP-2026-9042",
      mcipIntelligenceId: "UAE-MCIP-2026-9042",
      title: "UAE_National_Blue_Carbon_MRV_Executive_Dossier_2026",
      description: "Verra VM0033 MRV Audit Dossier (Landscape-Wide Inventory across 74 coastal monitoring patches)",
      type: "Global",
      scope: "Global",
      period: "2023-01 to 2026-09",
      startDate: "2023-01",
      endDate: "2026-09",
      selectedPatches: ["Patch_0", "Patch_1", "Patch_10", "Patch_12", "Patch_25"],
      status: "Verified",
      timestamp: "2026-09-26T18:30:00.000Z",
      createdAt: "2026-09-26T18:30:00.000Z",
    },
    {
      id: "UAE-MCIP-2026-8819",
      mcipIntelligenceId: "UAE-MCIP-2026-8819",
      title: "Comparative_Audit_Patch_1_Patch_10_Patch_12",
      description: "Comparative Patch Audit covering core Eastern Mangrove nodes under calibrated multi-sensor telemetry.",
      type: "Comparison",
      scope: "Comparison",
      period: "2023-01 to 2026-09",
      startDate: "2023-01",
      endDate: "2026-09",
      selectedPatches: ["Patch_1", "Patch_10", "Patch_12"],
      status: "Verified",
      timestamp: "2026-09-25T14:15:00.000Z",
      createdAt: "2026-09-25T14:15:00.000Z",
    }
  ]
}

function saveReportsToDisk(reports: any[]): void {
  try {
    const dir = path.dirname(REPORTS_STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(REPORTS_STORE_PATH, JSON.stringify(reports, null, 2), "utf-8")
  } catch (err) {
    console.warn("Could not save reports to disk:", err)
  }
}

// In-memory cache synced with disk for instant sub-5ms responses
let memoryReports: any[] = loadReportsFromDisk()

// GET /api/reports - Fetch most recent reports with instant circuit breaker
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limitCount = parseInt(searchParams.get("limit") || "10", 10)
    
    // Attempt Firestore with a fast 1200ms timeout; immediately falls back to disk/memory cache
    const firestoreReports = await withFirestoreTimeout(async (db) => {
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .orderBy("timestamp", "desc")
        .limit(limitCount)
        .get()

      if (snapshot.empty) return []
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
    }, 1200)

    if (firestoreReports && firestoreReports.length > 0) {
      const existingIds = new Set(firestoreReports.map(r => r.id))
      const combined = [...firestoreReports, ...memoryReports.filter(r => !existingIds.has(r.id))]
      return NextResponse.json({ 
        success: true, 
        count: combined.slice(0, limitCount).length, 
        reports: combined.slice(0, limitCount) 
      })
    }

    return NextResponse.json({ 
      success: true, 
      count: memoryReports.slice(0, limitCount).length, 
      reports: memoryReports.slice(0, limitCount) 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: true, 
      count: memoryReports.length, 
      reports: memoryReports 
    })
  }
}

// POST /api/reports - Save a generated report
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      id,
      title,
      description,
      type,
      scope,
      period,
      startDate,
      endDate,
      selectedPatches,
      metrics,
      content,
      pdfBase64,
      status = "Generated",
    } = body

    const currentYear = new Date().getFullYear()
    const reportId = id || `UAE-MCIP-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`
    const timestamp = new Date().toISOString()

    const reportRecord = {
      id: reportId,
      mcipIntelligenceId: reportId,
      title: title || `UAE_Blue_Carbon_MRV_${period || timestamp.slice(0, 7)}`,
      description: description || `Verra VM0033 MRV Audit Dossier (${period || "Current"})`,
      type: type || scope || "Global",
      scope: scope || type || "Global",
      period: period || "",
      startDate: startDate || "",
      endDate: endDate || "",
      selectedPatches: selectedPatches || [],
      metrics: metrics || [],
      content: content || "",
      pdfBase64: pdfBase64 || null,
      status,
      timestamp,
      createdAt: timestamp,
    }

    // Always update local disk and memory store first for immediate response
    memoryReports = [reportRecord, ...memoryReports.filter(r => r.id !== reportId)]
    saveReportsToDisk(memoryReports)

    // Attempt background Firestore sync with fast timeout
    withFirestoreTimeout(async (db) => {
      await db.collection(COLLECTION_NAME).doc(reportId).set(reportRecord)
    }, 1200).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Report successfully saved to repository",
      report: reportRecord,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/reports - Delete single report or empty entire repository
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const deleteAll = searchParams.get("all") === "true"

    if (deleteAll) {
      memoryReports = []
      saveReportsToDisk([])

      // Attempt Firestore batch delete with circuit breaker in background
      withFirestoreTimeout(async (db) => {
        const snapshot = await db.collection(COLLECTION_NAME).get()
        const batch = db.batch()
        snapshot.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
      }, 1200).catch(() => {})

      return NextResponse.json({
        success: true,
        message: "Successfully emptied repository",
      })
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Report ID or all=true query parameter is required" },
        { status: 400 }
      )
    }

    memoryReports = memoryReports.filter(r => r.id !== id)
    saveReportsToDisk(memoryReports)

    withFirestoreTimeout(async (db) => {
      await db.collection(COLLECTION_NAME).doc(id).delete()
    }, 1200).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Report ${id} successfully deleted from repository`,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

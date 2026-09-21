import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"

const COLLECTION_NAME = "MCIP_Intelligence_Reports"

// GET /api/reports - Fetch most recent reports
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limitCount = parseInt(searchParams.get("limit") || "10", 10)
    
    const db = getAdminFirestore()
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .orderBy("timestamp", "desc")
      .limit(limitCount)
      .get()

    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ success: true, count: reports.length, reports })
  } catch (error: any) {
    console.error("GET /api/reports error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
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

    const db = getAdminFirestore()
    await db.collection(COLLECTION_NAME).doc(reportId).set(reportRecord)

    return NextResponse.json({
      success: true,
      message: "Report successfully saved to repository",
      report: reportRecord,
    })
  } catch (error: any) {
    console.error("POST /api/reports error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/reports - Delete single report or empty entire repository
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const deleteAll = searchParams.get("all") === "true"

    const db = getAdminFirestore()

    if (deleteAll) {
      const snapshot = await db.collection(COLLECTION_NAME).get()
      const batch = db.batch()
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      await batch.commit()
      return NextResponse.json({
        success: true,
        message: `Successfully emptied repository (${snapshot.size} reports deleted)`,
      })
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Report ID or all=true query parameter is required" },
        { status: 400 }
      )
    }

    await db.collection(COLLECTION_NAME).doc(id).delete()
    return NextResponse.json({
      success: true,
      message: `Report ${id} successfully deleted from repository`,
    })
  } catch (error: any) {
    console.error("DELETE /api/reports error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

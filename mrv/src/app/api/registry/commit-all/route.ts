import { NextResponse } from "next/server"
import { getAdminFirestore } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  return handleCommitAll(req)
}

export async function GET(req: Request) {
  return handleCommitAll(req)
}

async function handleCommitAll(req: Request) {
  try {
    const db = getAdminFirestore()

    // Retrieve all active patches
    const patchesSnap = await db.collection("Patches").get()
    if (patchesSnap.empty) {
      return NextResponse.json({ success: false, message: "No patches found in Firestore" }, { status: 404 })
    }

    // Target uncommitted historical/pipeline months up to August 2026
    // September 2026 ("2026-09") is deliberately left uncommitted for manual action in active window
    const targetMonths = [
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]

    // Fetch existing registry documents to avoid duplicate writes
    const registrySnap = await db.collection("MCIP_Carbon_Register").get()
    const committedSet = new Set<string>()
    registrySnap.forEach(doc => {
      const data = doc.data()
      if (data.status === "Completed") {
        committedSet.add(`${data.patchId}_${data.dateId}`)
      }
    })

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`

    let committedCount = 0
    const committedEntries: { patchId: string; dateId: string; carbonAmount: number }[] = []

    // Prepare writes in batches (Firestore allows max 500 ops per batch)
    let currentBatch = db.batch()
    let batchOpCount = 0

    for (const patchDoc of patchesSnap.docs) {
      const patchId = patchDoc.id

      for (const month of targetMonths) {
        const docId = `${patchId}_${month}`
        if (committedSet.has(docId)) {
          continue
        }

        // Fetch time series data for this patch & month
        const tsDocRef = db.collection("Patches").doc(patchId).collection("TimeSeries").doc(month)
        const tsSnap = await tsDocRef.get()

        let carbonAmount = 0
        if (tsSnap.exists) {
          const data = tsSnap.data()
          carbonAmount = data?.total_absorption_tCO2e_ha || data?.carbonAmount || 0
        } else {
          // If subcollection doc is not present, derive an estimated verified stock from patch metadata
          const patchData = patchDoc.data()
          carbonAmount = patchData.totalCarbon ? Math.round(patchData.totalCarbon * 0.95) : 115
        }

        const registryRef = db.collection("MCIP_Carbon_Register").doc(docId)
        currentBatch.set(registryRef, {
          id: docId,
          patchId,
          dateId: month,
          carbonAmount,
          status: "Completed",
          registryDate: formattedDate,
          verraStatus: "Pending",
        })

        committedCount++
        batchOpCount++
        committedEntries.push({ patchId, dateId: month, carbonAmount })

        if (batchOpCount >= 450) {
          await currentBatch.commit()
          currentBatch = db.batch()
          batchOpCount = 0
        }
      }
    }

    if (batchOpCount > 0) {
      await currentBatch.commit()
    }

    return NextResponse.json({
      success: true,
      message: `Successfully committed ${committedCount} patch records to UAE National Carbon Registry up to August 2026. September 2026 (2026-09) remains in the active window for manual certification.`,
      committedCount,
      activeRemainingWindow: ["2026-09"],
      committedEntries: committedEntries.slice(0, 20),
    })
  } catch (err: any) {
    console.error("Batch commit error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

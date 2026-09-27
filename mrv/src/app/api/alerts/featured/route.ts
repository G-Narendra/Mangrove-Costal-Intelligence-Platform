import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const DATA_PATH = path.join(process.cwd(), "src", "data", "featured_alerts.json")

function getAlertsFromFile(): any[] {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, "utf-8")
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error("Failed to read featured_alerts.json:", err)
  }
  return []
}

function saveAlertsToFile(alerts: any[]): void {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(alerts, null, 2), "utf-8")
  } catch (err) {
    console.error("Failed to write featured_alerts.json:", err)
  }
}

export async function GET() {
  const alerts = getAlertsFromFile()
  const activeAlerts = alerts.filter(a => a.status !== "RESOLVED" && !a.cleared)
  return NextResponse.json({
    success: true,
    count: activeAlerts.length,
    alerts: activeAlerts,
  })
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, status = "RESOLVED", cleared = true } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "Alert id is required" }, { status: 400 })
    }

    const alerts = getAlertsFromFile()
    const updatedAlerts = alerts.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status,
          cleared,
          clearedAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
        }
      }
      return a
    })

    saveAlertsToFile(updatedAlerts)

    return NextResponse.json({
      success: true,
      message: `Alert ${id} updated`,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

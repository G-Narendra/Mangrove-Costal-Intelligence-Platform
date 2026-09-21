import { NextRequest } from "next/server";
import { ai } from "@/ai/genkit";
import { z } from "genkit";

const GenerateReportSchema = z.object({
  type: z.enum(["Global", "Single", "Comparative"]),
  startDate: z.string(),
  endDate: z.string(),
  totalPatches: z.number().optional(),
  avgCarbon: z.number().optional(),
  metrics: z.array(z.object({
    patchId: z.string(),
    months: z.number(),
    pixels: z.number(),
    carbonStart: z.number(),
    carbonEnd: z.number(),
    carbonChange: z.number(),
    ndviStart: z.number(),
    ndviEnd: z.number(),
    ndviChange: z.number(),
    avgHeight: z.number().optional(),
    history: z.array(z.object({
      date: z.string(),
      avgCarbon: z.number(),
      avgNDVI: z.number(),
      avgHeight: z.number().optional(),
    })).optional(),
  })),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = GenerateReportSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid report parameters", details: parsed.error }, { status: 400 });
    }

    const { type, startDate, endDate, metrics, totalPatches, avgCarbon } = parsed.data;

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "Global") {
      systemPrompt = `You are the Lead Scientific Auditor for the UAE National Blue Carbon MRV Program.
Prepare an executive-level Verra VM0033 compliance narrative summarizing landscape-scale mangrove carbon dynamics.
Be rigorous, authoritative, concise, and direct. Aim for 300–450 words.
Structure your report into clear numbered sections:
1. EXECUTIVE SYNTHESIS & BASELINE ESTABLISHMENT
2. REGIONAL SEQUESTRATION DYNAMICS & BIOMASS ACCRETION
3. CANOPY VITALITY & PHENOLOGICAL INTEGRITY
4. VM0033 METHODOLOGICAL COMPLIANCE & RISK RECOMMENDATIONS`;

      const topThree = [...metrics].sort((a, b) => b.carbonEnd - a.carbonEnd).slice(0, 3);
      const topList = topThree.map(m => `${m.patchId} (Stock: ${m.carbonEnd.toFixed(2)} tCO2e/ha)`).join(", ");

      userPrompt = `Observation Period: ${startDate} to ${endDate}
Total Monitored Units: ${totalPatches || metrics.length} patches
Landscape Mean Carbon Stock: ${(avgCarbon || (metrics.length ? metrics.reduce((s, m) => s + m.carbonEnd, 0) / metrics.length : 0)).toFixed(2)} tCO2e/ha
Top Performing Units: ${topList}

Synthesize an agency-grade audit narrative evaluating baseline permanence, additionality indicators, and regional conservation status for UAE coastal wetlands.`;
    } else {
      const isSingle = type === "Single";
      systemPrompt = `You are a Senior Coastal Wetland Remote Sensing Scientist and Verra VM0033 Auditor.
Produce a comprehensive, publication-grade analytical interpretation for ${isSingle ? "a single monitoring unit" : "comparative monitoring units"}.
Be rigorous, data-driven, and actionable. Aim for 300–500 words.
Structure your analysis into numbered sections:
1. EMPIRICAL BASELINE & SEQUESTRATION TRAJECTORY
2. VEGETATION VITALITY & CANOPY STRUCTURAL INTEGRITY
3. DISTURBANCE ANALYSIS & ANOMALY SIGNALS
4. METHODOLOGICAL COMPLIANCE & AUDIT DIRECTIVES`;

      const patchSummaries = metrics.map(m => {
        const hList = (m.history || []).slice(-6).map(h => `${h.date}: C=${h.avgCarbon.toFixed(2)} tCO2e/ha, NDVI=${h.avgNDVI.toFixed(3)}`).join(" | ");
        return `Unit: ${m.patchId}
- Observations: ${m.months} months, ${m.pixels} evidence pixels
- Carbon: Start=${m.carbonStart.toFixed(2)}, End=${m.carbonEnd.toFixed(2)}, Net Delta=${m.carbonChange >= 0 ? "+" : ""}${m.carbonChange.toFixed(2)} tCO2e/ha
- NDVI: Start=${m.ndviStart.toFixed(3)}, End=${m.ndviEnd.toFixed(3)}, Net Delta=${m.ndviChange >= 0 ? "+" : ""}${m.ndviChange.toFixed(3)}
- Recent Trajectory: ${hList || "Steady state"}`;
      }).join("\n\n");

      userPrompt = `Monitoring Period: ${startDate} to ${endDate}
Audit Scope: ${isSingle ? "Single Patch Deep-Dive" : "Comparative Multi-Unit Audit"}

Empirical Sensor Records:
${patchSummaries}

Provide an agency-grade MRV evaluation detailing carbon accretion/depletion, canopy vigor, anomaly explanations, and actionable field directives.`;
    }

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const models = [
      "googleai/gemini-3.1-flash-lite",
      "googleai/gemini-3.5-flash-lite",
      "googleai/gemini-2.5-flash",
      "googleai/gemini-flash-latest",
    ];

    let lastError: unknown;
    for (const model of models) {
      try {
        const response = await ai.generate({ model, prompt: fullPrompt });
        const narrative = response.text?.trim();
        if (narrative) {
          return Response.json({ narrative }, {
            headers: {
              "X-Content-Type-Options": "nosniff",
              "Cache-Control": "no-store",
            },
          });
        }
      } catch (aiError) {
        lastError = aiError;
        console.warn(`[ReportGen] Model ${model} failed; trying next fallback.`);
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    console.error("[ReportGen] All models failed:", lastError);
    return Response.json({
      error: "AI generation temporarily unavailable",
      narrative: null,
    }, { status: 503 });

  } catch (err: any) {
    console.error("[ReportGen Route Error]:", err);
    return Response.json({ error: err.message || "Failed to generate report narrative" }, { status: 500 });
  }
}

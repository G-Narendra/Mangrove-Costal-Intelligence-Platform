'use server';
/**
 * @fileOverview Generates professional, high-level system-wide coastal audit reports.
 *
 * - generateSystemAudit - Generates a comprehensive summary based on global landscape stats.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SystemAuditInputSchema = z.object({
  totalPatches: z.number().describe('Total number of patches in the system.'),
  avgCarbon: z.number().describe('Average carbon stock across all patches (tCO2e/ha).'),
  dateRange: z.string().describe('The temporal range covered by the audit (e.g., 2021-2026).'),
  topPatches: z.array(z.object({
    id: z.string(),
    carbon: z.number()
  })).describe('List of the highest-performing patches and their metrics.'),
});
export type SystemAuditInput = z.infer<typeof SystemAuditInputSchema>;

// Use an object wrapper so Gemini returns valid structured JSON.
// A bare z.string() output schema causes the model to return null when outputting prose.
const SystemAuditOutputSchema = z.object({
  report: z.string().describe('The formatted professional audit report text.'),
});
export type SystemAuditOutput = string;

export async function generateSystemAudit(input: SystemAuditInput): Promise<SystemAuditOutput> {
  const result = await systemAuditFlow(input);
  return result.report;
}

const auditPrompt = ai.definePrompt({
  name: 'systemAuditPrompt',
  input: { schema: SystemAuditInputSchema },
  output: { schema: SystemAuditOutputSchema },
  prompt: `Generate a professional, formal coastal audit report for the UAE National Blue Carbon Program.

Context: This report covers the audit period {{{dateRange}}}, using Sentinel-1/2 multispectral and SAR data combined with NASA GEDI LiDAR canopy measurements.

IMPORTANT: Base your analysis ONLY on the data period stated above ({{{dateRange}}}). Do NOT reference any data period outside this range. If only a short period is covered, analyse it accurately as an early-stage snapshot without speculating about longer timeframes.

Global Statistics:
- Total Patches Monitored: {{{totalPatches}}}
- Average Carbon Stock: {{{avgCarbon}}} tCO2e/ha
- Audit Period: {{{dateRange}}}

Champion Nodes (Top Performance):
{{#each topPatches}}
- {{{id}}}: {{{carbon}}} tCO2e/ha
{{/each}}

The report must include these four sections:
1. EXECUTIVE SUMMARY: A high-level overview of ecosystem health and sequestration progress for the stated period, explicitly referencing the performance of all {{{totalPatches}}} patches across the landscape.
2. LANDSCAPE PERFORMANCE REVIEW: Technical analysis of growth trends and structural stability across the entire monitored network based on available data.
3. CHAMPION NODES & AUDIT: Highlight the top 5 performing patches and evaluate the entire network against national carbon goals.
4. STRATEGIC RECOMMENDATIONS: 3 actionable points for the next operational quarter.

Tone: Professional, authoritative, scientific, and executive-level. Use British English conventions common in the UAE (e.g., "hectares", "metres"). Return the full report as a single formatted text block in the "report" field.`,
});

const auditFallbackPrompt = ai.definePrompt({
  name: 'systemAuditFallbackPrompt',
  model: 'googleai/gemini-3.1-flash-lite',
  input: { schema: SystemAuditInputSchema },
  output: { schema: SystemAuditOutputSchema },
  prompt: `Write a concise evidence-led UAE blue-carbon landscape audit for {{{dateRange}}}.
Use only the supplied values. Do not invent trends, causes, targets, or external events.
Include these headings: EXECUTIVE SUMMARY, LANDSCAPE PERFORMANCE REVIEW, CHAMPION NODES & AUDIT, STRATEGIC RECOMMENDATIONS.
State that the dossier is remote-sensing evidence for MRV review and requires field measurements, baseline/additionality, uncertainty, permanence, leakage and independent VVB review before credit issuance.
Total patches: {{{totalPatches}}}. Average carbon: {{{avgCarbon}}} tCO2e/ha.
Top patches:
{{#each topPatches}}- {{{id}}}: {{{carbon}}} tCO2e/ha
{{/each}}`,
});

function isTemporaryModelFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /503|UNAVAILABLE|high demand|temporar|rate limit|429/i.test(message);
}

const systemAuditFlow = ai.defineFlow(
  {
    name: 'systemAuditFlow',
    inputSchema: SystemAuditInputSchema,
    outputSchema: SystemAuditOutputSchema,
  },
  async (input) => {
    let lastError: unknown;
    for (const candidate of [auditPrompt, auditFallbackPrompt]) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { output } = await candidate(input);
          if (output?.report) return output;
        } catch (error) {
          lastError = error;
          if (!isTemporaryModelFailure(error)) throw error;
          await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
        }
      }
    }
    console.error('[Reports] All language models failed', lastError);
    return {
      report: `EXECUTIVE SUMMARY
This ${input.dateRange} landscape audit covers ${input.totalPatches} monitored patches with an average observed carbon stock of ${input.avgCarbon.toFixed(2)} tCO2e/ha.

LANDSCAPE PERFORMANCE REVIEW
The supplied evidence is limited to the reported aggregate values and champion-node ranking. No unsupported causal interpretation is made.

CHAMPION NODES & AUDIT
${input.topPatches.map(patch => `${patch.id}: ${patch.carbon.toFixed(2)} tCO2e/ha`).join('\n')}

STRATEGIC RECOMMENDATIONS
1. Reconcile remote-sensing observations with field measurements and QA/QC records.
2. Attach baseline, additionality, uncertainty, permanence and leakage evidence.
3. Submit the completed monitoring package to an independent approved VVB before credit issuance.`,
    };
  }
);

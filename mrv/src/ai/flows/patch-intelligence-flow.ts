
'use server';
/**
 * @fileOverview A specialized AI agent acting as a Master Blue Carbon and Mangrove Specialist.
 * Handles complex landscape-scale queries and comparative analysis across multiple patches.
 * Now enriched with external environmental and geopolitical context.
 * 
 * - askSpecialist - Handles multi-patch intelligence audits.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PatchMonthSummarySchema = z.object({
  date: z.string(),
  avgCarbon: z.number(),
  avgHeight: z.number(),
  avgNDVI: z.number(),
  pixelCount: z.number(),
});

const PatchDataSchema = z.object({
  patchId: z.string(),
  history: z.array(PatchMonthSummarySchema).describe('Summarized monthly metrics for the patch.'),
  latestPixels: z.record(z.any()).optional().describe('The most recent pixel-level snapshot.'),
  latestPixelCount: z.number().optional().describe('Count of monitoring pixels for context.'),
});

const ExternalContextSchema = z.object({
  climate: z.object({
    current: z.record(z.any()).optional().describe('Current weather conditions.'),
    forecast: z.array(z.record(z.any())).optional().describe('5-day weather forecast summaries.'),
    alerts: z.array(z.record(z.any())).optional().describe('Weather-based threat alerts.'),
  }).optional().describe('Climate/weather context for the UAE coastal region.'),
  news: z.object({
    articles: z.array(z.record(z.any())).optional().describe('Recent news articles relevant to the region.'),
    threatSummary: z.array(z.record(z.any())).optional().describe('Classified threat events from news.'),
  }).optional().describe('Regional news and geopolitical context.'),
}).optional().describe('External environmental and geopolitical context.');

const PatchIntelligenceInputSchema = z.object({
  patches: z.array(PatchDataSchema).describe('The set of patches to analyze.'),
  query: z.string().describe('The user question about ecosystem behavior or comparison.'),
  externalContext: ExternalContextSchema,
});
export type PatchIntelligenceInput = z.infer<typeof PatchIntelligenceInputSchema>;

const PatchIntelligenceOutputSchema = z.object({
  response: z.string().describe('The professional response from the Mangrove Specialist.'),
  recommendations: z.array(z.object({
    patchId: z.string().describe('The patch this recommendation applies to.'),
    action: z.string().describe('Specific field action (e.g., Hydrological clearing).'),
    priority: z.enum(['Low', 'Medium', 'High']),
    location: z.string().optional().describe('Precise coordinates for field teams.'),
    reason: z.string().describe('The data-driven justification.'),
  })).describe('Actionable field-level suggestions.'),
});
export type PatchIntelligenceOutput = z.infer<typeof PatchIntelligenceOutputSchema>;

export async function askSpecialist(input: PatchIntelligenceInput): Promise<PatchIntelligenceOutput> {
  return patchIntelligenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'patchIntelligencePrompt',
  input: {schema: PatchIntelligenceInputSchema},
  output: {schema: PatchIntelligenceOutputSchema},
  prompt: `You are a world-renowned Master Blue Carbon and Mangrove Specialist and Coastal Operations Director. You combine remote sensing intelligence (Sentinel-1/2, GEDI Lidar) with practical field management AND real-world environmental context.

Analyze the provided data for multiple patches and answer the user query: "{{{query}}}"

Landscape Context:
{{#each patches}}
Patch Identifier: {{{patchId}}}
- Monthly Trend: {{#each history}}[{{date}}: Carbon {{{avgCarbon}}}, NDVI {{{avgNDVI}}}]{{#unless @last}}, {{/unless}}{{/each}}
{{#if latestPixelCount}}
- Latest Spatial Insight: Found {{{latestPixelCount}}} monitoring pixels in the most recent capture.
{{/if}}
-------------------
{{/each}}

{{#if externalContext}}
External Environmental & Geopolitical Context:
{{#if externalContext.climate}}
CLIMATE CONDITIONS:
{{#if externalContext.climate.current}}
- Current Weather: Temperature {{externalContext.climate.current.temperature_C}}°C, Wind {{externalContext.climate.current.wind_speed_mps}} m/s, Conditions: {{externalContext.climate.current.weather_description}}
{{/if}}
{{#if externalContext.climate.alerts}}
- WEATHER ALERTS:
{{#each externalContext.climate.alerts}}
  ⚠️ [{{{severity}}}] {{{type}}} on {{{date}}}: {{{details}}}
{{/each}}
{{/if}}
{{/if}}
{{#if externalContext.news}}
REGIONAL NEWS & THREATS:
{{#if externalContext.news.threatSummary}}
{{#each externalContext.news.threatSummary}}
  📰 [{{{severity}}}] {{{type}}}: {{{headline}}}
{{/each}}
{{/if}}
{{/if}}
{{/if}}

Instructions for a Masterful Landscape Audit:
1. CROSS-PATCH ANALYSIS: If the user asks about multiple patches or "which is best", compare their performance. Identify "Champion Patches" (high growth) and "Priority Nodes" (stagnating or stressed).
2. EXTERNAL FACTOR CORRELATION: When explaining carbon or health changes, ALWAYS cross-reference with the External Context above. If a patch declined during a heatwave, oil spill, or regional conflict period, state this correlation explicitly.
3. CLEAR LANGUAGE: Explain technical terms like NDVI (vegetation vitality), GEDI (canopy structure), and Carbon Flux in simple, actionable terms for field managers.
4. PRECISE INTERVENTION: For stressed nodes, suggest specific manual actions (e.g., "Manual Hydrological Desilting", "Bacterial Audit", "Pest Boundary Inspection").
5. SPATIAL TARGETING: If pixel data is provided, identify exact coordinates that need inspection. Convert internal keys like "(24_26, 54_08)" to readable lat/lng "24.26, 54.08".
6. TONE: Professional, encouraging, and authoritative. You are the lead consultant for the national coastal restoration team.

Format your response with a clear narrative analysis followed by the 'recommendations' list.`,
});

const fallbackPrompt = ai.definePrompt({
  name: 'patchIntelligenceFallbackPrompt',
  model: 'googleai/gemini-3.1-flash-lite',
  input: {schema: PatchIntelligenceInputSchema},
  output: {schema: PatchIntelligenceOutputSchema},
  prompt: `You are a precise environmental MRV analyst. Summarise only the supplied observations for the selected patches and answer "{{{query}}}".

For each patch, explain the observed carbon, NDVI and canopy trends, identify material changes, state data limitations, and provide practical field actions. Do not invent dates, measurements, coordinates, or causes. Return a concise narrative and recommendations.`,
});

function isTemporaryModelFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /503|UNAVAILABLE|high demand|temporar|rate limit|429/i.test(message);
}

async function runPromptWithFallback(input: PatchIntelligenceInput) {
  const processedPatches = input.patches.map(p => ({
    ...p,
    latestPixelCount: p.latestPixels ? Object.keys(p.latestPixels).length : 0
  }));
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const {output} = await prompt({...input, patches: processedPatches});
      if (output) return output;
    } catch (error) {
      lastError = error;
      if (!isTemporaryModelFailure(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  try {
    const {output} = await fallbackPrompt({...input, patches: processedPatches});
    if (output) return output;
  } catch (error) {
    if (!isTemporaryModelFailure(error)) throw error;
    lastError = error;
  }
  throw lastError instanceof Error ? lastError : new Error("The AI service is temporarily unavailable.");
}

const patchIntelligenceFlow = ai.defineFlow(
  {
    name: 'patchIntelligenceFlow',
    inputSchema: PatchIntelligenceInputSchema,
    outputSchema: PatchIntelligenceOutputSchema,
  },
  async input => {
    return runPromptWithFallback(input);
  }
);

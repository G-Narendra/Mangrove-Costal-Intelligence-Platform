'use server';
/**
 * @fileOverview A Genkit flow for generating an AI-powered summary of a coastal project.
 *
 * - generateProjectSummary - A function that handles the project summary generation process.
 * - ProjectSummaryInput - The input type for the generateProjectSummary function.
 * - ProjectSummaryOutput - The return type for the generateProjectSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProjectSummaryInputSchema = z.object({
  projectName: z.string().describe('The name of the coastal project.'),
  status: z
    .string()
    .describe('The current operational status of the project (e.g., Planning, Active, Completed, On Hold).'),
  kpis: z.object({
    totalBlueCarbon: z.number().describe('Total amount of blue carbon sequestered in metric tons.'),
    totalMangroveArea: z.number().describe('Total area of mangroves planted or restored in hectares.'),
    totalSeagrassArea: z.number().describe('Total area of seagrass restored in hectares.'),
    ecosystemHealthScore: z
      .number()
      .min(0)
      .max(100)
      .describe('An overall score from 0-100 indicating the health of the ecosystem.'),
  }),
  environmentalImpact: z.object({
    fishNurseryScore: z
      .number()
      .min(0)
      .max(100)
      .describe('Score reflecting the health and productivity of fish nurseries (0-100).'),
    communitiesBenefited: z.array(z.string()).describe('List of communities that have benefited from the project.'),
    heritageSitesProtected: z.array(z.string()).describe('List of heritage sites protected by the project.'),
    accessStatus: z.string().describe('Status of community access to protected areas (e.g., Open, Restricted, Educational Access).'),
  }),
  challenges: z.array(z.string()).optional().describe('Optional: A list of current challenges or obstacles faced by the project.'),
  achievements: z.array(z.string()).optional().describe('Optional: A list of key achievements or milestones of the project.'),
});
export type ProjectSummaryInput = z.infer<typeof ProjectSummaryInputSchema>;

const ProjectSummaryOutputSchema = z
  .string()
  .describe('A concise, AI-powered summary of the coastal project.');
export type ProjectSummaryOutput = z.infer<typeof ProjectSummaryOutputSchema>;

export async function generateProjectSummary(
  input: ProjectSummaryInput
): Promise<ProjectSummaryOutput> {
  return projectSummaryFlow(input);
}

const projectSummaryPrompt = ai.definePrompt({
  name: 'projectSummaryPrompt',
  input: {schema: ProjectSummaryInputSchema},
  output: {schema: ProjectSummaryOutputSchema},
  prompt: `Generate a concise, AI-powered summary of the coastal project named '{{{projectName}}}'.

The summary should cover its current status, key performance indicators (KPIs), and environmental impact.
Aim for a professional tone suitable for various audiences.

Project Details:
- Name: {{{projectName}}}
- Current Status: {{{status}}}

Key Performance Indicators (KPIs):
- Total Blue Carbon: {{{kpis.totalBlueCarbon}}} metric tons
- Total Mangrove Area: {{{kpis.totalMangroveArea}}} hectares
- Total Seagrass Area: {{{kpis.totalSeagrassArea}}} hectares
- Ecosystem Health Score: {{{kpis.ecosystemHealthScore}}}/100

Environmental Impact:
- Fish Nursery Score: {{{environmentalImpact.fishNurseryScore}}}/100
- Communities Benefited: {{#each environmentalImpact.communitiesBenefited}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Heritage Sites Protected: {{#each environmentalImpact.heritageSitesProtected}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Access Status: {{{environmentalImpact.accessStatus}}}

{{#if challenges}}
Challenges:
{{#each challenges}}- {{{this}}}
{{/each}}
{{/if}}

{{#if achievements}}
Achievements:
{{#each achievements}}- {{{this}}}
{{/each}}
{{/if}}

Provide a summary of approximately 150-200 words.`,
});

const projectSummaryFlow = ai.defineFlow(
  {
    name: 'projectSummaryFlow',
    inputSchema: ProjectSummaryInputSchema,
    outputSchema: ProjectSummaryOutputSchema,
  },
  async input => {
    const {output} = await projectSummaryPrompt(input);
    return output!;
  }
);

'use server';
/**
 * @fileOverview Provides an AI-generated natural language explanation of key factors
 * influencing predicted carbon levels for a project, helping coastal managers
 * quickly grasp complex model insights.
 *
 * - explainCarbonPrediction - A function that handles the carbon prediction explanation process.
 * - AiCarbonPredictionExplanationInput - The input type for the explainCarbonPrediction function.
 * - AiCarbonPredictionExplanationOutput - The return type for the explainCarbonPrediction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiCarbonPredictionExplanationInputSchema = z.object({
  predictedCarbon: z
    .number()
    .describe('The predicted blue carbon level for the project.'),
  uncertainty: z
    .number()
    .describe('The uncertainty associated with the predicted carbon level (as a percentage).'),
  canopyHeight: z
    .number()
    .describe('The average canopy height of the ecosystem in meters.'),
  soilMoisture: z
    .number()
    .describe('The soil moisture content (as a percentage).'),
  tidalConnectivity: z
    .number()
    .describe('An index representing the level of tidal connectivity.'),
  sedimentProximity: z
    .number()
    .describe('The proximity to sediment sources in meters.'),
});
export type AiCarbonPredictionExplanationInput = z.infer<
  typeof AiCarbonPredictionExplanationInputSchema
>;

const AiCarbonPredictionExplanationOutputSchema = z.string().describe(
  'A natural language explanation of the key factors influencing the predicted carbon levels.'
);
export type AiCarbonPredictionExplanationOutput = z.infer<
  typeof AiCarbonPredictionExplanationOutputSchema
>;

export async function explainCarbonPrediction(
  input: AiCarbonPredictionExplanationInput
): Promise<AiCarbonPredictionExplanationOutput> {
  return aiCarbonPredictionExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiCarbonPredictionExplanationPrompt',
  input: {schema: AiCarbonPredictionExplanationInputSchema},
  output: {schema: AiCarbonPredictionExplanationOutputSchema},
  prompt: `As an expert in coastal ecosystem carbon sequestration models, provide a concise, natural language explanation of the key factors influencing the predicted blue carbon levels for a project, based on the following data:

Predicted Carbon: {{{predictedCarbon}}} tons
Uncertainty: {{{uncertainty}}}%
Canopy Height: {{{canopyHeight}}} meters
Soil Moisture: {{{soilMoisture}}}%
Tidal Connectivity: {{{tidalConnectivity}}} (index)
Sediment Proximity: {{{sedimentProximity}}} meters

Focus on how each factor contributes to the prediction and its implications for blue carbon storage. Structure your explanation clearly, starting with an overall summary of the predicted carbon and then discussing each contributing factor.`,
});

const aiCarbonPredictionExplanationFlow = ai.defineFlow(
  {
    name: 'aiCarbonPredictionExplanationFlow',
    inputSchema: AiCarbonPredictionExplanationInputSchema,
    outputSchema: AiCarbonPredictionExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

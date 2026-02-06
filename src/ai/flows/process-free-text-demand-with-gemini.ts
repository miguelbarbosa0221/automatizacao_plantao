'use server';

/**
 * @fileOverview Processes free-text IT support demands using Gemini to extract structured information.
 *
 * This file defines a Genkit flow that takes a free-text description of an IT issue,
 * uses the Gemini API to extract a title, detailed description, and suggested resolution,
 * and returns these structured elements.
 *
 * @exports processFreeTextDemandWithGemini - The main function to process the free-text demand.
 * @exports ProcessFreeTextDemandWithGeminiInput - The input type for the processFreeTextDemandWithGemini function.
 * @exports ProcessFreeTextDemandWithGeminiOutput - The output type for the processFreeTextDemandWithGemini function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessFreeTextDemandWithGeminiInputSchema = z.object({
  freeText: z.string().describe('Free-text description of the IT support demand.'),
});

export type ProcessFreeTextDemandWithGeminiInput = z.infer<
  typeof ProcessFreeTextDemandWithGeminiInputSchema
>;

const ProcessFreeTextDemandWithGeminiOutputSchema = z.object({
  title: z.string().describe('A concise title summarizing the IT support demand.'),
  description: z
    .string()
    .describe('A detailed technical description of the IT support demand.'),
  resolution: z
    .string()
    .describe('A suggested resolution for the IT support demand.'),
});

export type ProcessFreeTextDemandWithGeminiOutput = z.infer<
  typeof ProcessFreeTextDemandWithGeminiOutputSchema
>;

export async function processFreeTextDemandWithGemini(
  input: ProcessFreeTextDemandWithGeminiInput
): Promise<ProcessFreeTextDemandWithGeminiOutput> {
  return processFreeTextDemandWithGeminiFlow(input);
}

const processFreeTextDemandPrompt = ai.definePrompt({
  name: 'processFreeTextDemandPrompt',
  input: {schema: ProcessFreeTextDemandWithGeminiInputSchema},
  output: {schema: ProcessFreeTextDemandWithGeminiOutputSchema},
  prompt: `You are an AI assistant specialized in processing IT support demands.
  Given a free-text description of a demand, your task is to extract the following information:

  - title: A concise title summarizing the demand.
  - description: A detailed technical description of the demand.
  - resolution: A suggested resolution for the demand.

  Free-text description: {{{freeText}}}

  Provide the output in a structured format.  The "description" field should describe steps taken to diagnose the problem and the root cause discovered.  The "resolution" field should explain what actions must be taken to resolve the problem.
`,
});

const processFreeTextDemandWithGeminiFlow = ai.defineFlow(
  {
    name: 'processFreeTextDemandWithGeminiFlow',
    inputSchema: ProcessFreeTextDemandWithGeminiInputSchema,
    outputSchema: ProcessFreeTextDemandWithGeminiOutputSchema,
  },
  async input => {
    const {output} = await processFreeTextDemandPrompt(input);
    return output!;
  }
);

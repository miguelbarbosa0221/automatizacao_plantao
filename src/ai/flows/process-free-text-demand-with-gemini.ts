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
  prompt: `Você é um assistente de IA especializado em processar demandas de suporte de TI.
  Sua tarefa é extrair e estruturar informações de um texto livre fornecido pelo usuário.

  IMPORTANT: Todas as respostas (título, descrição e resolução) DEVEM ser escritas em Português do Brasil (pt-BR).

  Informações a extrair:
  - title: Um título conciso que resume a demanda.
  - description: Uma descrição técnica detalhada da demanda, focando no problema relatado.
  - resolution: Uma sugestão de resolução ou os passos tomados para resolver o problema.

  Descrição em texto livre: {{{freeText}}}

  Forneça a saída em formato estruturado. O campo "description" deve descrever o problema de forma técnica. O campo "resolution" deve explicar quais ações foram ou devem ser tomadas para resolver o problema.
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

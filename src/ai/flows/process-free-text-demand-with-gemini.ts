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
    .describe('A brief technical summary of the problem.'),
  resolution: z
    .string()
    .describe('A short summary of the resolution steps.'),
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
  prompt: `Você é um assistente de IA especializado em processar chamados de suporte de TI.
  Sua tarefa é extrair informações de um texto livre e gerar um resumo extremamente CONCISO.

  REGRAS OBRIGATÓRIAS:
  1. Idioma: Use exclusivamente Português do Brasil (pt-BR).
  2. Concisão: Seja o mais breve possível. Evite frases longas ou explicativas.
  3. Título: Máximo de 8 palavras. Deve ser direto ao ponto (ex: "Troca de Toner - Impressora 2º Andar").
  4. Descrição: Resuma o problema técnico em uma ou duas frases curtas.
  5. Resolução: Resuma a ação tomada de forma objetiva.

  Texto livre para processar: {{{freeText}}}

  Forneça a saída estruturada sem preâmbulos ou saudações.
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

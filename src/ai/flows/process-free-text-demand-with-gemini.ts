'use server';

/**
 * @fileOverview Processes free-text and structured IT support demands using Gemini.
 *
 * This file defines a Genkit flow that takes a description of an IT issue,
 * extracts/summarizes it into a title, technical description, and resolution.
 *
 * @exports processFreeTextDemandWithGemini - The main function to process the demand.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessFreeTextDemandWithGeminiInputSchema = z.object({
  freeText: z.string().describe('Texto livre ou estruturado da demanda de suporte de TI.'),
});

export type ProcessFreeTextDemandWithGeminiInput = z.infer<
  typeof ProcessFreeTextDemandWithGeminiInputSchema
>;

const ProcessFreeTextDemandWithGeminiOutputSchema = z.object({
  title: z.string().describe('Um título conciso resumindo a demanda.'),
  description: z
    .string()
    .describe('Um resumo técnico breve do problema.'),
  resolution: z
    .string()
    .describe('Um resumo curto dos passos de resolução.'),
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
  prompt: `Você é um assistente de IA especializado em suporte de TI (Service Desk).
  Sua tarefa é processar os dados fornecidos e gerar um resumo extremamente CONCISO.

  REGRAS DE CONTEÚDO:
  1. Idioma: Português do Brasil (pt-BR).
  2. Título: Máximo de 8 palavras. Se houver um campo "ASSUNTO" ou "LOCALIZAÇÃO" no texto, use-os para compor o título (ex: "Lentidão Sistema - Unidade Central").
  3. Descrição Técnica: Resuma o problema em uma ou duas frases curtas e profissionais.
  4. Resolução: Resuma a ação tomada de forma direta.

  IMPORTANTE: O texto abaixo pode conter rótulos como "ASSUNTO:", "LOCALIZAÇÃO:", "DETALHES:". Use TODAS essas informações para construir a resposta. Não ignore o que estiver escrito em "ASSUNTO".

  Texto para processar: 
  {{{freeText}}}

  Forneça a saída estruturada sem preâmbulos.
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

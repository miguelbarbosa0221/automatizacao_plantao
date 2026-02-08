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
    .describe('Um relato do problema na persona de um usuário final.'),
  resolution: z
    .string()
    .describe('Um resumo técnico curto dos passos de resolução.'),
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
  Sua tarefa é processar os dados fornecidos e gerar um resumo extremamente CONCISO e em PORTUGUÊS (pt-BR).

  REGRAS DE CONTEÚDO:
  1. Idioma: Português do Brasil (pt-BR).
  2. Título: Gere um título estritamente TÉCNICO e PROFISSIONAL baseado na classificação (Categoria/Subcategoria/Item). Máximo de 8 palavras. (Ex: "Manutenção Preventiva - Estação de Trabalho").
  3. Descrição: Adote a persona de um 'USUÁRIO FINAL' relatando o problema de forma simples e leiga, como se estivesse abrindo o chamado. (Ex: "Minha tela ficou preta e não consigo acessar os sistemas").
  4. Resolução: Resuma a ação técnica tomada de forma direta e concisa.

  IMPORTANTE: O texto abaixo pode conter rótulos como "LOCALIZAÇÃO:", "CATEGORIA:", "SUBCATEGORIA:", "ITEM:", "INFORMAÇÃO LIVRE:", "DETALHES:". 
  Use TODAS essas informações para construir a resposta mais precisa possível. O campo "INFORMAÇÃO LIVRE" deve ser usado para entender o contexto do relato do usuário.

  Texto para processar: 
  {{{freeText}}}

  Forneça a saída estruturada em português, sem preâmbulos.
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

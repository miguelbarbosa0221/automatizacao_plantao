'use server';

/**
 * @fileOverview Processa demandas de suporte de TI utilizando Gemini com persona de Service Desk.
 *
 * Este fluxo transforma relatos brutos em documentação técnica profissional,
 * utilizando o contexto de localização e taxonomia para enriquecer os detalhes.
 *
 * @exports processFreeTextDemandWithGemini - Função principal de processamento.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessFreeTextDemandWithGeminiInputSchema = z.object({
  freeText: z.string().describe('Texto livre ou estruturado contendo contexto da demanda.'),
});

export type ProcessFreeTextDemandWithGeminiInput = z.infer<
  typeof ProcessFreeTextDemandWithGeminiInputSchema
>;

const ProcessFreeTextDemandWithGeminiOutputSchema = z.object({
  title: z.string().describe('Título técnico e profissional conciso.'),
  description: z
    .string()
    .describe('Relato do problema na persona de um usuário final sério.'),
  resolution: z
    .string()
    .describe('Passos técnicos de resolução em português formal.'),
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
  prompt: `Você é um Analista de Service Desk Sênior especializado em documentação técnica.
  Sua tarefa é transformar os dados brutos de um atendimento em um relatório profissional e formal em PORTUGUÊS (pt-BR).

  DIRETRIZES DE PERSONA:
  1. TÍTULO: Deve ser estritamente técnico e objetivo. Use substantivos concretos (Ex: "Falha de Conectividade em Impressora Térmica" ou "Manutenção em Estação de Trabalho").
  2. DESCRIÇÃO: Adote a persona de um "USUÁRIO FINAL" relatando o problema. O texto deve ser sério, detalhado e explicar o impacto do problema nas atividades. Use as informações de Categoria/Subcategoria para inferir detalhes lógicos (Ex: Se for Hardware/Mouse, mencione falha de cursor ou clique).
  3. RESOLUÇÃO: Descreva a ação técnica tomada de forma direta, usando verbos no infinitivo ou particípio, com linguagem formal de TI.

  ESTRUTURA DE ENTRADA:
  O texto recebido conterá rótulos como LOCALIZAÇÃO, CATEGORIA, SUBCATEGORIA, ITEM e DETALHES. 
  Use a LOCALIZAÇÃO e a CATEGORIA para dar contexto ao relatório.

  ENTRADA: 
  {{{freeText}}}

  REQUISITO FINAL: Forneça apenas a saída estruturada JSON, sem explicações. Linguagem: Português formal (Brasil).
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

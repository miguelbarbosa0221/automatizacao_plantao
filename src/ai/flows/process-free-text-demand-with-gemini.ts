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
  prompt: `Você é um Analista de Service Desk Sênior especializado em documentação técnica de TI.
  Sua tarefa é transformar os dados brutos de um atendimento em um relatório profissional e formal em PORTUGUÊS (pt-BR).

  DIRETRIZES DE PERSONA:
  1. TÍTULO: Deve ser estritamente técnico e objetivo. Use substantivos concretos (Ex: "Instabilidade em Link de Dados Primário" ou "Substituição de Unidade de Fusão de Impressora").
  
  2. DESCRIÇÃO: Adote a persona de um "USUÁRIO FINAL" sério relatando o problema. O texto deve detalhar o impacto nas atividades e o comportamento observado do erro. Use a CATEGORIA e o ITEM para dar realismo técnico ao relato.

  3. RESOLUÇÃO: Descreva a ação técnica de forma direta e formal. 
     REGRA CRÍTICA: Se o campo "AÇÃO" na entrada estiver vazio, vago (ex: "resolvido") ou incompleto, você DEVE PROPOR uma resolução técnica plausível e detalhada baseada na CATEGORIA, SUBCATEGORIA e ITEM informados.
     - Não use frases genéricas.
     - Use verbos no infinitivo ou particípio (Ex: "Efetuada limpeza de registros", "Realizada reconfiguração de gateway", "Procedido com a troca de tonner e limpeza de roletes").
     - Se for Hardware, mencione troca ou testes físicos. Se for Software, mencione configurações ou reinstalações.

  ESTRUTURA DE ENTRADA:
  O texto recebido contém rótulos como LOCALIZAÇÃO, CATEGORIA, SUBCATEGORIA, ITEM, DETALHES e AÇÃO. 

  ENTRADA: 
  {{{freeText}}}

  REQUISITO FINAL: Forneça apenas a saída estruturada JSON, sem explicações adicionais. Linguagem: Português formal (Brasil).
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

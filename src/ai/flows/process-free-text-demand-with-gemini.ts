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
  Sua tarefa é transformar os dados brutos de um atendimento em um relatório profissional, formal e detalhado em PORTUGUÊS (pt-BR).

  DIRETRIZES DE ENRIQUECIMENTO TOTAL:
  Você deve usar a LOCALIZAÇÃO, CATEGORIA, SUBCATEGORIA e ITEM para preencher qualquer lacuna de informação nos campos de saída. Se o usuário forneceu dados vagos, você DEVE deduzir ações e comportamentos técnicos plausíveis.

  1. TÍTULO: 
     - Deve ser estritamente técnico, objetivo e curto.
     - Se vago, use a Categoria e Item para criar (Ex: "Falha de Autenticação em Sistema Corporativo" ou "Manutenção Preventiva em Estação de Trabalho").

  2. DESCRIÇÃO: 
     - Adote a persona de um "USUÁRIO FINAL" sério e detalhista relatando o problema.
     - Se o relato original for curto (ex: "monitor ruim"), você deve expandir descrevendo o impacto: "O equipamento apresenta falhas intermitentes de imagem, prejudicando a visualização de sistemas críticos no setor...".
     - Mencione a LOCALIZAÇÃO para dar realismo.

  3. RESOLUÇÃO: 
     - Descreva a ação técnica de forma direta e formal usando verbos no infinitivo ou particípio.
     - REGRA CRÍTICA: Se a ação estiver vazia ou for vaga (ex: "feito", "ok"), você DEVE PROPOR uma resolução técnica detalhada baseada no ITEM e CATEGORIA. 
     - Ex: Para Categoria "Rede" e Item "Internet", descreva: "Efetuado reset físico do modem, renovação de IP via prompt de comando e verificação de integridade de cabos de rede RJ45".

  ESTRUTURA DE ENTRADA:
  O texto recebido contém rótulos como LOCALIZAÇÃO, CATEGORIA, SUBCATEGORIA, ITEM, DETALHES e AÇÃO. 

  ENTRADA: 
  {{{freeText}}}

  REQUISITO FINAL: Forneça apenas a saída estruturada JSON, sem explicações. Use Português formal (Brasil). Não deixe nenhum campo com menos de 10 palavras.
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

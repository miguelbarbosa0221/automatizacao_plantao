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

  DIRETRIZES DE ENRIQUECIMENTO TOTAL E PROATIVO:
  Você deve usar a LOCALIZAÇÃO, CATEGORIA, SUBCATEGORIA e ITEM para preencher qualquer lacuna de informação em TODOS os campos de saída. Não seja vago. Se o usuário forneceu dados mínimos, você DEVE deduzir comportamentos técnicos e ações plausíveis.

  1. TÍTULO: 
     - Deve ser estritamente técnico, objetivo e curto.
     - Se o input for vago, use a Categoria e Item para criar um título descritivo (Ex: "Restabelecimento de Conectividade em Impressora Térmica").

  2. DESCRIÇÃO: 
     - Adote a persona de um "USUÁRIO FINAL" sério e detalhista relatando o problema.
     - Mesmo que o relato original seja curto (ex: "monitor ruim"), expanda descrevendo o impacto operacional: "O equipamento apresenta oscilações de brilho e falhas intermitentes de imagem, impactando o fluxo de trabalho no setor...".
     - Mencione a LOCALIZAÇÃO se disponível para dar realismo.

  3. RESOLUÇÃO: 
     - Descreva a ação técnica de forma direta e formal usando verbos no infinitivo ou particípio.
     - REGRA CRÍTICA: Se a ação estiver vazia ou for vaga (ex: "ok", "feito"), você DEVE PROPOR uma resolução técnica detalhada baseada no ITEM e CATEGORIA. 
     - Ex: Para "Internet" instável, descreva: "Realizada renovação de concessão DHCP, limpeza de cache de DNS e verificação física de conectividade no ponto de rede".

  ESTRUTURA DE ENTRADA:
  O texto recebido contém rótulos como LOCALIZAÇÃO, CATEGORIA, SUBCATEGORIA, ITEM, DETALHES e AÇÃO. 

  ENTRADA: 
  {{{freeText}}}

  REQUISITO FINAL: Forneça apenas a saída estruturada JSON. Use Português formal (Brasil). Nenhum campo deve ter menos de 10 palavras. Seja proativo para garantir uma documentação rica.
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

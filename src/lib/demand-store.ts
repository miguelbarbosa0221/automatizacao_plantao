import { ProcessFreeTextDemandWithGeminiOutput } from "@/ai/flows/process-free-text-demand-with-gemini";

export interface Demand extends ProcessFreeTextDemandWithGeminiOutput {
  id: string;
  timestamp: string;
  category?: string;
  source: 'structured' | 'free-text';
}

// In a real app, this would be a database. For this scaffold, we'll use a local mock.
let mockDemands: Demand[] = [];

export function addDemand(demand: Demand) {
  mockDemands = [demand, ...mockDemands];
}

export function getDemands() {
  return mockDemands;
}
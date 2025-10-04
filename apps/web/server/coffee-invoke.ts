import { coffeeNameAgent } from '@/lib/agents/coffee';

export interface CoffeeRunInput {
  prompt: string;
  branches?: number;
  finalists?: number;
  includeMarketTrends?: boolean;
}

export const runCoffeeAgent = async (input: CoffeeRunInput) => {
  return coffeeNameAgent.invoke({
    prompt: input.prompt,
    branches: input.branches,
    finalists: input.finalists,
    includeMarketTrends: input.includeMarketTrends ?? true,
  });
};

import {
  createAgent,
  createMcpTool,
  type AgentContext,
  type StepFunction,
} from '@stringcost/framework';
import {
  evaluateTheme,
  generateThemes,
  synthesizeNames,
  type SynthesisResult,
  type ThemeEvaluationResult,
  type ThemeGenerationResult,
} from '@stringcost/framework/mock';
import type {
  MarketTrendsInput,
  MarketTrendsResult,
} from '../mcp/market-trends';
import '../mcp/market-trends';

export interface CoffeeNameAgentInput {
  prompt: string;
  branches?: number;
  finalists?: number;
  failOnDuplicate?: boolean;
  includeMarketTrends?: boolean;
}

export interface CoffeeNameAgentOutput {
  themes: ThemeGenerationResult;
  evaluations: ThemeEvaluationResult[];
  synthesis: SynthesisResult;
  marketTrends?: MarketTrendsResult;
}

const DEFAULT_BRANCHES = 3;
const DEFAULT_FINALISTS = 3;

const fetchMarketTrends = createMcpTool<MarketTrendsInput, MarketTrendsResult>(
  'market-trends'
);

async function maybeFetchTrends(
  step: StepFunction,
  context: AgentContext
): Promise<MarketTrendsResult | undefined> {
  try {
    const execution = await fetchMarketTrends(
      step,
      { category: 'coffee', region: 'global' },
      {
        name: 'Fetch Market Trends',
        actionType: 'tool_use',
        unitCost: 0.0005,
        metadata: {
          description: 'Fetches current coffee market descriptors via MCP',
        },
      }
    );
    return execution?.result;
  } catch (error) {
    context.logger.warn('market trends unavailable', {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

export const coffeeNameAgent = createAgent<CoffeeNameAgentInput, CoffeeNameAgentOutput>(
  'coffeeNameGenerator',
  async (step, input, context) => {
    const branches = input.branches ?? DEFAULT_BRANCHES;
    const finalists = input.finalists ?? DEFAULT_FINALISTS;

    const themesResult = await step<ThemeGenerationResult>(
      {
        name: 'Generate Name Themes',
        actionType: 'llm_call',
        unitCost: 0.002,
        metadata: {
          prompt: input.prompt,
          branches,
        },
        costCalculator: ({ unitCost, quantity }) => unitCost * quantity,
      },
      async (runtime) => {
        const generation = generateThemes(input.prompt, branches);
        runtime.setQuantity(generation.themes.length);
        runtime.recordMetadata({
          promptTokens: generation.promptTokens,
          completionTokens: generation.completionTokens,
        });
        return generation;
      }
    );

    const evaluations: ThemeEvaluationResult[] = [];
    for (const theme of themesResult.themes) {
      const evaluation = await step<ThemeEvaluationResult>(
        {
          name: `Evaluate Theme: ${theme}`,
          actionType: 'evaluation',
          unitCost: 0.001,
          metadata: { theme },
          costCalculator: ({ unitCost }) => unitCost,
        },
        async (runtime) => {
          const result = evaluateTheme(theme);
          runtime.recordMetadata({
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            score: result.score,
          });
          return result;
        }
      );
      evaluations.push(evaluation);
    }

    const rankedThemes = [...evaluations]
      .sort((a, b) => b.score - a.score)
      .slice(0, finalists)
      .map((item) => item.theme);

    const synthesis = await step<SynthesisResult>(
      {
        name: 'Synthesize Final Names',
        actionType: 'llm_call',
        unitCost: 0.002,
        metadata: {
          finalists,
        },
      },
      async (runtime) => {
        const response = synthesizeNames(input.prompt, rankedThemes, finalists);
        runtime.setQuantity(response.candidates.length);
        runtime.recordMetadata({
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
        });
        return response;
      }
    );

    await step<void>(
      {
        name: 'Final QA Gate',
        actionType: 'validation',
        unitCost: 0.0005,
        metadata: {
          candidateCount: synthesis.candidates.length,
        },
        billOnError: true,
        finalizeBilling: ({ defaultEvent }) => ({
          ...defaultEvent,
          metadata: {
            ...defaultEvent.metadata,
            duplicates: findDuplicates(synthesis.candidates),
          },
        }),
      },
      async (runtime) => {
        const duplicates = findDuplicates(synthesis.candidates);
        runtime.recordMetadata({ duplicates });
        if (duplicates.length > 0 && input.failOnDuplicate) {
          throw new Error('Duplicate coffee names detected');
        }
      }
    );

    let marketTrends: MarketTrendsResult | undefined;
    if (input.includeMarketTrends) {
      marketTrends = await maybeFetchTrends(step, context);
    }

    return {
      themes: themesResult,
      evaluations,
      synthesis,
      marketTrends,
    };
  }
);

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      dupes.add(value);
    } else {
      seen.add(normalized);
    }
  }
  return Array.from(dupes);
}

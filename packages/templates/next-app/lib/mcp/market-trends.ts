import {
  McpRegistry,
  type McpServerDefinition,
} from '@stringcost/framework';

interface MarketTrendInput {
  category: string;
  region?: string;
}

interface MarketTrendPayload {
  descriptors: string[];
  summary: string;
}

const MARKET_DESCRIPTORS: Record<string, string[]> = {
  coffee: ['single-origin', 'nitro', 'oat milk', 'sustainable', 'seasonal'],
  tea: ['functional', 'matcha', 'boba', 'botanical', 'sparkling'],
  pastry: ['laminated', 'gluten-free', 'heritage', 'micro-batch'],
};

const marketTrendsServer: McpServerDefinition<
  MarketTrendInput,
  MarketTrendPayload
> = {
  name: 'market-trends',
  description: 'Returns trend descriptors for specialty beverage markets.',
  defaultUnitCost: 0.0005,
  async execute(input, context) {
    const start = Date.now();
    const descriptors =
      MARKET_DESCRIPTORS[input.category as keyof typeof MARKET_DESCRIPTORS] ??
      ['artisan', 'small-batch', 'seasonal'];
    const region = input.region ?? 'global';
    const summary = `Consumers in ${region} respond to ${descriptors
      .slice(0, 3)
      .join(', ')} concepts.`;

    context.logger.info('market-trends.respond', {
      category: input.category,
      region,
    });

    const durationMs = Date.now() - start;

    return {
      result: {
        descriptors,
        summary,
      },
      metadata: {
        descriptors,
        region,
        durationMs,
      },
      unitCost: 0.0005,
      quantity: descriptors.length,
    };
  },
};

McpRegistry.register(marketTrendsServer);

export type MarketTrendsResult = MarketTrendPayload;
export type MarketTrendsInput = MarketTrendInput;

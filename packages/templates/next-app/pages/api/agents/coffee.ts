import type { NextApiRequest, NextApiResponse } from 'next';
import { runCoffeeAgent } from '@/server/coffee-invoke';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  try {
    const result = await runCoffeeAgent({
      prompt,
      branches: typeof req.body?.branches === 'number' ? req.body.branches : undefined,
      finalists: typeof req.body?.finalists === 'number' ? req.body.finalists : undefined,
      includeMarketTrends:
        typeof req.body?.includeMarketTrends === 'boolean'
          ? req.body.includeMarketTrends
          : undefined,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Agent execution failed',
    });
  }
}

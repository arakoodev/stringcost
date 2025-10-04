import type { IncomingMessage, ServerResponse } from 'http';
import { runCoffeeAgent } from '@/server/coffee-invoke';

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req
      .on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      .on('error', reject)
      .on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8') || '{}';
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      });
  });
}

export async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing prompt' }));
      return;
    }

    const result = await runCoffeeAgent({
      prompt,
      branches: typeof body?.branches === 'number' ? body.branches : undefined,
      finalists: typeof body?.finalists === 'number' ? body.finalists : undefined,
      includeMarketTrends:
        typeof body?.includeMarketTrends === 'boolean'
          ? body.includeMarketTrends
          : undefined,
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Agent execution failed',
      })
    );
  }
}

export default handler;

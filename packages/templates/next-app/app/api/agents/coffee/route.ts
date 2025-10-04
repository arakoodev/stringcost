import { NextResponse } from 'next/server';
import { coffeeNameAgent } from '@/lib/agents/coffee';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    branches?: number;
    finalists?: number;
    includeMarketTrends?: boolean;
  };

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  try {
    const result = await coffeeNameAgent.invoke({
      prompt,
      branches: body.branches,
      finalists: body.finalists,
      includeMarketTrends: body.includeMarketTrends ?? true,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

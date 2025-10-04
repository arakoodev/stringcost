import { FormEvent, useState } from 'react';

type InvoiceLine = {
  stepName: string;
  actionType: string;
  total: number;
};

type AgentResponse = {
  output: unknown;
  invoice: {
    currency: string;
    total: number;
    lineItems: InvoiceLine[];
  };
};

export default function HomePage() {
  const [prompt, setPrompt] = useState(
    'Generate warm, modern coffee shop concepts for a waterfront neighborhood.'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAgent = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Agent request failed');
      }

      const json = (await response.json()) as AgentResponse;
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <h1>stringcost × Next.js</h1>
      <p>
        This demo runs the <code>coffeeNameAgent</code> inside a Next.js API route and
        returns a fully itemised invoice for every step.
      </p>

      <form onSubmit={runAgent}>
        <label htmlFor="prompt">Prompt</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          style={{ width: '100%', marginBlock: '0.5rem 1rem' }}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Running…' : 'Run coffeeNameAgent'}
        </button>
      </form>

      {error ? (
        <p style={{ color: '#f87171' }}>{error}</p>
      ) : null}

      {result ? (
        <section>
          <h2>Invoice ({result.invoice.currency})</h2>
          <p>Total: {result.invoice.total.toFixed(4)}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Step</th>
                <th align="left">Action</th>
                <th align="right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {result.invoice.lineItems.map((item) => (
                <tr key={item.stepName}>
                  <td>{item.stepName}</td>
                  <td>{item.actionType}</td>
                  <td align="right">{item.total.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Raw Output</h3>
          <pre>{JSON.stringify(result.output, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}

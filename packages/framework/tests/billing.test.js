const assert = require('node:assert/strict');
const test = require('node:test');
const {
  BillingManager,
  createAgent,
  createMcpTool,
  AgentExecutionError,
  McpRegistry,
} = require('../dist');
const {
  evaluateTheme,
  generateThemes,
  synthesizeNames,
} = require('../dist/mock');

test('BillingManager aggregates totals with default calculator', () => {
  const manager = new BillingManager();
  manager.record({
    stepName: 'Step A',
    actionType: 'llm_call',
    unitCost: 0.002,
    quantity: 3,
  });
  manager.record({
    stepName: 'Step B',
    actionType: 'validation',
    unitCost: 0.001,
  });

  const invoice = manager.generateInvoice();
  assert.equal(invoice.total, 0.007);
  assert.equal(invoice.lineItems.length, 2);
});

test('createAgent propagates invoice via AgentExecutionError on failure', async () => {
  const failingAgent = createAgent('failing', async (step) => {
    await step(
      {
        name: 'Explode',
        actionType: 'validation',
        unitCost: 0.1,
        billOnError: true,
      },
      async () => {
        throw new Error('boom');
      }
    );
    return 'ok';
  });

  await assert.rejects(failingAgent.invoke({}), AgentExecutionError);
});

test('createMcpTool records metadata and cost overrides from MCP execution', async () => {
  const definition = {
    name: 'mock-tool',
    description: 'Doubles numbers',
    defaultUnitCost: 0.001,
    async execute(input) {
      return {
        result: { doubled: input.value * 2 },
        unitCost: 0.002,
        quantity: 1,
        metadata: { value: input.value },
      };
    },
  };

  McpRegistry.register(definition);

  const tool = createMcpTool('mock-tool');
  const agent = createAgent('tool-agent', async (step) => {
    const execution = await tool(step, { value: 2 }, { name: 'Double Value' });
    return execution.result.doubled;
  });

  const run = await agent.invoke({});
  assert.equal(run.output, 4);
  assert.equal(run.invoice.lineItems[0]?.metadata.value, 2);
  assert.equal(run.invoice.lineItems[0]?.unitCost, 0.002);
});

test('coffee agent invoice total scales with additional branches', async () => {
  const coffeeAgent = createAgent(
    'coffee',
    async (step, input) => {
      const generation = await step(
        {
          name: 'Generate Name Themes',
          actionType: 'llm_call',
          unitCost: 0.002,
          metadata: { prompt: input.prompt },
        },
        async (runtime) => {
          const themes = generateThemes(input.prompt, input.branches);
          runtime.setQuantity(themes.themes.length);
          runtime.recordMetadata({
            promptTokens: themes.promptTokens,
            completionTokens: themes.completionTokens,
          });
          return themes;
        }
      );

      for (const theme of generation.themes) {
        await step(
          {
            name: `Evaluate ${theme}`,
            actionType: 'evaluation',
            unitCost: 0.001,
          },
          async () => evaluateTheme(theme)
        );
      }

      await step(
        {
          name: 'Synthesize Final Names',
          actionType: 'llm_call',
          unitCost: 0.002,
        },
        async () => synthesizeNames(input.prompt, generation.themes, 3)
      );

      return generation.themes;
    }
  );

  const runThree = await coffeeAgent.invoke({ prompt: 'Test', branches: 3 });
  const runFive = await coffeeAgent.invoke({ prompt: 'Test', branches: 5 });

  assert.ok(runFive.invoice.total > runThree.invoice.total);
});

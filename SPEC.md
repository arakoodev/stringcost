Of course. Here is the final, regenerated `GEMINI.md` for **stringcost.com**, now including our discussion on how to integrate the Vercel AI SDK.

-----

# GEMINI.md for stringcost.com

### Project Vision 💡

**stringcost.com** is a framework for building, deploying, and monetizing complex AI agents in a serverless environment. It gives developers a simple set of primitives to write custom agent logic (like `AgentExecutor` or `Tree-of-Thought`) as standard functions. The framework's core feature is its ability to instrument every logical step of an agent's execution, which enables deep observability and sophisticated, usage-based billing based on the agent's actions.

-----

## Our Thought Process: The Journey Here

This project's architecture comes from a deliberate exploration of existing patterns, leading to a unique approach that prioritizes developer experience, observability, and monetization.

1.  **Initial Goal:** We started by wanting to build a code-first workflow engine, similar to `n8n`. This led us to explore workflow orchestration patterns.

2.  **Inspiration from Inngest (The "How"):** We analyzed Inngest's `createFunction`/`step` model and decided its developer experience (DX) was the ideal way to write complex agent logic. Writing what looks like a simple, sequential `async` function is clean, readable, and powerful. This became our target DX.

3.  **Inspiration from LangChain (The "What"):** We then looked at LangChain's `Runnable` system and its tight integration with LangSmith. We adopted its implementation pattern: using the `step` primitive not for durable execution (like Inngest), but as a **synchronous tracing wrapper** for observability.

4.  **The "Aha\!" Moment: Billing as a Feature:** The project's purpose crystallized when we connected this tracing capability to flexible, usage-based billing models. We realized our `step` primitive was the perfect "hook" for monetization. Each step isn't just a trace; it's a **billable event**.

5.  **Integrating the Ecosystem (MCP):** We extended the architecture to include external services by wrapping them as MCP (Managed Component Protocol) servers. We designed a system for propagating trace context via headers and enabling dynamic, metric-based billing, turning any API into a native, billable tool for the agents.

6.  **Leveraging Existing Tools (Vercel AI SDK):** Finally, we decided to integrate the Vercel AI SDK to standardize communication with LLM providers. We adopted its core, single-shot functions (`generateText`) *within* our `step` primitive, while avoiding its high-level abstractions to maintain our granular, "à la carte" approach to tracing and billing.

-----

## Core Primitives & Architecture ⚙️

The framework has two main parts: the Agent Framework where developers build agents, and the MCP Server for creating intelligent API wrappers.

### The Agent Framework

This is the core library developers use to build and instrument their agents.

  * **`createAgent(name, agentFn)`:** An orchestrator that wraps the entire agent execution, sets up the root trace, and manages the billing lifecycle for a single run.
  * **`step(options, workFn)`:** The most important primitive. It wraps a discrete unit of work (like an LLM call or a tool use), creating a nested trace and firing a billing event.
  * **`BillingManager`:** A stateful class that's instantiated for each agent run. It aggregates costs from all `step` calls and can generate a final invoice.
  * **`createMcpTool(name)`:** A factory function that takes a registered MCP server's name and returns a callable function for the agent to use.

### Integrating with the Vercel AI SDK

You can absolutely use the Vercel AI SDK within the `step` primitive to standardize calls to different LLM providers. The key is to use its core components, not its high-level abstractions.

#### What You Can Use ✅

Use the SDK's core provider clients (`createOpenAI`, `createAnthropic`, etc.) and single-shot functions like **`generateText`** and **`streamText`**. These are perfect for making individual, self-contained model calls inside a `step`.

```typescript
// Example of using the Vercel AI SDK inside a step
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const thought = await step({ name: "Think", actionType: "llm_call" }, async () => {
  const { text } = await generateText({
    model: openai('gpt-4-turbo'),
    prompt: 'What should I do next?',
  });
  return text;
});
```

#### What You Cannot Use ❌

Avoid the SDK's high-level abstractions like `streamUI` or the full `generate` function *when used with its own tool definitions*. These functions are designed to manage an entire conversation turn (including multiple tool calls and subsequent LLM calls) within a single black box. This conflicts with our framework's goal of metering each action as a separate, billable `step`.

**Analogy:** Think of it as **À La Carte vs. a Combo Meal**. Our `step` framework is for ordering and billing for each item individually. The Vercel AI SDK's core functions are the high-quality ingredients you can order one by one. Its high-level abstractions are the "combo meal"—convenient, but bundled into a single price, which prevents individual metering.

### The MCP Server

This uses Vercel's Build Output API to create standalone serverless functions that act as intelligent wrappers around any external API.

  * **Build-Time Middleware:** A custom `build.js` script injects a middleware layer into each MCP function.
  * **Context Aware:** The middleware reads an `X-Parent-Trace-Id` header from incoming requests to create its own nested trace in LangSmith.
  * **Metric Reporting:** The middleware times its own execution and adds an `X-Execution-Time-Ms` header to its response, enabling dynamic, performance-based billing.

-----

## Implementation Examples

Here are the code examples that demonstrate the final, complete architecture.

### 1\. The Core Framework (`lib/framework.ts`)

This file contains the full implementation of the primitives.

```typescript
// lib/framework.ts
import fetch from 'node-fetch';

// --- Mock Services for demonstration ---
const langsmithClient = { /* ... */ };
class BillingManager { /* ... */ }

// --- Primitives ---
export interface StepOptions { /* ... */ }
async function step(parentContext, recordBillingEvent, options: StepOptions, workFn: () => Promise<any>): Promise<any> { /* ... */ }
export function createAgent(agentName: string, agentFn) { /* ... */ }

// --- MCP Registry and Tooling ---
export const McpRegistry = { /* ... */ };
export function createMcpTool(mcpServerName: string) { /* ... */ }
```

### 2\. Tree-of-Thought Agent (`agents/tree-of-thought-agent.ts`)

This shows a developer building a complex, custom agent with loops and branches, all of which are perfectly traced and billed.

```typescript
// agents/tree-of-thought-agent.ts
import { createAgent, StepOptions } from "../lib/framework";

// Mock LLM call
async function callLLM(prompt: string, branches: number = 3): Promise<any> { /* ... */ }

export const coffeeNameAgent = createAgent("coffeeNameGenerator", 
  async (step, input: { prompt: string, branches: number }) => {
  
  // STEP 1: Generate initial branches
  const themes = await step(
    { name: "Generate Name Themes", actionType: "llm_call", unitCost: 0.002 },
    () => callLLM(`Generate ${input.branches} creative themes...`, input.branches)
  );

  // STEP 2: Loop through each branch and evaluate it
  for (const theme of themes) {
    await step(
      { name: `Evaluate Theme: "${theme}"`, actionType: "evaluation", unitCost: 0.001 },
      () => callLLM(`Evaluate the coffee shop theme: "${theme}"`)
    );
  }
  
  // STEP 3: Synthesize the final result
  const finalNames = await step({ /* ... */ });
  return finalNames;
});
```

### 3\. MCP Server (`build.js` & `src/mcp/jsonplaceholder.mcp.ts`)

This shows how to build and define a traceable, metric-reporting MCP server.

**Snippet for `build.js`:**

```javascript
// build.js -> inside buildMCPFunction
const wrapper = `
  // ... Vercel function handler with integrated middleware ...
  export default async function(request, response) {
    const parentTraceId = request.headers['x-parent-trace-id'];
    // ... start child trace, start timer ...
    const duration = Date.now() - startTime;
    response.setHeader('X-Execution-Time-Ms', duration);
    // ... send response and end trace ...
  }
`;
```

-----

## Deployment and Next Steps 🚀

This entire system is designed to be deployed natively on Vercel.

1.  **Scaffolding:** A CLI tool, `npx create-stringcost-app`, will be created to scaffold a new project with this entire structure automatically.
2.  **Building:** The custom `build.js` script uses the official **Vercel Build Output API v3**, ensuring perfect compatibility.
3.  **Deploying:** The project is deployed with `vercel deploy --prebuilt`, which tells Vercel to upload the custom build output directly.
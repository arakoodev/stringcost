# Agent Playbook

This document explains how to build and operate agents inside the stringcost framework. Use it as the canonical reference for instrumenting agent logic, wiring MCP tools, and deploying compute surfaces that honor observability and billing guarantees.

## Core Concepts

- **Agent run** – Created with `createAgent(name, agentFn)`. It owns the root trace, lifecycle hooks, and a fresh, run-scoped `BillingManager`.
- **Step** – Declares an observable, billable unit of work. Wrap every meaningful operation in `step(options, workFn)` so that traces and invoices stay in sync.
- **BillingManager** – Aggregates step-level costs, logs events as they happen, and produces the final invoice once the agent resolves.
- **MCP tools** – External capabilities exposed through Managed Component Protocol servers. Register them in `McpRegistry` and hydrate them inside your agent with `createMcpTool`.

## Agent Lifecycle

1. `createAgent` builds an executor that accepts input and a scoped `step` helper.
2. Each `step` call creates a nested trace (for LangSmith) and emits a billable event with the supplied metadata.
3. The `BillingManager` records cost deltas per step and retains them for invoicing.
4. When the agent resolves, the framework ends the root trace and prints or returns the invoice so callers can persist or charge it.
5. Any MCP tool invocations propagate the parent trace ID and report their own metrics (duration, custom costs) back to the agent trace.

## Authoring Agents

- Model agent logic as a plain async function. Use loops, conditionals, and composition freely—they are captured by the tracing tree.
- Define clear `step` names and `actionType` values (`llm_call`, `tool_use`, `evaluation`, etc.) to keep observability dashboards meaningful.
- Provide `unitCost` (or other billing metadata) whenever the action should influence invoices.
- Handle errors inside `step` blocks so failures are attributed to the correct node in the trace.

### Using the Vercel AI SDK

- Prefer the SDK's low-level, single-shot helpers such as `generateText` or `streamText` with provider clients (`createOpenAI`, `createAnthropic`, ...).
- Avoid bundled abstractions (`generate` with tool orchestration, `streamUI`, etc.) because they hide sub-steps and break granular billing.
- Wrap **every** provider call inside a `step` so token usage and costs are recorded.

### Tree-of-Thought Example

- The runnable reference agent in `agents/coffee-name-agent.ts` synthesizes coffee shop names. It loops freely while every LLM call and evaluation remains wrapped in `step` for end-to-end tracing and flexible billing.
- The backing primitives in `lib/framework.ts` log trace boundaries and billing events (`BillingManager.record`) to the console. Running `index.ts` demonstrates how each `step` generates distinct trace IDs, cost events, and a final invoice.
- Supply `unitCost` for each branch evaluation and the synthesis step so the invoice mirrors the reasoning tree. Adjust the input `branches` count to see costs scale linearly with the breadth of the search.

### Dynamic Billing Scenario

Run `index.ts` twice—once with `branches: 3` and again with `branches: 5`.

- Each additional branch triggers another evaluation `step`, adding `$0.0010` (or whatever `unitCost` you set) to the invoice.
- The generated invoice shows the per-step line items followed by a total (for example, `$0.0080` for 3 branches vs. `$0.0100` for 5 branches).
- This proves that billing is elastic by design: change the loop bounds or add new `step` types and the invoice automatically reflects the expanded work.

## Working With MCP Tools

- Register MCP servers once via the `McpRegistry` and expose them as callable tools with `createMcpTool`.
- Each MCP invocation includes the parent trace header (`X-Parent-Trace-Id`) so downstream services can spawn their own trace children.
- The build system wraps every MCP implementation with `@vercel/mcp-handler`, translating HTTP requests into MCP protocol calls, serving both JSON responses and SSE streams.
- Middleware in the MCP server measures execution time and returns it through `X-Execution-Time-Ms`, enabling dynamic, metric-based pricing.
- Treat MCP steps like any other tool call: wrap them in `step`, label them clearly, and map returned metrics into billing events.

## Packaging & Deployment

- Run `node build.js` to compile everything into the Vercel Build Output API layout under `.vercel/output/`.
- MCP sources (`src/mcp/**/*.mcp.ts`) are bundled into `mcp-*.func/` directories with streaming support and per-function configs.
- WebSocket sources (`src/websocket/**/*.ws.ts`) are wrapped into HTTP shims that expose REST endpoints and forward events to user-defined `onMessage` handlers.
- Cron sources (`src/cron/**/*.cron.ts`) are packaged with bearer-auth guards and long execution windows; pair them with `vercel.json.crons` schedules.
- Optional Next.js apps are built separately (`next build`) and copied into the same output tree so static assets and pages deploy alongside custom functions.
- `vercel.json` must point to the prebuilt output (`"buildCommand": "node build.js"`, `"outputDirectory": ".vercel/output"`) and declare cron schedules.
- Use `vercel deploy --prebuilt` to upload the generated output without re-running the build in Vercel.
- For local smoke tests, require the bundled function entrypoints from `.vercel/output/functions/*` inside an Express harness (see `test-local.js`).

## Billing & Observability

- Every `step` is both a trace node and a billing hook. Keep names/action types consistent for dashboards and invoices.
- Store derived metrics (token counts, execution time, API tier) on the billing event so usage plans can price flexibly.
- After `createAgent.invoke` completes, call `BillingManager.generateInvoice()` (or read its totals) to persist or charge the run.
- Surface streaming work (SSE responses from MCP functions) through dedicated steps so partial outputs remain attributable.

## Best Practices Checklist

- [ ] Wrap each meaningful operation in a `step` (including MCP calls, LLM invocations, and streaming updates).
- [ ] Supply `unitCost` or custom price calculators where applicable.
- [ ] Use descriptive `name` and `actionType` values for clarity.
- [ ] Keep Vercel AI SDK usage scoped to provider primitives inside steps.
- [ ] Propagate trace headers when calling external services or MCP handlers.
- [ ] Validate agent output and surface errors inside dedicated steps.
- [ ] Run `node build.js` before deploying so MCP/WebSocket/Cron wrappers stay in sync with the latest agent tooling.
- [ ] Confirm `vercel.json` routes and cron schedules match the generated functions.

By following this guide, every agent built on stringcost remains transparent, debuggable, and deployable on Vercel with full control over observability and billing.

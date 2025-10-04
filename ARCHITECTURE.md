# Phase 1 – Next.js + CLI Architecture Blueprint

## Target Repository Structure
- `apps/web` – Next.js application (App Router) hosting agent demo UI, API routes invoking agents, and example pages.
  - `app/api/agents/[agent]/route.ts` – Route handlers that call `createAgent` instances and return step/billing data.
  - `app/(marketing)` – Optional marketing pages explaining the framework.
- `packages/framework` – Reusable TypeScript library exporting core primitives (`createAgent`, `step`, `BillingManager`, `McpRegistry`, `createMcpTool`).
- `packages/templates` – Source templates consumed by the CLI (Next.js pages, API routes, MCP handlers, build script).
- `packages/create-stringcost-app` – CLI package bundling the scaffolding logic.
- `build.js` – Root orchestrator invoked during `npm run build` for the Next.js app; currently runs `npm run build --workspace web` and prepares `.vercel/output` scaffolding (MCP bundling TODO).
- `vercel.json` – Configures prebuilt deployment targeting `.vercel/output`.
- `scripts/` – Shared utilities for packaging, template syncing, and testing.
- `tests/` – Cross-package test harness (Vitest) covering framework primitives, CLI scaffolding smoke tests, and Next.js API route validations.

## High-Level Flow
1. **CLI Experience (`create-stringcost-app`)**
   - Prompts for project name, optional MCP examples, and agent templates.
   - Copies template files from `packages/templates` into the new directory.
   - Installs dependencies (`next`, `react`, `typescript`, `@vercel/kv`, etc.), sets up `package.json` scripts (`dev`, `build`, `deploy`), and writes environment examples.
   - Outputs instructions for `npm run dev`, `npm run build`, and `vercel deploy --prebuilt`.

2. **Framework Consumption**
   - Next.js API routes import from `@stringcost/framework` (packages/framework) to construct agents.
   - `step` instrumentation remains unchanged but logs via Next.js-compatible logger (e.g., `console`, `pino`).
   - `BillingManager` aggregates costs per request and responds through the API route payload.

3. **Next.js Integration**
   - Primary entry point is an API route (`app/api/agent/run/route.ts`) that accepts JSON input, invokes the agent, and returns `{ output, invoice, trace }`.
   - Demo UI uses Next.js Server Components to call the API route (via `fetch`) and display results.
   - Server Actions (optional) can wrap agent invocations for progressive enhancement while keeping steps observable.

4. **Custom Build Pipeline**
   - `build.js` currently:
     1. Executes `npm run build` inside `apps/web` (optional; helpful for local Next workflows).
     2. Bundles a Node serverless handler (`apps/web/server/coffee-handler.ts`) into `.vercel/output/functions/api/agents/coffee.func` via `esbuild`.
     3. Copies static assets from `apps/web/public` into `.vercel/output/static`.
     4. Writes baseline `config.json` and `.vc-config.json` entries.
   - Next iteration will extend bundling to MCP handlers and integrate Next-generated assets when available.

5. **Billing & Observability**
   - Every API invocation triggers `BillingManager.generateInvoice()`; invoices are returned to clients and logged.
   - Step metadata includes tokens (from Vercel AI SDK when available), execution duration, and MCP headers.
   - CLI scaffolds logging hooks (e.g., `lib/logger.ts`) that integrate with Vercel’s logging pipeline.

6. **Testing Strategy**
   - Framework package runs Node’s built-in test runner on compiled bundles (`tests/billing.test.js`).
   - CLI/web packages expose placeholder scripts; future work includes CLI smoke scaffolding and API route assertions.

## Step Graph (Coffee Name Agent Example within Next.js)
- API route `app/api/agents/coffee/route.ts` wires the agent and returns JSON with invoice.
- Steps mirror previous design but leverage Vercel AI SDK when available; token counts feed directly into `BillingManager`.
- MCP call fetches market trends via serverless function packaged by `build.js`.
- UI displays invoice items in a table for developer insight.

## CLI Template Contents
- `app/api/agents/coffee/route.ts` – Example agent endpoint.
- `app/page.tsx` – Landing page with instructions and a call-to-action to invoke the sample agent.
- `lib/framework.ts` (imported from package) – or optionally copied if we publish as part of the template.
- `src/mcp/market-trends.mcp.ts` – Mock MCP handler demonstrating tool integration.
- `build.js`, `vercel.json`, `env.example`, `tsconfig.json`, `next.config.js` tailored for Build Output API v3.

## Validation Checkpoints
- CLI-generated project runs `npm run dev` (Next.js) without manual edits.
- `next build` followed by `node build.js` produces `.vercel/output` with both Next.js and MCP assets.
- Deploying via `vercel deploy --prebuilt` succeeds using the generated Build Output.
- Framework unit tests and CLI smoke tests pass in CI.
- Documentation (README, SPEC) updated to reflect Next.js-first approach.

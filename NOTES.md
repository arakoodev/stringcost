# Phase 0 – Re-Intake Notes (Next.js + CLI Alignment)

## Updated Scope & Goals
- Align the stringcost framework with a Next.js application deployed on Vercel, ensuring agents, steps, and billing integrate cleanly with Next.js routing or server actions.
- Design a developer-ready CLI (`create-stringcost-app`) that scaffolds the entire project structure, similar to `create-next-app`, including build tooling and example agents/MCP handlers.
- Preserve observability/billing guarantees while adapting to the Next.js build/deploy pipeline and Vercel Build Output API expectations.

## Additional Assumptions
- The repository may evolve into a monorepo housing the CLI package, template assets, and a reference Next.js app.
- The CLI should automate dependency installation, configuration (`vercel.json`, `tsconfig.json`, etc.), and include sample agents to demonstrate the full workflow.
- Custom build logic (`build.js`) must cooperate with the Next.js build rather than replace it, orchestrating additional MCP/Cron bundles.

## Updated Dependencies & Impacted Systems
- Next.js (likely App Router) and its build pipeline (`next build`) alongside custom bundling for agents/MCP servers.
- Vercel CLI and Build Output API v3 artifacts.
- Node-based CLI tooling (published package) for scaffolding new projects.

## Open Questions / Risks
- Determine the best integration point inside Next.js for agent execution (API routes, server actions, route handlers) while retaining step instrumentation.
- Define CLI ergonomics (interactive prompts, optional features) and how template code stays in sync with core libraries.
- Clarify how to share code between the CLI template and the reference implementation (publish reusable packages vs. file copying).
- Consider developer onboarding flows, including environment configuration and secrets management.

## Immediate Next Steps
- Revisit architecture (Phase 1) to map Next.js app structure, build.js orchestration, and CLI scaffolding responsibilities.
- Outline repo structure supporting both the CLI and example Next.js project.

## Tooling Considerations (Initial List)
- Next.js 14+ with App Router (requires `react`, `react-dom`, `next` dependencies).
- Build tooling: `esbuild`, `glob`, `rimraf`, `tsup` or similar for compiling framework/CLI packages.
- CLI packaging: `commander` or `cac` for argument parsing, `kleur` for colored output, `ora` for progress indicators.
- Testing: Vitest for packages, Playwright or Jest for Next.js API tests.
- Continuous integration: GitHub Actions or Vercel CI for running builds/tests.

# Phase 2 – Tooling & Infrastructure Checklist (Next.js focus)
- [x] Initialize workspace `package.json` with TypeScript tooling (`typescript`, `tsup`, `@types/node`).
- [x] Add monorepo workspaces (`apps/web`, `packages/framework`, `packages/create-stringcost-app`).
- [ ] Include Vercel AI SDK dependencies (`ai`, `@ai-sdk/openai`) but plan for mock adapters due to restricted network.
- [x] Create lightweight MCP mock implementation invoked locally (no external network calls).
- [ ] Define environment variable placeholders in template `.env.example` (needs expansion for root project).
- [x] Provide `build.js` orchestrator (currently copies Next.js output when available and prints MCP bundling TODO).

# Phase 3 – Implementation Snapshot
- `packages/framework`: exports agent primitives + MCP tooling with CommonJS & ESM bundles (built via `tsup`).
- `apps/web`: Next.js App Router demo, API route `app/api/agents/coffee/route.ts` returning invoices, and simple client UI.
- `packages/create-stringcost-app`: CLI scaffolding command using `commander`, `fs-extra`, template copying, and optional dependency install.
- `packages/templates/next-app`: Starter project assets consumed by the CLI (Next.js config, sample agent, MCP handler, build script, README).
- Root `.gitignore` ignores `node_modules`, `.vercel`, and build artifacts; workspace scripts orchestrate build/test per package.

# Phase 4 – Billing & Telemetry Notes
- Agent instrumentation mirrors the prior design; billing metadata (token counts, duplicates, MCP headers) surfaces through API responses.
- Next.js route handler returns `{ output, invoice, traceId }` to keep invoices visible in the UI and CLI-generated projects.
- `build.js` now bundles the Coffee agent API with `esbuild` and serves static assets from `apps/web/public`; MCP function bundling remains TODO.

# Phase 5 – Validation & Hardening
- Framework tests run via Node’s built-in test runner (`node --test`) against compiled bundles (`tests/billing.test.js`).
- CLI and web packages ship placeholder test scripts; add scenario coverage once templates stabilize.
- Outstanding:
  - Deterministic duplicate-name scenario for QA gate coverage.
  - End-to-end test hitting the Next.js API route (supertest or Playwright) once server/test harness is ready.

# Phase 6 – Packaging & Deployment
- Root `build.js` runs the web workspace build (for developer parity), bundles `apps/web/server/coffee-handler.ts` into `.vercel/output/functions/api/agents/coffee.func`, and copies static assets.
- `vercel.json` points to the custom build command and sets the output directory for prebuilt deployments.
- TODO: enrich the build step to package MCP handlers and, if desired, integrate real Next.js standalone output when it becomes available.

# Phase 7 – Monitoring & Follow-ups
- Backlog items:
  - Expand CLI to optionally install Vercel AI SDK + environment scaffolding.
  - Replace mock LLM layer with provider integrations once network access allows.
  - Wire structured logging sinks (LangSmith/Loki) by consuming emitted trace IDs.
  - Automate smoke tests verifying `.vercel/output` before deployment.

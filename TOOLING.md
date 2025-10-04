# Phase 2 – Tooling & Infrastructure Reassessment

## Packages & Dependencies
- **Next.js Stack**
  - `next@latest`, `react@18`, `react-dom@18`
  - Type support: `@types/react`, `@types/node`
  - Styling: Tailwind (optional) or CSS Modules (default)
- **Framework Package**
  - Source in `packages/framework`, built with `tsup` targeting ESM + CJS
  - Runtime deps: none (pure TypeScript); peerDeps on `@vercel/kv` optional
- **CLI Package**
  - `commander` (CLI args) or `cac`
  - `execa` for spawning `npm install`
  - `kleur`/`chalk` for terminal styling
  - `fs-extra`, `ora` for file operations and spinners
- **Build Pipeline**
  - `tsup` for framework dual-module bundles (`esm` + `cjs`)
  - `tsc` for CLI compilation
  - `glob`/`fs-extra` for template manipulation (extend to MCP bundling later)
- **Testing & QA**
  - Node's `node:test` runner against compiled framework output (see `packages/framework/tests/billing.test.js`)
  - Placeholder scripts for CLI/Web (upgrade to smoke tests + API assertions)
  - Future: `supertest` for API route verification, Playwright for UI regression

## Infrastructure Requirements
- Node 18+ runtime (matches Next.js + Vercel environment)
- Vercel CLI for deployment validation
- GitHub Actions workflow:
  1. Install dependencies
  2. Build framework & CLI packages
  3. Run `npx create-stringcost-app tmp` smoke test
  4. Execute Next.js build + custom `build.js`

## Outstanding Decisions
- Whether to publish `@stringcost/framework` package separately or keep as local workspace dependency.
- How to distribute template files within CLI (copy vs. template engine).
- Authentication/secret management for MCP/LLM integrations (likely `.env.local`).

## Immediate Actions
- Automate template sync and smoke test (`npx create-stringcost-app`) inside CI.
- Decide when to bundle Vercel AI SDK + environment helpers into the CLI template.
- Extend `build.js` to package MCP handlers and ship `.vercel/output/functions/*` beyond the Next.js server stub.

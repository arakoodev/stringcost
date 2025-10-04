# {{projectName}}

Generated with `create-stringcost-app`.

## Getting Started

```bash
npm install
npm run dev
```

The demo UI is available at `http://localhost:3000`. It posts to `/api/agents/coffee`, which uses `@stringcost/framework` primitives to run the sample agent and return an invoice of billable steps.

## Building for Vercel Build Output API

```bash
node build.js
```

This command compiles the project into `.vercel/output/`, bundling the serverless API handler with `esbuild` and copying static assets. Deploy with:

```bash
vercel deploy --prebuilt
```

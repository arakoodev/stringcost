# {{projectName}}

Generated with `create-stringcost-app`.

## Getting Started

```bash
npm install
npm run dev
```

The demo UI is available at `http://localhost:3000`. The coffee-name agent lives under `app/api/agents/coffee/route.ts` and illustrates how to wire `@stringcost/framework` inside Next.js.

## Building for Vercel

```bash
node build.js
```

This will run `next build` and prepare the `.vercel/output` directory. The script currently outputs TODO notices for wiring the Build Output API; adapt it to your deployment strategy.

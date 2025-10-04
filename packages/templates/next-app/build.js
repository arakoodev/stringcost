#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
  console.log(`$ ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function main() {
  run('next build');

  const outputRoot = path.join(process.cwd(), '.vercel', 'output');
  fs.mkdirSync(outputRoot, { recursive: true });

  console.log('[build] Next.js build complete.');
  console.log(
    '[build] TODO: copy standalone output into the Vercel Build Output API structure and bundle MCP handlers.'
  );
}

main();

#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command, cwd) {
  console.log(`$ ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[build] Skipping copy, source missing: ${src}`);
    return false;
  }
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

function writeJSON(target, data) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data, null, 2));
}

function main() {
  const projectRoot = process.cwd();
  const webDir = path.join(projectRoot, 'apps', 'web');
  const outputRoot = path.join(projectRoot, '.vercel', 'output');
  const functionsDir = path.join(outputRoot, 'functions');
  const staticDir = path.join(outputRoot, 'static');
  const functionDir = path.join(functionsDir, 'index.func');

  console.log('[build] Building Next.js application');
  run('npm run build', webDir);

  console.log('[build] Preparing Vercel Build Output structure');
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(functionsDir, { recursive: true });
  fs.mkdirSync(staticDir, { recursive: true });

  const standaloneDir = path.join(webDir, '.next', 'standalone');
  const staticSource = path.join(webDir, '.next', 'static');
  const publicDir = path.join(webDir, 'public');

  const copiedStandalone = copyDir(standaloneDir, functionDir);
  const copiedStatic = copyDir(staticSource, path.join(outputRoot, 'static', '_next')); 
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, staticDir);
  }

  if (copiedStandalone) {
    writeJSON(path.join(functionDir, '.vc-config.json'), {
      runtime: 'nodejs18.x',
      handler: 'server.js',
    });
  } else {
    console.warn('[build] No standalone output detected. Ensure next.config.js sets output="standalone".');
  }

  writeJSON(path.join(outputRoot, 'config.json'), { version: 3 });

  console.log('[build] Build output ready at .vercel/output (static copied:', copiedStatic, ')');
  console.log('[build] TODO: bundle MCP handlers and additional functions as described in SPEC.');
}

main();

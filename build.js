#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

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

  console.log('[build] Building Next.js application (optional for local dev)');
  try {
    run('npm run build', webDir);
  } catch (error) {
    console.warn('[build] next build failed or produced no output; continuing with custom bundling');
  }

  console.log('[build] Preparing Vercel Build Output structure');
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(functionsDir, { recursive: true });
  fs.mkdirSync(staticDir, { recursive: true });

  const publicDir = path.join(webDir, 'public');
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, staticDir);
  }

  bundleServerlessApi({ projectRoot, outputRoot });

  writeJSON(path.join(outputRoot, 'config.json'), { version: 3 });

  console.log('[build] Build output ready at .vercel/output');
  console.log('[build] TODO: add MCP handler bundling to match SPEC expectations.');
}

main();

function bundleServerlessApi({ projectRoot, outputRoot }) {
  const outDir = path.join(outputRoot, 'functions', 'api', 'agents', 'coffee.func');
  fs.mkdirSync(outDir, { recursive: true });

  const entry = path.join(projectRoot, 'apps', 'web', 'server', 'coffee-handler.ts');
  const result = esbuild.buildSync({
    entryPoints: [entry],
    outfile: path.join(outDir, 'index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['next'],
    logLevel: 'info',
  });

  writeJSON(path.join(outDir, '.vc-config.json'), {
    runtime: 'nodejs18.x',
    handler: 'index.js',
  });

  return result;
}

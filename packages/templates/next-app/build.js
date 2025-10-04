#!/usr/bin/env node
const { execSync } = require('child_process');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

function run(command, cwd) {
  console.log(`$ ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

function writeJSON(target, data) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data, null, 2));
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function bundleServerless({ projectRoot, outputRoot }) {
  const outDir = path.join(outputRoot, 'functions', 'api', 'agents', 'coffee.func');
  fs.mkdirSync(outDir, { recursive: true });

  const entry = path.join(projectRoot, 'server', 'coffee-handler.ts');
  esbuild.buildSync({
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
}

function main() {
  const projectRoot = process.cwd();
  const outputRoot = path.join(projectRoot, '.vercel', 'output');

  console.log('[build] Building Next.js application (optional for local dev)');
  try {
    run('npm run build', projectRoot);
  } catch (error) {
    console.warn('[build] next build failed or produced no output; continuing with custom bundling');
  }

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(outputRoot, 'functions'), { recursive: true });
  fs.mkdirSync(path.join(outputRoot, 'static'), { recursive: true });

  copyDir(path.join(projectRoot, 'public'), path.join(outputRoot, 'static'));

  bundleServerless({ projectRoot, outputRoot });

  writeJSON(path.join(outputRoot, 'config.json'), { version: 3 });

  console.log('[build] Build output ready at .vercel/output');
}

main();

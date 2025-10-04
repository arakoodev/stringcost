const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: ROOT,
    env: { ...process.env },
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }
}

test('create-stringcost-app scaffolds, builds, and outputs Vercel bundle', async () => {
  run('npm', ['run', 'build', '--workspace', 'create-stringcost-app']);

  const projectDir = await fs.mkdtemp(path.join(tmpdir(), 'stringcost-smoke-'));

  try {
    run(process.execPath, [
      path.join(ROOT, 'packages/create-stringcost-app/dist/index.js'),
      projectDir,
      '--template',
      'next-app',
    ]);

    const frameworkSource = path.join(ROOT, 'packages/framework');
    const frameworkTargetDir = path.join(projectDir, 'node_modules', '@stringcost');
    await fs.mkdir(frameworkTargetDir, { recursive: true });
    const frameworkTarget = path.join(frameworkTargetDir, 'framework');
    await fs.symlink(frameworkSource, frameworkTarget, 'junction');

    const buildResult = spawnSync('node', ['build.js'], {
      stdio: 'inherit',
      cwd: projectDir,
      env: { ...process.env, NODE_PATH: path.join(ROOT, 'node_modules') },
    });
    if (buildResult.error) throw buildResult.error;
    if (buildResult.status !== 0) {
      throw new Error(`Template build.js exited with code ${buildResult.status}`);
    }

    const outputRoot = path.join(projectDir, '.vercel', 'output');
    const expected = [
      'config.json',
      path.join('functions', 'api', 'agents', 'coffee.func', 'index.js'),
      path.join('functions', 'api', 'agents', 'coffee.func', '.vc-config.json'),
      path.join('static', 'index.html'),
      path.join('static', 'main.js'),
      path.join('static', 'style.css'),
    ];

    for (const relative of expected) {
      const target = path.join(outputRoot, relative);
      await fs.access(target);
    }

    const configPath = path.join(outputRoot, 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    assert.equal(config.version, 3, 'config.json should declare version 3');
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true });
  }
});

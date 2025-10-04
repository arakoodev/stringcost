#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';

interface CliOptions {
  template: string;
  install?: boolean;
}

async function main() {
  const program = new Command();

  program
    .name('create-stringcost-app')
    .argument('[directory]', 'target directory', '.')
    .option('--template <name>', 'template to use', 'next-app')
    .option('--install', 'install dependencies after scaffolding')
    .parse(process.argv);

  const directoryArg = program.args[0] as string;
  const options = program.opts<CliOptions>();
  const projectDir = path.resolve(process.cwd(), directoryArg);
  const projectName = path.basename(projectDir);

  await ensureWritableDirectory(projectDir);

  console.log('Scaffolding stringcost project...');

  try {
    const templateDir = resolveTemplateDir(options.template);
    await fs.copy(templateDir, projectDir);

    await processTemplateFiles(projectDir, projectName);

    console.log('✅ Project files generated');

    if (options.install) {
      await runInstall(projectDir);
    } else {
      console.log(
        '\nDependencies not installed. Run `npm install` (or your preferred package manager) inside the project folder when ready.'
      );
    }

    console.log('\nNext steps:');
    console.log(`  cd ${projectName}`);
    if (!options.install) {
      console.log('  npm install');
    }
    console.log('  npm run dev  # start Next.js dev server');
    console.log(`\nBuild for Vercel:`);
    console.log('  node build.js');
    console.log('  vercel deploy --prebuilt  # when ready');
  } catch (error) {
    console.error('❌ Failed to scaffold project');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

async function ensureWritableDirectory(target: string) {
  const exists = await fs.pathExists(target);
  if (!exists) {
    await fs.mkdirp(target);
    return;
  }

  const contents = await fs.readdir(target);
  if (contents.length > 0) {
    throw new Error(`Target directory "${target}" is not empty.`);
  }
}

function resolveTemplateDir(templateName: string): string {
  const currentFile = fileURLToPath(import.meta.url);
  const packageRoot = path.dirname(path.dirname(currentFile));
  const templatesRoot = path.resolve(packageRoot, '..', 'templates');
  const templateDir = path.join(templatesRoot, templateName);

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template "${templateName}" not found at ${templateDir}.`);
  }

  return templateDir;
}

async function processTemplateFiles(projectDir: string, projectName: string) {
  const tplFiles = await glob('**/*.tpl', { cwd: projectDir, dot: true });

  for (const relative of tplFiles) {
    const absolute = path.join(projectDir, relative);
    const contents = await fs.readFile(absolute, 'utf8');
    const replaced = contents.replace(/{{projectName}}/g, projectName);
    const destination = absolute.replace(/\.tpl$/, '');
    await fs.writeFile(destination, replaced, 'utf8');
    await fs.remove(absolute);
  }
}

async function runInstall(projectDir: string) {
  console.log('Installing dependencies...');
  try {
    await execa('npm', ['install'], {
      cwd: projectDir,
      stdio: 'inherit',
    });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.error('❌ Dependency installation failed');
    throw error;
  }
}

main();

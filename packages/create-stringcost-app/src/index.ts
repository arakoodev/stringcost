#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs-extra';
import { glob } from 'glob';
import kleur from 'kleur';
import ora from 'ora';
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

  const spinner = ora('Scaffolding stringcost project').start();

  try {
    const templateDir = resolveTemplateDir(options.template);
    await fs.copy(templateDir, projectDir);

    await processTemplateFiles(projectDir, projectName);

    spinner.succeed('Project files generated');

    if (options.install) {
      await runInstall(projectDir);
    } else {
      console.log(
        kleur.yellow(
          '\nDependencies not installed. Run `npm install` (or your preferred package manager) inside the project folder when ready.'
        )
      );
    }

    console.log('\nNext steps:');
    console.log(`  ${kleur.cyan('cd')} ${kleur.bold(projectName)}`);
    if (!options.install) {
      console.log(`  ${kleur.cyan('npm install')}`);
    }
    console.log(`  ${kleur.cyan('npm run dev')}  # start Next.js dev server`);
    console.log(`\nBuild for Vercel:`);
    console.log(`  ${kleur.cyan('node build.js')}`);
    console.log(`  ${kleur.cyan('vercel deploy --prebuilt')}  # when ready`);
  } catch (error) {
    spinner.fail('Failed to scaffold project');
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
  const spinner = ora('Installing dependencies').start();
  try {
    await execa('npm', ['install'], {
      cwd: projectDir,
      stdio: 'inherit',
    });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Dependency installation failed');
    throw error;
  }
}

main();

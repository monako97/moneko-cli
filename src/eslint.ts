import path from 'path';
import { program } from 'commander';
import { runLint } from './runlint';
import { nodePath } from './utils/config';

program
  .command('eslint <soucre>')
  .option('-o, --output-file')
  .option('-f, --format')
  .option('--color, --no-color')
  .option('--fix')
  .option('--fix-dry-run')
  .option('--ext')
  .description('js代码规范检查')
  .action((soucre, _, cmd) => {
    const shellSrc = `${nodePath}npx eslint ${path.relative(
      process.cwd(),
      soucre
    )} --ext js,ts,jsx,tsx,md,mdx,vue ${cmd.parent.args.slice(2).join(' ')}`;

    runLint(shellSrc, 'eslint');
  });

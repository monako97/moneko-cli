import { join, relative } from 'path';
import { program } from 'commander';
import { runLint } from './runlint.js';
import { cachePath, cwd, nodePath } from './utils/config.js';
import require from './utils/require.js';

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
    const eslint = join(require.resolve('eslint'), '../../bin/eslint.js');
    const shellSrc = `${nodePath}npx ${eslint} ${relative(
      cwd,
      soucre
    )} --ext js,ts,jsx,tsx,md,mdx,vue ${cmd.parent.args
      .slice(2)
      .join(' ')} --cache --cache-location "${cachePath}/.eslintcache"`;

    runLint(shellSrc, 'eslint');
  });

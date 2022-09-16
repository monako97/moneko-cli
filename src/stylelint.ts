import path from 'path';
import { program } from 'commander';
import { nodePath } from './utils/config';
import { runLint } from './runlint';

program
  .command('stylelint <soucre>')
  .option('-o, --output-file')
  .option('-f, --format')
  .option('--color, --no-color')
  .option('--fix')
  .option('--fix-dry-run')
  .option('--ext')
  .description('css代码规范检查')
  .action((soucre, _, cmd) => {
    const shellSrc = `${nodePath}npx stylelint ${path.relative(process.cwd(), soucre)}/**/**/**/**/*.{less,css} ${cmd.parent.args.slice(2).join(' ')}`;

    runLint(shellSrc, 'stylelint');
  });

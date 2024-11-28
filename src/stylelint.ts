import { relative, join } from 'path';
import { program } from 'commander';
import { cachePath, cwd, runtimePath } from './utils/config.js';
import { runLint } from './runlint.js';
import require from './utils/require.js';

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
    const stylelint = join(require.resolve('stylelint'), '../../bin/stylelint.mjs');
    const exts = ['less', 'css', 'scss', 'sass', 'style.ts', 'style.js'];
    const shellSrc = `${runtimePath} ${stylelint} ${relative(
      cwd,
      soucre
    )}/**/**/**/**/*.{${exts.join(',')}} ${cmd.parent.args
      .slice(2)
      .join(' ')} --cache --cache-location "${cachePath}/.stylelintcache" --aei`;

    runLint(shellSrc, 'stylelint');
  });

import { program } from 'commander';
import { runLint } from './runlint.js';

program
  .command('githooks')
  .description('git hooks工具')
  .action((_, cmd) => {
    const installPath = 'node_modules/.husky';
    const huskySet = cmd.args
      .map((h: string) => {
        const argv = h.split('=');

        return `echo "${argv[1]}" > ${installPath}/${argv[0]}`;
      })
      .join(' && ');
    const shellSrc = `git init && husky ${installPath} && ${huskySet}`;
    runLint(shellSrc, 'githooks', [null]);
  });

import { program } from 'commander';
import { runLint } from './runlint';

program
  .command('githooks')
  .description('git hooks工具')
  .action((_, cmd) => {
    const installPath = 'node_modules/.husky';
    const huskySet = cmd.args
      .map((h: string) => {
        const argv = h.split('=');

        return `husky set ${installPath}/${argv[0]} "${argv[1]}"`;
      })
      .join(' && ');
    const shellSrc = `git init && husky install ${installPath} && ${huskySet}`;
    runLint(shellSrc, 'githooks', [null]);
  });


import { program } from 'commander';
import { runLint } from './runlint';

program
    .command('githooks [file] [cmd]')
    .description('git hooks工具')
    .action((file, cmd) => {
        const shellSrc = `git init && husky install node_modules/.husky && husky set node_modules/.husky/${file} \"${cmd}\"`;

        runLint(shellSrc, 'githooks', [null]);
    });

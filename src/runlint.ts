import { spawnSync, StdioOptions } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';

export const runLint = (shellSrc: string, pluginName: string, stdio: StdioOptions = 'inherit') => {
  const pkg = chalk.cyan(pluginName);

  process.stdout.write(pkg + ': ' + chalk.yellow('Runing...'));
  const child = spawnSync(shellSrc, {
    stdio: stdio,
    shell: true
  });

  readline.cursorTo(process.stdout, 0);
  const color = child.status !== 0 ? chalk.red : chalk.green;
  const output = color(`✨ ${child.status !== 0 ? 'Error' : 'Successfully'}! \n`);

  process.stdout.write(pkg + ': ' + output);
  process.exit(child.status || 0);
};

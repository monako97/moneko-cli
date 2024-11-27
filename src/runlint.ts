import { ink, print } from '@moneko/utils';
import { spawnSync, StdioOptions } from 'child_process';

export const runLint = (shellSrc: string, pluginName: string, stdio: StdioOptions = 'inherit') => {
  const pkg = ink(pluginName, 'cyan');

  print(pkg + ': ' + ink('Runing...', 'yellow'), true);
  const child = spawnSync(shellSrc, {
    stdio: stdio,
    shell: true
  });

  const output = ink(`✨ ${child.status !== 0 ? 'Error' : 'Successfully'}! \n`, child.status !== 0 ? 'red' : 'green');

  print(pkg + ': ' + output, true);
  process.exit(child.status || 0);
};

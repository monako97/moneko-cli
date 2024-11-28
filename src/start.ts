import { spawn } from 'child_process';
import { program } from 'commander';
import { ink, println } from '@moneko/utils';
import { corePackageName, nodePath, runtimePath } from './utils/config.js';
import setupEnv from './utils/setup-env.js';
import require from './utils/require.js';

program
  .command('start <type> <framework>')
  .description('运行项目')
  .action(async (type, framework, ...cmd) => {
    if (!type) {
      println(ink('type: 无效值 ' + ink(type, '245'), 'red'));
      process.exit(1);
    }
    await setupEnv('development', type, framework);
    const args: string[] = cmd[1].args.slice(2),
      hasNoVerify = args.indexOf('no-verify');
    if (hasNoVerify !== -1) {
      args.splice(hasNoVerify, 1);
    }

    spawn(
      `${args.length?nodePath+"npx "+args.join(" "):""}${runtimePath} ${require.resolve(
        `${corePackageName}/lib/dev.mjs`
      )}`,
      {
        stdio: 'inherit',
        shell: true,
      }
    );
  });

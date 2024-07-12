import { spawn } from 'child_process';
import chalk from 'chalk';
import { program } from 'commander';
import { corePackageName, nodePath } from './utils/config.js';
import setupEnv from './utils/setup-env.js';
import require from './utils/require.js';

program
  .command('start <type> <framework>')
  .description('运行项目')
  .action((type, framework, ...cmd) => {
    if (!type) {
      process.stdout.write(chalk.red('type: 无效值 ' + chalk.gray(type)));
      process.exit(1);
    }
    setupEnv('development', type, framework);
    const args: string[] = cmd[1].args.slice(2),
      hasNoVerify = args.indexOf('no-verify');
    if (hasNoVerify !== -1) {
      args.splice(hasNoVerify, 1);
    }

    spawn(
      `${nodePath}npx ${args.join(' ')} ${nodePath}node ${require.resolve(
        `${corePackageName}/lib/dev.mjs`
      )}`,
      {
        stdio: 'inherit',
        shell: true,
      }
    );
  });

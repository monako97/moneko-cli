import { type SpawnOptions, spawn } from 'child_process';
import { join, relative } from 'path';
import chalk from 'chalk';
import { program } from 'commander';
import setupEnv from './utils/setup-env.js';
import { lesscCommonjs } from './lessc.js';
import { cliName, nodePath, corePackageName, cwd, swcCachePath } from './utils/config.js';
import { getLastVersion } from './utils/get-pkg.js';
import { rmDirAsyncParalle } from './utils/rmdoc.js';
import setupSwcRc from './utils/setup-swcrc.js';
import require from './utils/require.js';
import { __dirname } from './file.js';
import { deleteEmptyDirs, updateFileSync } from '@moneko/utils';

const spawnOptions: SpawnOptions = { stdio: 'inherit', shell: true };

program
  .command('build <type> <framework>')
  .description('编译项目')
  .action((type, framework, ...cmd) => {
    if (!type) {
      process.stdout.write(chalk.red(`type: 无效值 ${chalk.gray(type)}`));
      process.exit(1);
    }
    setupEnv('production', type, framework);
    getLastVersion(cliName, null, true);
    const args: string[] = cmd[1].args.slice(2);
    const hasDocs = !args.includes('no-docs');
    const hasLib = !args.includes('no-lib');
    const hasEs = !args.includes('no-es');
    const shellSrc = `${nodePath}npx ${args
      .filter((a) => !['no-docs', 'no-es', 'no-lib'].includes(a))
      .join(' ')} ${nodePath}node ${require.resolve(`${corePackageName}/lib/build.mjs`)}`;

    if (type === 'library') {
      const swcrc = setupSwcRc(framework);
      const tsc = require.resolve('typescript/bin/tsc');
      const swc = require.resolve('@swc/cli/bin/swc.js');

      const buildLib = [
        hasLib && { type: 'commonjs', dir: 'lib' },
        hasEs && { type: 'es6 -C jsc.target=es2015', dir: 'es' },
      ].filter(Boolean) as {
        type: string;
        dir: string;
      }[];

      for (let i = 0, len = buildLib.length; i < len; i++) {
        const dir = join(cwd, `./${buildLib[i].dir}`);

        spawn(`rm -rf ${dir}`, spawnOptions);
        // 编译 package
        const convert = spawn(
          `${nodePath}npx ${swc} components -d ${buildLib[i].dir} --strip-leading-paths --config-file ${swcrc} -C jsc.experimental.cacheRoot=${swcCachePath} -C module.type=${buildLib[i].type} --copy-files`,
          spawnOptions
        );

        convert.on('close', function (code) {
          if (code === 0) {
            // 去除 package 中的文档文件
            rmDirAsyncParalle(dir, () => {});
            deleteEmptyDirs(dir);
            if (buildLib[i].type === 'commonjs') {
              lesscCommonjs();
            }
          }
        });
      }
      if (buildLib.length) {
        const pkgPath = join(__dirname, '.types.json');

        updateFileSync(
          pkgPath,
          JSON.stringify({
            extends: relative(__dirname, join(cwd, 'tsconfig.json')),
            include: [
              relative(__dirname, join(cwd, 'components')),
              relative(__dirname, join(cwd, 'typings')),
            ],
            exclude: [
              relative(__dirname, join(cwd, 'components/**/examples/*')),
              relative(__dirname, join(cwd, 'components/**/__tests__/*')),
              relative(__dirname, join(cwd, 'components/**/__mocks__/*')),
            ],
          })
        );
        spawn(`rm -rf ./types`, spawnOptions);
        // 编译类型文件
        spawn(`${nodePath}npx ${tsc} --project ${pkgPath} --outDir types`, spawnOptions);
      }
    }
    if (type !== 'library' || (hasDocs && type === 'library')) {
      const build = spawn(shellSrc, spawnOptions);

      build.on('close', async function () {
        process.exit(0);
      });
    }
  });

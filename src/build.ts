import { type SpawnOptions, spawn } from 'child_process';
import { join, relative } from 'path';
import chalk from 'chalk';
import { program } from 'commander';
import { lesscCommonjs } from './lessc.js';
import { cliName, nodePath, runtimePackageName } from './utils/config.js';
import { getLastVersion } from './utils/get-pkg.js';
import { deleteEmptyDir, rmDirAsyncParalle } from './utils/rmdoc.js';

const cwd = process.cwd();
const spawnOptions: SpawnOptions = { stdio: 'inherit', shell: true };

program
  .command('build <type> <framework>')
  .description('编译项目')
  .action((type, framework, ...cmd) => {
    if (!type) {
      process.stdout.write(chalk.red(`type: 无效值 ${chalk.gray(type)}`));
      process.exit(1);
    }
    getLastVersion(cliName, null, true);
    const args = cmd[1].args.slice(2);
    const hasDocs = !args.includes('no-docs');
    const hasLib = !args.includes('no-lib');
    const hasEs = !args.includes('no-es');
    const confPath = relative(process.cwd(), `./node_modules/${runtimePackageName}/lib/prod.js`);
    const shellSrc = `${nodePath}npx cross-env NODE_ENV=production APPTYPE=${type} FRAMEWORK=${framework} ${args
      .filter((a: string) => !['no-docs', 'no-es', 'no-lib'].includes(a))
      .join(' ')} webpack --config ${confPath}`;

    if (type === 'library') {
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
        const swc = spawn(
          `${nodePath}npx swc components -d ${buildLib[i].dir} --config-file ${join(
            cwd,
            `./node_modules/${cliName}/conf/swc`,
          )} -C jsc.experimental.cacheRoot=${process.cwd()}/node_modules/.swc -C module.type=${buildLib[i].type} --copy-files`,
          spawnOptions,
        );

        swc.on('close', function (code) {
          if (code === 0) {
            // 去除 package 中的文档文件
            rmDirAsyncParalle(dir, () => {});
            deleteEmptyDir(dir);
            if (buildLib[i].type === 'commonjs') {
              lesscCommonjs();
            }
          }
        });
        // 编译类型文件
        spawn(
          `${nodePath}npx tsc --project ${join(
            cwd,
            `./node_modules/${cliName}/conf/pkg.json`,
          )} --outDir ${buildLib[i].dir}`,
          spawnOptions,
        );
      }
    }
    if (type !== 'library' || (hasDocs && type === 'library')) {
      const build = spawn(shellSrc, spawnOptions);

      build.on('close', async function () {
        process.exit(0);
      });
    }
  });

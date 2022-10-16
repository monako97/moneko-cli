import { spawn, SpawnOptions } from 'child_process';
import { join, relative } from 'path';
import { program } from 'commander';
import { cliName, nodePath, runtimePackageName } from './utils/config.js';
import { getLastVersion } from './utils/get-pkg.js';
import chalk from 'chalk';
import { deleteEmptyDir, rmDirAsyncParalle } from './utils/rmdoc.js';
import { lesscCommonjs } from './lessc.js';

const cwd = process.cwd();
const spawnOptions: SpawnOptions = { stdio: 'inherit', shell: true };

program
  .command('build <type>')
  .description('编译项目')
  .action((type, ...cmd) => {
    if (!type) {
      process.stdout.write(chalk.red('type: 无效值 ' + chalk.gray(type)));
      process.exit(1);
    }
    getLastVersion(cliName, null, true);
    const args = cmd[1].args;

    if (args[0] === 'library') {
      const buildLib = [
        { type: 'commonjs', dir: 'lib' },
        { type: 'es6', dir: 'es' },
      ];

      for (let i = 0, len = buildLib.length; i < len; i++) {
        const dir = join(cwd, `./${buildLib[i].dir}`);

        spawn(`rm -rf ${dir}`, spawnOptions);
        // 编译 package
        const swc = spawn(
          `${nodePath}npx swc components -d ${buildLib[i].dir} -C module.type=${buildLib[i].type} -C minify=true -C jsc.parser.tsx=true -C jsc.parser.syntax=typescript --copy-files`,
          spawnOptions
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
        spawn(`${nodePath}npx tsc --project ${join(cwd, `./node_modules/${cliName}/conf/pkg.json`)} --outDir ${buildLib[i].dir}`, spawnOptions);
      }
    }
    spawn(
      `${nodePath}npx cross-env NODE_ENV=production APPTYPE=${args.join(
        ' '
      )} webpack --config ${relative(
        cwd,
        `./node_modules/${runtimePackageName}/build/webpack.prod`
      )}`,
      spawnOptions
    );
  });

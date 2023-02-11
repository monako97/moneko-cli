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
    const hasDocs = !args.includes('no-docs');
    const hasLib = !args.includes('no-lib');
    const hasEs = !args.includes('no-es');
    const tsconfig = relative(process.cwd(), `tsconfig.json`);
    const confPath = relative(
      process.cwd(),
      `./node_modules/${runtimePackageName}/build/webpack.prod`
    );
    const shellSrc = `${nodePath}npx cross-env NODE_ENV=production APPTYPE=${args
      .filter((a: string) => !['no-docs', 'no-es', 'no-lib'].includes(a))
      .join(' ')} webpack --config ${confPath}`;

    if (args[0] === 'library') {
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
        spawn(
          `${nodePath}npx tsc --project ${join(
            cwd,
            `./node_modules/${cliName}/conf/pkg.json`
          )} --outDir ${buildLib[i].dir}`,
          spawnOptions
        );
      }
    }
    if (args[0] !== 'library' || (hasDocs && args[0] === 'library')) {
      if (args[0] === 'single-component') {
        const cjsShell = [
          'rm -rf lib',
          hasLib && 'swc src -d lib -C module.type=es6 -C minify=true -s --copy-files',
          `tsc --project ${tsconfig}`,
        ]
          .filter(Boolean)
          .join(' && ');
        const cjsBuild = spawn(cjsShell, {
          stdio: 'inherit',
          shell: true,
        });
  
        cjsBuild.on('close', function (code) {
          if (code !== 0) {
            process.exit(0);
          }
        });
      }
      const build = spawn(shellSrc, spawnOptions);
  
      build.on('close', function (code) {
        if (code === 0 && args[0] === 'single-component') {
          const dtsShell = [
            'dts-bundle --name flowchart-designer --baseDir . --out umd/index.d.ts --main lib/index.d.ts',
            !hasLib && 'rm -rf lib',
          ]
            .filter(Boolean)
            .join(' && ');
          spawn(dtsShell, {
            stdio: 'inherit',
            shell: true,
          });
        }
      });
    }
  });

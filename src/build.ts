import { type SpawnOptions, spawn } from 'child_process';
import { join, relative } from 'path';
import { program } from 'commander';
import setupEnv from './utils/setup-env.js';
import { lesscCommonjs } from './lessc.js';
import { corePackageName, cwd, swcCachePath, runtimePath } from './utils/config.js';
import setupSwcRc from './utils/setup-swcrc.js';
import require from './utils/require.js';
import { __dirname } from './file.js';
import { deleteEmptyDirs, updateFileSync, removeDir, ink, println, scanFolderSync, removeFile } from '@moneko/utils';

const spawnOptions: SpawnOptions = { stdio: 'inherit', shell: true };

program
  .command('build <type> <framework>')
  .description('编译项目')
  .action(async (type, framework, ...cmd) => {
    if (!type) {
      println(ink(`type: 无效值 ${ink(type, '245')}`, 'red'));
      process.exit(1);
    }
    await setupEnv('production', type, framework);
    const args: string[] = cmd[1].args.slice(2);
    const hasDocs = !args.includes('no-docs'),
      hasLib = !args.includes('no-lib'),
      hasEs = !args.includes('no-es');
    // const _prefix = args.filter((a) => !['no-docs', 'no-es', 'no-lib'].includes(a)).join(' ');

    const shellSrc = `${runtimePath} ${require.resolve(`${corePackageName}/lib/build.mjs`)}`;

    if (type === 'library') {
      const swcrc = setupSwcRc(framework);
      const tsc = require.resolve('typescript/bin/tsc');
      const swc = require.resolve('@swc/cli/bin/swc.js');

      const buildLib = [
        hasLib && { type: 'commonjs', dir: 'lib', msg: 'Convert to CommonJS' },
        hasEs && { type: 'es6 -C jsc.target=es2015', dir: 'es', msg: 'Convert to ES Module' },
      ].filter(Boolean) as {
        type: string;
        dir: string;
        msg: string;
      }[];

      const pkgPath = join(__dirname, '.types.json');

      if (buildLib.length) {
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
      }
      for (let i = 0, len = buildLib.length; i < len; i++) {
        const dir = join(cwd, `./${buildLib[i].dir}`);

        removeDir(dir);
        // 编译 package
        const convert = spawn(
          `${runtimePath} ${swc} components -d ${buildLib[i].dir} -q --strip-leading-paths --config-file ${swcrc} -C jsc.experimental.cacheRoot=${swcCachePath} -C module.type=${buildLib[i].type} -D --ignore "**/*.test.(js|ts)x?$"`,
          spawnOptions
        );

        convert.on('close', function (code) {
          if (code === 0) {
            // 去除 package 中的文档文件
            scanFolderSync(dir, ['README.mdx', 'examples', '__*__']).forEach(removeFile);
            deleteEmptyDirs(dir);
            if (buildLib[i].type === 'commonjs') {
              lesscCommonjs();
            }
          }
        });
        // 编译类型文件
        spawn(
          `${runtimePath} ${tsc} --project ${pkgPath} --outDir ${buildLib[i].dir}`,
          spawnOptions
        );
      }
    }
    if (type !== 'library' || (hasDocs && type === 'library')) {
      spawn(shellSrc, spawnOptions);
    }
  });

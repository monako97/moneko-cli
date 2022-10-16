import { spawnSync } from 'child_process';
import path from 'path';
import { program } from 'commander';
import {
  cliAlias,
  cliName,
  eslintPackageName,
  nodePath,
  runtimePackageName,
  stylelintPackageName,
} from './utils/config.js';
import { readFileSync, __dirname } from './file.js';
import { getLastVersion } from './utils/get-pkg.js';
import chalk from 'chalk';
import { deleteEmptyDir, rmDirAsyncParalle } from './utils/rmdoc.js';
import shell from 'shelljs';

program
  .command('build <type>')
  .description('编译项目')
  .action((type, ...cmd) => {
    if (!type) {
      process.stdout.write(chalk.red('type: 无效值 ' + chalk.gray(type)));
      process.exit(1);
    }
    getLastVersion(cliName, null, true);
    const args = cmd[1].args,
      hasNoVerify = args.indexOf('no-verify');

    if (hasNoVerify !== -1) {
      args.splice(hasNoVerify, 1);
      const projectPkgJson = JSON.parse(readFileSync(path.join(process.cwd(), './package.json')));
      const hasStylelint = Object.prototype.hasOwnProperty.call(
        projectPkgJson.devDependencies,
        stylelintPackageName
      );
      const hasEslint = Object.prototype.hasOwnProperty.call(
        projectPkgJson.devDependencies,
        eslintPackageName
      );
      const lintShell = [
        hasStylelint && `${cliAlias} stylelint fix`,
        hasEslint && `${cliAlias} eslint fix`,
      ]
        .filter(Boolean)
        .join(' && ');

      if (hasStylelint || hasEslint) {
        const child = spawnSync(lintShell, {
          stdio: 'inherit',
          shell: true,
        });

        if (child.status !== 0) {
          process.exit(0);
        }
      }
    }

    if (args[0] === 'library') {
      const buildLib = [
        { type: 'commonjs', dir: 'lib' },
        { type: 'es6', dir: 'es' },
      ];

      for (let i = 0, len = buildLib.length; i < len; i++) {
        const dir = path.join(process.cwd(), `./${buildLib[i].dir}`);

        shell.exec(`rm -rf ${dir}`, { silent: true });
        // 编译 package
        const buildPkg = spawnSync(
          `${nodePath}npx swc components -d ${buildLib[i].dir} -C module.type=${buildLib[i].type} -C minify=true -C jsc.parser.tsx=true -C jsc.parser.syntax=typescript --copy-files`,
          {
            stdio: 'inherit',
            shell: true,
          }
        );

        if (buildPkg.status !== 0) {
          process.exit(0);
        }
        // 去除 package 中的文档文件
        rmDirAsyncParalle(dir, () => {});
        deleteEmptyDir(dir);
        // 编译类型文件
        const buildType = spawnSync(`${nodePath}npx tsc --project pkg.json --outDir ${buildLib[i].dir}`, {
          stdio: 'inherit',
          shell: true,
        });

        if (buildType.status !== 0) {
          process.exit(0);
        }
      }
    }
    const confPath = path.relative(
      process.cwd(),
      `./node_modules/${runtimePackageName}/build/webpack.prod`
    );
    const shellSrc = `${nodePath}npx cross-env NODE_ENV=production APPTYPE=${args.join(
      ' '
    )} webpack --config ${confPath}`;
    const build = spawnSync(shellSrc, {
      stdio: 'inherit',
      shell: true,
    });

    process.exit(build.status || 0);
  });

import readline from 'readline';
import shelljs from 'shelljs';
import chalk from 'chalk';
import { cliPkgJson, nodePath } from './config.js';

const npm = chalk.magentaBright('npm'),
  cli = chalk.magentaBright(cliPkgJson.name),
  uninstall = chalk.red('uninstall'),
  update = chalk.underline('update'),
  install = chalk.green('install'),
  scope = chalk.dim('-g'),
  _package = chalk.magentaBright('package'),
  localVersionTag = chalk.bgRed(` 当前版本: ${chalk.yellow(cliPkgJson.version)} `);

let fetchList: string[] = [],
  doneFetch = [];

export function isFunc(obj: any) {
  return Object.prototype.toString.call(obj) === '[object Function]';
}

export const getLastVersion = (pkg: string, callback?: ((val: string) => string) | null, silent?: boolean) => {
  fetchList.push(pkg);
  const first = fetchList.length === 1 ? '' : chalk.magenta('fetch ');

  readline.cursorTo(process.stdout, 0);
  if (!silent) {
    process.stdout.write(
      first + fetchList.map((item) => chalk.cyan(item)).join(', ') + ': ...',
      'utf-8'
    );
  }

  shelljs.exec(
    `${nodePath}npm view ${pkg} version`,
    {
      silent: true,
      async: true
    },
    (code, stdout, stderr) => {
      let version = stdout,
        oth = '';

      doneFetch.push(fetchList.splice(pkg as unknown as number, 1));

      if (stderr) {
        return isFunc(callback) && (callback as Function)('last');
      }
      if (cliPkgJson.name === pkg && stdout.replace(/\n/, '') !== cliPkgJson.version) {
        version = stdout.replace(/\n/, '');
        const updateSh = [npm, update, cli, scope].join(' ');
        const reInstall = [npm, uninstall, cli, scope, '&&', npm, install, cli, scope].join(' ');
        const tagSh =
          localVersionTag +
          chalk.yellow(' --> ') +
          chalk.bgGreen(` 最新版本: ${chalk.yellow(version)} \n`);

        oth = [
          ' ',
          tagSh,
          '\n',
          chalk.yellow(`请运行命令以下更新cli: \n\n`),
          chalk.bgGrey(` ${[updateSh, reInstall].join(' 或 ')} `),
          '\n\n'
        ].join('');
      }
      let versionOutput = '';

      if (!silent) {
        versionOutput =
          (doneFetch.length === 1 ? '\n' : '') +
          chalk.magenta('fetch ') +
          chalk.cyan(pkg) +
          ': ' +
          chalk.dim('^' + version);
      }
      process.stdout.write(versionOutput + oth, 'utf-8');

      if (fetchList.length === 0 && !silent) {
        process.stdout.write(
          [chalk.magenta('fetch'), npm, _package, 'all', chalk.green('✨ Done!')].join(' '),
          'utf-8'
        );
      }
      return isFunc(callback) && (callback as Function)(stdout.replace(/\n/, ''));
    }
  );
};

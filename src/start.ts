import fs from 'fs';
import readline from 'readline';
import path from 'path';
import child_process from 'child_process';
import chalk from 'chalk';
import shell from 'shelljs';
import { program } from 'commander';
import { cliName, nodePath, runtimePackageName } from './utils/config.js';
import { getLastVersion } from './utils/get-pkg.js';

let startStatus: boolean = false,
  _execText: string | undefined,
  child: child_process.ChildProcess | undefined | null,
  watchConfig: boolean = false,
  DEVSERVERPORT: number;

function start(execText?: string) {
  startStatus = false;
  if (!_execText) {
    _execText = execText;
  }
  child = child_process.spawn(_execText as string, {
    stdio: 'inherit',
    shell: true,
  });
  child?.addListener('exit', function () {
    if (!startStatus) {
      child = null;
    }
    start();
  });
}
const commonPath = path.resolve(
  process.cwd(),
  `./node_modules/${runtimePackageName}/lib/common.js`
);
function restart() {
  if (startStatus) return;
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(chalk.yellow('配置已更新, 正在重新部署...'));
  startStatus = true;
  if (child) {
    import(commonPath).then((v) => {
      DEVSERVERPORT = global.NEKOCLICONFIG.CONFIG.devServer.port;
      if (process.platform === 'win32') {
        const stdout =
          shell.exec(`netstat -ano | grep :${DEVSERVERPORT}`, {
            silent: true,
          }).stdout || '';

        const plist: string[] = [];

        stdout.split('\n').forEach(function (line) {
          const p = line.trim().split(/\s+/);

          // 查找端口对应的进程id
          if (
            typeof p[1] !== 'undefined' &&
            (p[1].match(/([^:]+)$/) as string[])[1] == DEVSERVERPORT.toFixed()
          ) {
            if (!plist.includes(p[4])) {
              process.kill(p[4] as unknown as number, 'SIGINT');
              plist.push(p[4]);
            }
          }
        });
      } else if (child) {
        process.kill(child.pid as number, 'SIGINT');
      }
    });
  } else {
    start();
  }
}

function watchCustomConfig() {
  const configPath = path.resolve(process.cwd(), './config/index.ts');

  if (fs.existsSync(configPath)) {
    fs.unwatchFile(configPath);
    fs.watchFile(configPath, {}, function () {
      restart();
    });
  } else {
    process.stdout.write('没有发现自定义配置\n');
  }
}
program
  .command('start <type> <framework>')
  .description('运行项目')
  .action((type, framework, ...cmd) => {
    if (!type) {
      process.stdout.write(chalk.red('type: 无效值 ' + chalk.gray(type)));
      process.exit(1);
    }
    getLastVersion(cliName, null, true);
    const args = cmd[1].args.slice(2),
      hasNoVerify = args.indexOf('no-verify');
    if (hasNoVerify !== -1) {
      args.splice(hasNoVerify, 1);
    }
    const confPath = path.relative(
      process.cwd(),
      `./node_modules/${runtimePackageName}/lib/dev.js`
    );
    const shellSrc = `${nodePath}npx cross-env NODE_ENV=development APPTYPE=${type} FRAMEWORK=${framework} ${args.join(
      ' '
    )} webpack serve --config ${confPath}`;

    if (!watchConfig) {
      watchCustomConfig();
      watchConfig = true;
    }
    start(shellSrc);
  });

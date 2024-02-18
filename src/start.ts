import fs from 'fs';
import readline from 'readline';
import path from 'path';
import child_process from 'child_process';
import chalk from 'chalk';
import shell from 'shelljs';
import { program } from 'commander';
import { cliName, corePackageName, cwd, nodePath } from './utils/config.js';
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
  cwd,
  `./node_modules/${corePackageName}/lib/config.mjs`
);
function restart() {
  if (startStatus) return;
  startStatus = true;
  process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(chalk.yellow('配置已更新, 正在重新部署...\n'));
  if (child) {
    import(commonPath).then((v) => {
      DEVSERVERPORT = global.NEKOCLICONFIG.CONFIG.devServer.port;
      if (process.platform === 'win32') {
        const stdout =
          shell.exec(`netstat -ano | grep :${DEVSERVERPORT}`, {
            silent: true,
          }).stdout || '';
        const posts: string[] = [];

        stdout.split('\n').forEach(function (line) {
          const p = line.trim().split(/\s+/);

          // 查找端口对应的进程id
          if (
            typeof p[1] !== 'undefined' &&
            (p[1].match(/([^:]+)$/) as string[])[1] == DEVSERVERPORT.toFixed()
          ) {
            if (!posts.includes(p[4])) {
              process.kill(p[4] as unknown as number, 'SIGINT');
              posts.push(p[4]);
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
  const configPath = path.resolve(cwd, './config/index.ts');

  if (fs.existsSync(configPath)) {
    const w = fs.watch(configPath, (_, filename) => {
      if (filename === 'index.ts' || filename == `${global.NEKOCLICONFIG.CUSTOMCONFIG}.ts`) {
        restart();
      }
    });
  } else {
    process.stdout.write(chalk.grey('没有发现自定义配置\n'));
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
      cwd,
      `./node_modules/${corePackageName}/lib/dev.mjs`
    );
    const shellSrc = `${nodePath}npx cross-env NODE_ENV=development APPTYPE=${type} FRAMEWORK=${framework} ${args.join(
      ' '
    )} ${nodePath}node ${confPath}`;

    if (!watchConfig) {
      watchCustomConfig();
      watchConfig = true;
    }
    start(shellSrc);
  });

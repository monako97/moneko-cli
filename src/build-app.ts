import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { program } from 'commander';
import inquirer, { InputQuestion } from 'inquirer';
import shell from 'shelljs';
import { bundleApk, bundleIpa } from './utils/bundle-app';
import {
  jsonToPlist,
  jsonToXml,
  jsonToYaml,
  plistToJson,
  xmlToJson,
  yamlToJson,
} from './utils/txml.js';
import { writeFile, readFileSync, __dirname, copyFolderRecursiveSync } from './file.js';

const createApp = async () => {
  interface InputQuestions extends InputQuestion {
    // eslint-disable-next-line no-unused-vars
    async: () => (err: string | null, ok?: boolean) => void;
  }
  inquirer
    .prompt([
      {
        type: 'input',
        name: 'bundleId',
        message: '请输入软件包名称?',
        default: 'com.myoucai.bid',
        validate: function (input: string) {
          const done = (this as unknown as InputQuestions).async();
          const isOk = /(^com\.)([a-zA-Z_][a-zA-Z0-9_]*[.])*([a-zA-Z_][a-zA-Z0-9_]*)$/.test(input);

          if (!isOk || input.split('.').length !== 3) {
            done('软件包名不合法');
            return;
          }

          done(null, true);
        },
      },
      {
        type: 'checkbox',
        name: 'bundles',
        message: '请选择需要打包的类型',
        choices: [
          {
            key: 'bundles',
            name: '打包为apk (release)',
            value: 'apk -release',
          },
          {
            key: 'bundles',
            name: '打包为apk (debug)',
            value: 'apk -debug',
          },
          {
            key: 'bundles',
            name: '打包为ipa (release)[未签名]',
            value: 'ios -release',
          },
          {
            key: 'bundles',
            name: '打包为ipa (debug)[未签名]',
            value: 'ios -debug',
          },
        ],
      },
    ])
    .then(async ({ bundleId, bundles }: { bundleId: string; bundles: string[] }) => {
      const domain = bundleId.split('.');
      const bundle_id = domain.splice(-1, 1).join('');
      const cwd = process.cwd();
      const webAssetsEntry = path.join(cwd, '/dist');

      const sh = `flutter create -t app --org ${bundleId} -i swift -a kotlin ${bundle_id}`;

      const outputPath = path.join(cwd, '/' + bundle_id);

      shell.exec(sh, { silent: true });
      shell.cd(outputPath);

      const webAssetsOutput = path.join(outputPath, 'assets/web/');

      shell.exec('mkdir -p ' + webAssetsOutput, { silent: true });

      process.stdout.write(chalk.yellow('正在注册资产...'));
      // 拷贝 dist
      copyFolderRecursiveSync(webAssetsEntry, webAssetsOutput);
      // pub 依赖
      const pubObjPath = path.join(outputPath, 'pubspec.yaml');
      const pubObj: Record<string, Record<string, string | string[]>> = yamlToJson(
        readFileSync(pubObjPath)
      ) as Record<string, Record<string, string | string[]>>;
      // 自动分析注册资产
      const allAssetsDirs: string[] = [];
      const getAssetsDir = (dirPath: string, baseDir = 'assets/web') => {
        const files = fs.readdirSync(dirPath);

        // 迭代器 异步变同步
        (function iterator(i) {
          if (i == files.length) {
            return;
          }
          const stats = fs.statSync(dirPath + '/' + files[i]);

          if (stats.isDirectory()) {
            allAssetsDirs.push(baseDir + '/' + files[i] + '/');
            getAssetsDir(dirPath + '/' + files[i], baseDir + '/' + files[i]);
          }
          iterator(i + 1);
        })(0);
      };

      getAssetsDir(webAssetsEntry);

      pubObj.dependencies.webview_flutter_plus = '^0.2.3';
      pubObj.flutter.assets = ['assets/web/', ...allAssetsDirs];
      writeFile(pubObjPath, jsonToYaml(pubObj));

      readline.cursorTo(process.stdout, 0);
      process.stdout.write(chalk.cyan('注册资产') + ': ' + chalk.green('完成\n'));
      // 安卓
      if (bundles.includes('apk -release') || bundles.includes('apk -debug')) {
        // 安卓权限配置
        const androidUsesPermissions = [
          {
            $: {
              'android:name': 'android.permission.INTERNET',
            },
          },
          {
            $: {
              'android:name': 'android.permission.ACCESS_NETWORK_STATE',
            },
          },
          {
            $: {
              'android:name': 'android.permission.WAKE_LOCK',
            },
          },
        ];

        process.stdout.write(chalk.yellow('正在配置安卓权限...'));
        // 安卓 配置文件
        const androidMainXmlPath = path.join(
          outputPath,
          'android/app/src/main/AndroidManifest.xml'
        );
        const androidMainXmlJson = await xmlToJson(readFileSync(androidMainXmlPath));

        androidMainXmlJson.manifest.application.$['android:usesCleartextTraffic'] = 'true';
        androidMainXmlJson.manifest['uses-permission'] = androidUsesPermissions;

        const androidMainXml = jsonToXml(androidMainXmlJson);

        writeFile(androidMainXmlPath, androidMainXml);
        // 修改 安卓build.gradle
        const androidBuildGradlePath = path.join(outputPath, 'android/app/build.gradle');
        let androidBuildGradle = readFileSync(androidBuildGradlePath);
        let minSdkVersion = 'minSdkVersion flutter.minSdkVersion';

        if (androidBuildGradle.includes(minSdkVersion)) {
          androidBuildGradle = androidBuildGradle.replace(minSdkVersion, 'minSdkVersion 20');
        } else {
          const minSdkVersionIndex = androidBuildGradle.indexOf('minSdkVersion ');
          const len = androidBuildGradle.substring(minSdkVersionIndex,  minSdkVersionIndex + 16);
  
          androidBuildGradle = androidBuildGradle.replace(len, 'minSdkVersion 20');
        }
        
        writeFile(androidBuildGradlePath, androidBuildGradle);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(chalk.cyan('安卓权限配置') + ': ' + chalk.green('完成 \n'));
      }
      // ios
      if (bundles.includes('ios -release') || bundles.includes('ios -debug')) {
        process.stdout.write(chalk.yellow('开始配置IOS权限'));
        // ios 配置文件
        const iosPlistPath = path.join(outputPath, 'ios/Runner/Info.plist');
        const iosPlist = readFileSync(iosPlistPath);
        const plistJson = Object.assign(plistToJson(iosPlist), {
          NSAppTransportSecurity: {
            NSAllowsArbitraryLoads: true,
          },
          ['io.flutter.embedded_views_preview']: true,
        });

        writeFile(iosPlistPath, jsonToPlist(plistJson));
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(chalk.cyan('IOS权限配置') + ': ' + chalk.green('完成\n'));
      }
      // 主程序
      writeFile(
        path.join(outputPath, 'lib/main.dart'),
        readFileSync(path.join(__dirname, '../conf/bootstrap'))
      );

      const outputBundleDir = path.join(cwd, './bundle/');

      shell.exec('mkdir -p ' + outputBundleDir, { silent: true });
      // 文件准备ok
      setTimeout(() => {
        bundles.forEach((item: string) => {
          const bundleItem = item.split(' ');

          if (bundleItem[0] === 'apk') {
            bundleApk(outputPath, outputBundleDir, bundleItem[1]);
          }
          if (bundleItem[0] === 'ios') {
            bundleIpa(outputPath, outputBundleDir, bundleItem[1]);
          }
        });
        shell.exec(`rm -rf ${outputPath}`, { silent: true });

        if (fs.existsSync(path.join(outputBundleDir, 'Runner'))) {
          shell.exec(`rm -rf ${path.join(outputBundleDir, 'Runner')}`, {
            silent: true,
          });
        }

        readline.cursorTo(process.stdout, 0);
        process.stdout.write('✨ ' + chalk.green('Done'));
        process.exit(0);
      }, 1000);
    });
};

program
  .command('buildApp')
  .description('编译将 h5 应用打包成移动客户端，使用 Flutter')
  .action(() => {
    createApp();
  });

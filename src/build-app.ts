import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { program } from 'commander';
import { input, checkbox } from '@inquirer/prompts';
import shell from 'shelljs';
import { bundleApk, bundleIpa } from './utils/bundle-app.js';
import {
  jsonToPlist,
  jsonToXml,
  jsonToYaml,
  plistToJson,
  xmlToJson,
  yamlToJson,
} from './utils/txml.js';
import { __dirname, copyFolderRecursiveSync } from './file.js';
import { cwd } from './utils/config.js';
import { loadFileSync, saveFile } from '@moneko/utils';

const createApp = async () => {
  const bundleId = await input({
    message: '请输入软件包名称?',
    default: 'com.moneko.bid',
    validate(value) {
      const isOk = /(^com\.)([a-zA-Z_][a-zA-Z0-9_]*[.])*([a-zA-Z_][a-zA-Z0-9_]*)$/.test(value);

      return !isOk || value.split('.').length !== 3 ? '软件包名不合法' : true;
    },
  });
  const bundles = await checkbox({
    message: '请选择需要打包的类型',
    validate(val) {
      return val.length === 0 ? '请选择打包类型' : true;
    },
    choices: [
      {
        name: '打包为apk (release)',
        value: 'apk -release',
      },
      {
        name: '打包为apk (debug)',
        value: 'apk -debug',
      },
      {
        name: '打包为ipa (release)[未签名]',
        value: 'ios -release',
      },
      {
        name: '打包为ipa (debug)[未签名]',
        value: 'ios -debug',
      },
    ],
  });
  const domain = bundleId.split('.');
  const bundle_id = domain.splice(-1, 1).join('');
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
    loadFileSync(pubObjPath) || ''
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
  saveFile(pubObjPath, jsonToYaml(pubObj));

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
    const androidMainXmlPath = path.join(outputPath, 'android/app/src/main/AndroidManifest.xml');
    const androidMainXmlJson = await xmlToJson(loadFileSync(androidMainXmlPath) || '');

    androidMainXmlJson.manifest.application.$['android:usesCleartextTraffic'] = 'true';
    androidMainXmlJson.manifest['uses-permission'] = androidUsesPermissions;

    const androidMainXml = jsonToXml(androidMainXmlJson);

    saveFile(androidMainXmlPath, androidMainXml);
    // 修改 安卓build.gradle
    const androidBuildGradlePath = path.join(outputPath, 'android/app/build.gradle');
    let androidBuildGradle = loadFileSync(androidBuildGradlePath) || '';
    const minSdkVersion = 'minSdkVersion flutter.minSdkVersion';

    if (androidBuildGradle?.includes(minSdkVersion)) {
      androidBuildGradle = androidBuildGradle.replace(minSdkVersion, 'minSdkVersion 20');
    } else {
      const minSdkVersionIndex = androidBuildGradle.indexOf('minSdkVersion ');
      const len = androidBuildGradle.substring(minSdkVersionIndex, minSdkVersionIndex + 16);

      androidBuildGradle = androidBuildGradle.replace(len, 'minSdkVersion 20');
    }
    const compileSdkVersion = 'compileSdkVersion flutter.compileSdkVersion';
    if (androidBuildGradle.includes(compileSdkVersion)) {
      androidBuildGradle = androidBuildGradle.replace(compileSdkVersion, 'compileSdkVersion 32');
    }

    saveFile(androidBuildGradlePath, androidBuildGradle);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(chalk.cyan('安卓权限配置') + ': ' + chalk.green('完成 \n'));
  }
  // ios
  if (bundles.includes('ios -release') || bundles.includes('ios -debug')) {
    process.stdout.write(chalk.yellow('开始配置IOS权限'));
    // ios 配置文件
    const iosPlistPath = path.join(outputPath, 'ios/Runner/Info.plist');
    const iosPlist = loadFileSync(iosPlistPath) || '';
    const plistJson = Object.assign(plistToJson(iosPlist), {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
      ['io.flutter.embedded_views_preview']: true,
    });

    saveFile(iosPlistPath, jsonToPlist(plistJson));
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(chalk.cyan('IOS权限配置') + ': ' + chalk.green('完成\n'));
  }
  // 主程序
  saveFile(
    path.join(outputPath, 'lib/main.dart'),
    loadFileSync(path.join(__dirname, '../conf/bootstrap')) || ''
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
};

program
  .command('buildApp')
  .description('编译将 h5 应用打包成移动客户端，使用 Flutter')
  .action(() => {
    try {
      createApp();
    } catch (error) {
      //
    }
  });

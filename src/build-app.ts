import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import input from '@inquirer/input';
import checkbox from '@inquirer/checkbox';
import { bundleApk, bundleIOS } from './utils/bundle-app.js';
import { __dirname, copyFolderRecursiveSync } from './file.js';
import { cwd } from './utils/config.js';
import {
  createDir,
  loadFileSync,
  removeDir,
  saveFile,
  parseYaml,
  jsonToYaml,
  parsePlist,
  buildPlist,
  parseXml,
  buildXml,
  ink,
  print,
} from '@moneko/utils';

const createApp = async () => {
  try {
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
    const webAssetsOutput = path.join(outputPath, 'assets/web/');

    execSync(sh, { encoding: 'utf-8' });
    createDir(webAssetsOutput);
    print(ink('正在注册资产...', 'yellow'), true);
    // 拷贝 dist
    copyFolderRecursiveSync(webAssetsEntry, webAssetsOutput);
    // pub 依赖
    const pubObjPath = path.join(outputPath, 'pubspec.yaml');
    const pubObj: Record<string, Record<string, string | string[]>> = JSON.parse(
      (await parseYaml(pubObjPath)) || '{}'
    );
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
    const pubspecYaml = await jsonToYaml(JSON.stringify(pubObj));
    saveFile(pubObjPath, pubspecYaml!);

    print(ink('注册资产', 'cyan') + ': ' + ink('完成', 'cyan'), true);
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

      print(ink('正在配置安卓权限...', 'yellow'), true);
      // 安卓 配置文件
      const androidMainXmlPath = path.join(outputPath, 'android/app/src/main/AndroidManifest.xml');
      const androidMainXmlJson = JSON.parse(parseXml(androidMainXmlPath));

      androidMainXmlJson.manifest.application.$['android:usesCleartextTraffic'] = 'true';
      androidMainXmlJson.manifest['uses-permission'] = androidUsesPermissions;
      const androidMainXml = buildXml(JSON.stringify(androidMainXmlJson));

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
      print(ink('安卓权限配置', 'cyan') + ': ' + ink('完成', 'cyan'), true);
    }
    // ios
    if (bundles.includes('ios -release') || bundles.includes('ios -debug')) {
      print(ink('开始配置IOS权限', 'yellow'), true);
      // ios 配置文件
      const iosPlistPath = path.join(outputPath, 'ios/Runner/Info.plist');
      const iosPlist = JSON.parse(await parsePlist(iosPlistPath));
      const plistJson = Object.assign(iosPlist, {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
        ['io.flutter.embedded_views_preview']: true,
      });
      const newPlist = await buildPlist(JSON.stringify(plistJson));
      saveFile(iosPlistPath, newPlist);
      print(ink('IOS权限配置', 'cyan') + ': ' + ink('完成', 'cyan'), true);
    }
    // 主程序
    saveFile(
      path.join(outputPath, 'lib/main.dart'),
      loadFileSync(path.join(__dirname, '../conf/bootstrap')) || ''
    );

    const outputBundleDir = path.join(cwd, './bundle/');

    createDir(outputBundleDir);
    // 文件准备ok
    setTimeout(() => {
      bundles.forEach((item: string) => {
        const bundleItem = item.split(' ');

        if (bundleItem[0] === 'apk') {
          bundleApk(outputPath, outputBundleDir, bundleItem[1]);
        }
        if (bundleItem[0] === 'ios') {
          bundleIOS(outputPath, outputBundleDir, bundleItem[1]);
        }
      });
      removeDir(outputPath);
      if (fs.existsSync(path.join(outputBundleDir, 'Runner'))) {
        removeDir(path.join(outputBundleDir, 'Runner'));
      }

      print('✨ ' + ink('Done', 'green'), true);
      process.exit(0);
    }, 1000);
  } catch {
    void 0;
  }
};

program
  .command('buildApp')
  .description('编译将 h5 应用打包成移动客户端，使用 Flutter')
  .action(createApp);

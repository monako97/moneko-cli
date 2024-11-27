import path from 'path';
import { renameSync } from 'fs';
import { execSync } from 'child_process';
import { bundleIpa, createDir, ink, print } from '@moneko/utils';

// build apk
export function bundleApk(outputPath: string, outputBundleDir: string, type = '-release') {
  print(ink('正在编译 apk...', 'yellow'), true);
  console.time('bundle apk ' + type);
  execSync(`flutter build apk -${type}`);
  console.timeEnd('bundle apk ' + type);
  // 创建目录（确保目录存在）
  createDir(outputBundleDir);
  // 移动文件（实际上是重命名）
  renameSync(path.join(outputPath, `build/app/outputs/flutter-apk/app${type}.apk`), outputBundleDir);
  print('✨ ' + ink('Apk 编译', 'cyan') + ': ' + ink('完成', 'cyan'), true);
}
// build ios
export function bundleIOS(outputPath: string, outputBundleDir: string, type = '-release') {
  print(ink('正在编译 ipa...', 'yellow'), true);
  console.time('bundle ipa ' + type);
  const iosRunnerDir = path.join(outputBundleDir, `Runner/Payload`);

  execSync(`flutter build ios -${type} --no-codesign`);
  // 创建目录（确保目录存在）
  createDir(iosRunnerDir);
  // 移动文件（实际上是重命名）
  renameSync(path.join(outputPath, `build/ios/iphoneos/Runner.app`), iosRunnerDir);
  const bundleDir = path.join(outputBundleDir, 'Runner');

  bundleIpa(bundleDir, outputBundleDir, type);
  console.timeEnd('bundle ipa ' + type);
  print('✨ ' + ink('ipa 编译', 'cyan') + ': ' + ink('完成', 'cyan'), true);
}

import path from 'path';
import { renameSync } from 'fs';
import { execSync } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';
import { bundleIpa, createDir } from '@moneko/utils';

// build apk
export function bundleApk(outputPath: string, outputBundleDir: string, type = '-release') {
  process.stdout.write(chalk.yellow('正在编译 apk...'));
  console.time('bundle apk ' + type);
  execSync(`flutter build apk -${type}`);
  console.timeEnd('bundle apk ' + type);
  // 创建目录（确保目录存在）
  createDir(outputBundleDir);
  // 移动文件（实际上是重命名）
  renameSync(path.join(outputPath, `build/app/outputs/flutter-apk/app${type}.apk`), outputBundleDir);
  readline.cursorTo(process.stdout, 0);
  process.stdout.write('✨ ' + chalk.cyan('Apk 编译') + ': ' + chalk.green('完成 \n'));
}
// build ios
export function bundleIOS(outputPath: string, outputBundleDir: string, type = '-release') {
  process.stdout.write(chalk.yellow('正在编译 ipa...'));
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
  readline.cursorTo(process.stdout, 0);
  process.stdout.write('✨ ' + chalk.cyan('ipa 编译') + ': ' + chalk.green('完成\n'));
}

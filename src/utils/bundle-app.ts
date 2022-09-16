import path from 'path';
import fs from 'fs';
import readline from 'readline';
import shelljs from 'shelljs';
import archiver from 'archiver';
import chalk from 'chalk';

// build apk
export function bundleApk(outputPath: string, outputBundleDir: string, type = '-release') {
  process.stdout.write(chalk.yellow('正在编译 apk...'));
  console.time("bundle apk " + type);
  shelljs.exec(`flutter build apk -${type}`, { silent: true });
  console.timeEnd("bundle apk " + type);
  shelljs.mv(
    '-f',
    path.join(outputPath, `build/app/outputs/flutter-apk/app${type}.apk`),
    outputBundleDir
  );

  readline.cursorTo(process.stdout, 0);
  process.stdout.write('✨ ' + chalk.cyan('Apk 编译') + ': ' + chalk.green('完成 \n'));
}
// build ios
export function bundleIpa(outputPath: string, outputBundleDir: string, type = '-release') {
  process.stdout.write(chalk.yellow('正在编译 ipa...'));
  console.time("bundle ipa " + type);
  const iosRunnerDir = path.join(outputBundleDir, `Runner/Payload`);

  shelljs.exec(`flutter build ios -${type} --no-codesign`, { silent: true });
  console.timeEnd("bundle ipa " + type);
  shelljs.exec('mkdir -p ' + iosRunnerDir, { silent: true });
  shelljs.mv('-f', path.join(outputPath, `build/ios/iphoneos/Runner.app`), iosRunnerDir);
  const bundleDir = path.join(outputBundleDir, 'Runner');

  shelljs.cd(bundleDir);

  const dirList = fs.readdirSync(bundleDir);

  dirList.forEach(function (item) {
    const output = fs.createWriteStream(path.join(outputBundleDir, `app${type}.ipa`));
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', function (err) {
      throw err;
    });
    archive.pipe(output);
    archive.directory(item + '/', false);
    archive.finalize();
  });
  readline.cursorTo(process.stdout, 0);
  process.stdout.write('✨ ' + chalk.cyan('ipa 编译') + ': ' + chalk.green('完成\n'));
}

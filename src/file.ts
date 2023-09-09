import fs from 'fs';
import path from 'path';
import shell from 'shelljs';
import url from 'url';

export const __filename = url.fileURLToPath(import.meta.url);

export const __dirname = path.dirname(__filename);

export const writeFile = (filePath: string, value: Buffer | string) => {
  if (!fs.existsSync(path.dirname(filePath))) {
    shell.mkdir('-p', path.dirname(filePath).replace(/\\$/g, '\\$'));
  }
  fs.writeFile(filePath, value, 'utf-8', (err) => {
    if (err) {
      throw err;
    };
  });
};

export const readFileSync = (filePath: string) => fs.readFileSync(filePath, { encoding: 'utf-8' });

/**
 * 拷贝文件
 * @param {String} source 源文件
 * @param {String} target 目标文件
 * @constructor
 * */
export function copyFileSync(source: string, target: string) {
  let targetFile = target;

  if (fs.existsSync(target)) {
    if (fs.statSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

/**
 * 拷贝文件夹
 * @param {String} source 源文件夹
 * @param {String} target 目标文件夹
 * @param {String} sun 是否子文件夹
 * @constructor
 * */
export function copyFolderRecursiveSync(source: string, target: string, sun?: boolean) {
  let files = [];
  // 检查是否存在文件夹，不存在则创建
  let targetFolder = target;

  if (sun) {
    targetFolder = path.join(target, path.basename(source));
  }

  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // Copy
  if (fs.statSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      let curSource = path.join(source, file);

      if (fs.statSync(curSource).isDirectory()) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        copyFolderRecursiveSync(curSource, targetFolder, true);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

import { loadFileSync, saveFileSync } from '@moneko/utils';
import { statSync, readdirSync } from 'fs';
import path from 'path';
import url from 'url';

export const __filename = url.fileURLToPath(import.meta.url);

export const __dirname = path.dirname(__filename);

/**
 * 拷贝文件
 * @param {String} source 源文件
 * @param {String} target 目标文件
 * @constructor
 * */
export function copyFileSync(source: string, target: string) {
  const data = loadFileSync(source);

  if (data !== null) {
    let targetFile = target;

    if (statSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
    saveFileSync(targetFile, data);
  }
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
  // Copy
  if (statSync(source).isDirectory()) {
    files = readdirSync(source);
    files.forEach(function (file) {
      let curSource = path.join(source, file);

      if (statSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder, true);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

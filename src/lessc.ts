import { extname, join, resolve } from 'path';
import { readFile, writeFile, readdirSync, statSync } from 'fs';
import { exec } from 'child_process';
import { nodePath, corePackageName, cwd } from './utils/config.js';

let modifyVarBash = '';

function lessc({ file, outputPath }: { file: string; outputPath: string }) {
  return new Promise((resolve, reject) => {
    exec(`${nodePath}npx lessc --js ${modifyVarBash} ${file} > ${outputPath}`, function (error) {
      if (error) return reject(error);
      resolve(true);
    });
  });
}

function lesscFile(filepath: string) {
  return new Promise((resolve, reject) => {
    readFile(filepath, { encoding: 'utf-8' }, function (error, data) {
      if (error) return reject(error);
      else if (/\*?\.less/g.test(data)) {
        writeFile(
          filepath,
          data.replace(/\*?\.less/g, '.css'),
          { encoding: 'utf-8' },
          function (err) {
            if (err) reject(err);
            else resolve(true);
          }
        );
      }
    });
  });
}
let lessFiles: { file: string; outputPath: string }[] = [];

function walk(dir: string) {
  let results: string[] = [];
  let list = readdirSync(dir);

  list.forEach(function (_file) {
    // 排除目录（可按你需求进行新增）
    if (_file === 'static') {
      return false;
    }
    let file = dir + '/' + _file;
    let stat = statSync(file);

    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      switch (extname(file)) {
        case '.less':
          lessFiles.push({
            file,
            outputPath: file.replace(/^.\/components*?\//g, './lib/').replace(/\*?.less$/g, '.css'),
          });
          break;
        case '.js':
          // 过滤后缀名（可按你需求进行新增）
          results.push(resolve(cwd, file));
          break;
        default:
          break;
      }
    }
  });
  return results;
}

export async function lesscCommonjs() {
  const arr = walk(join(cwd, './lib'));

  if (arr && arr.length) {
    const modifyVars = (
      await import(resolve(cwd, `./node_modules/${corePackageName}/lib/options/modify-vars.mjs`))
    ).default;

    for (const k in modifyVars) {
      if (Object.hasOwnProperty.call(modifyVars, k)) {
        modifyVarBash += `--modify-var="${k}=${modifyVars[k]}" `;
      }
    }
    Promise.all(arr.map(lesscFile));
    Promise.all(lessFiles.map(lessc));
  }
}

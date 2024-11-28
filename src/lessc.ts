import { extname, join, resolve } from 'path';
import { readdirSync, statSync } from 'fs';
import { exec } from 'child_process';
import { runtimePath, corePackageName, cwd } from './utils/config.js';
import require from './utils/require.js';
import { loadFile, saveFile } from '@moneko/utils';

let modifyVarBash = '';

function lessc({ file, outputPath }: { file: string; outputPath: string }) {
  const lesscBin = join(require.resolve('less'), '../bin/lessc');
  
  return new Promise((resolve, reject) => {
    exec(
      `${runtimePath} ${lesscBin} --js ${modifyVarBash} ${file} > ${outputPath}`,
      function (error) {
        if (error) return reject(error);
        resolve(true);
      }
    );
  });
}

async function lesscFile(filepath: string) {
  const data = await loadFile(filepath);

  if (data && /\*?\.less/g.test(data)) {
    await saveFile(filepath, data.replace(/\*?\.less/g, '.css'));
  }
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
      await import(require.resolve(`${corePackageName}/lib/options/modify-vars.mjs`))
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

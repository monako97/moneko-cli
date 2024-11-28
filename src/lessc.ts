import { join } from 'path';
import { exec } from 'child_process';
import { runtimePath, corePackageName } from './utils/config.js';
import require from './utils/require.js';
import { loadFile, saveFile, scanFolderSync } from '@moneko/utils';

let modifyVarBash = '';

function lessc(file: string) {
  const lesscBin = join(require.resolve('less'), '../bin/lessc');

  return new Promise((resolve, reject) => {
    exec(
      `${runtimePath} ${lesscBin} --js ${modifyVarBash} ${file} > ${file.replace(
        /\.less$/g,
        '.css'
      )}`,
      function (error) {
        if (error) return reject(error);
        resolve(true);
      }
    );
  });
}

const lessRegExp = /\*?\.less/g;
async function lesscFile(filepath: string) {
  const data = await loadFile(filepath);

  if (data && lessRegExp.test(data)) {
    await saveFile(filepath, data.replace(lessRegExp, '.css'));
  }
}

export async function lesscCommonjs() {
  const less_files = scanFolderSync('lib', ['\\.less$']);
  const modifyVars = (
    await import(require.resolve(`${corePackageName}/lib/options/modify-vars.mjs`))
  ).default;

  for (const k in modifyVars) {
    if (Object.hasOwnProperty.call(modifyVars, k)) {
      modifyVarBash += `--modify-var="${k}=${modifyVars[k]}" `;
    }
  }
  Promise.all(less_files.map(lessc));
  if (less_files.length) {
    const js_files = scanFolderSync('lib', ['\\.js$']);

    Promise.all(js_files.map(lesscFile));
  }
}

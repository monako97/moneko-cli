import shell from 'shelljs';
import { progress } from './progress.js';
import { downloadFile } from './download.js';
import { nodePath } from './config.js';

export const fetchTemplate = (pkgName: string, onFinish?: () => void) => {
  const registryURL = shell
    .exec(`${nodePath}npm config get registry`, {
      silent: true
    })
    .stdout.replace(/\n/g, '');

  shell.exec(
    `${nodePath}npm view ${pkgName} version`,
    {
      silent: true,
      async: true
    },
    function (_code, stdout, stderr) {
      if (stderr) {
        console.log(stderr);
        return;
      }
      const version = stdout.replace(/\n/g, '');
      const url = `${registryURL}${pkgName}/-/${pkgName}-${version}.tgz`;

      downloadFile(url, null, (state, pro, currPro, total) => {
        if (state == 'data') {
          progress(
            parseFloat(pro || '0'),
            pro === '100.00' ? '✨生成完成: ' : '正在生成: ',
            currPro + 'k/' + total + 'k'
          );
        } else if (state === 'finish:data') {
          if (onFinish) {
            onFinish();
          }
        }
      });
    }
  );
};

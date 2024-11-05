import { execSync } from 'child_process'
import { progress } from './progress.js';
import { downloadFile } from './download.js';
import { nodePath } from './config.js';
export const fetchTemplate = (pkgName: string, onFinish?: () => void) => {
  const registryURL = execSync(`${nodePath}npm config get registry`, {
    encoding: 'utf-8',
  }).trim()
  const version = execSync(`${nodePath}npm view ${pkgName} version --registry ${registryURL}`, {
    encoding: 'utf-8',
  }).trim()

  downloadFile(`${registryURL}${pkgName}/-/${pkgName}-${version}.tgz`, null, (state, pro = '0', currPro, total) => {
    if (state == 'data') {
      progress(
        parseFloat(pro),
        pro === '100.00' ? '✨生成完成: ' : '正在生成: ',
        currPro + 'k/' + total + 'k'
      );
    } else if (state === 'finish:data') {
      if (onFinish) {
        onFinish();
      }
    }
  });
};

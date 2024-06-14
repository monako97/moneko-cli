import { sep } from 'path';
import { removeFile, scanFolderSync } from '@moneko/utils';

export function rmDirAsyncParalle(dir: string, _cb: (val: any) => void) {
  const files = scanFolderSync(dir);

  files.forEach((file) => {
    if (
      file.endsWith('README.mdx') ||
      file.split(sep).includes('examples') ||
      /^__\S{1,}__$/.test(file)
    ) {
      removeFile(file);
    }
  });
}

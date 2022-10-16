import { join } from 'path';
import { statSync, readdirSync, unlinkSync, rmSync } from 'fs';

export function rmDirAsyncParalle(dir: string, _cb: (val: any) => void) {
  const stats = statSync(dir);

  if (stats.isDirectory()) {
    const dirs = readdirSync(dir);
    if (dirs.length === 0) {
      rmSync(dir, {
        recursive: true,
        force: true,
      });
      return;
    }
    let index = 0;

    function done() {
      index++;
      if (index === dirs.length) {
        rmSync(dir, {
          recursive: true,
          force: true,
        });
      }
    }
    dirs.map((d) => {
      let current = join(dir, d);

      if (d === 'examples' || /^__\S{1,}__$/.test(d)) {
        rmSync(current, {
          recursive: true,
          force: true,
        });
      } else {
        rmDirAsyncParalle(current, done);
      }
    });
  } else if (dir.includes('README.mdx')) {
    unlinkSync(dir);
  }
}

export function deleteEmptyDir(filesName: string) {
  const files = readdirSync(filesName);

  if (files.length == 0) {
    rmSync(filesName, {
      recursive: true,
    });
  } else if (files.length > 0) {
    for (let i = 0, len = files.length; i < len; i++) {
      const fn = join(filesName, files[i]);

      if (statSync(fn).isDirectory()) {
        deleteEmptyDir(fn);
      }
    }
    if (readdirSync(filesName).length == 0) {
      rmSync(filesName, { recursive: true });
    }
  }
}

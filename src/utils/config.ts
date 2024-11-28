import { join, dirname } from 'path';
import { __dirname } from '../file.js';
import require from './require.js';

declare const Deno: Function;
declare const Bun: Function;

function getRuntime() {
  if (typeof Deno !== 'undefined') {
    return 'deno';
  }
  if (typeof Bun !== 'undefined') {
    return 'bun';
  }
  return 'node';
}
let runtimeDir = dirname(process.execPath);

if (process.platform === 'win32') {
  if (runtimeDir.includes(' ')) {
    runtimeDir = `"${runtimeDir}"`;
  }
}
export const runtimePath = join(runtimeDir, getRuntime());
export const cliVersion = require(join(__dirname, '../package.json')).version;
export const corePackageName = `@moneko/core`;
export const cwd = process.cwd();
export const cachePath = join(cwd, 'node_modules/.cache');
export const swcCachePath = join(cachePath, '.swc');

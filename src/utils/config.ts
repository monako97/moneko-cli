import { join, dirname } from 'path';
import { __dirname } from '../file.js';
import require from './require.js';

export function getRuntime() {
  if (typeof Deno !== "undefined") {
    return "deno";
  }
  if (typeof Bun !== "undefined") {
    return "bun";
  }
  return "node";
}
const runtimeDir = dirname(process.execPath);

export const runtimePath = join(runtimeDir, getRuntime());
export const nodePath = runtimeDir;
export const cliVersion = require(join(__dirname, '../package.json')).version;
export const corePackageName = `@moneko/core`;
export const cwd = process.cwd();
export const cachePath = join(cwd, 'node_modules/.cache');
export const swcCachePath = join(cachePath, '.swc');

import { join, dirname } from 'path';
import { __dirname } from '../file.js';
import require from './require.js';

const nodeDir = join(dirname(process.execPath).replace(/(\s+)/g, '\\$1'), '/');

export const nodePath = process.platform === 'win32' ? '' : nodeDir;
export const cliVersion = require(join(__dirname, '../package.json')).version;
export const corePackageName = `@moneko/core`;
export const cwd = process.cwd();
export const cachePath = join(cwd, 'node_modules/.cache');
export const swcCachePath = join(cachePath, '.swc');

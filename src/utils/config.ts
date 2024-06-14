import path from 'path';
import { __dirname } from '../file.js';
import require from './require.js';

const nodeDir = path.join(path.dirname(process.execPath).replace(/(\s+)/g, '\\$1'), '/');
const anthor = 'moneko';
export const nodePath = process.platform === 'win32' ? '' : nodeDir;
export const cliPkgJson = require(path.join(__dirname, '../package.json'));
export const corePackageName = `@${anthor}/core`;
export const commonPackageName = `@${anthor}/common`;
export const requestPackageName = `@${anthor}/request`;
export const cssPackageName = `@${anthor}/css`;
export const reactPackageName = `@${anthor}/react`;
export const solidJsPackageName = `@${anthor}/solid`;
export const vuePackageName = `@${anthor}/vue`;
export const jestPackageName = 'jest';
export const eslintPackageName = `eslint-config-neko`;
export const stylelintPackageName = `stylelint-config-${anthor}`;
export const huskyPackageName = 'husky';
export const cliName = cliPkgJson.name;
export const cliVersion = cliPkgJson.version;
export const cliAlias = Object.keys(cliPkgJson.bin)[0];
export const cwd = process.cwd();
export const cachePath = `${cwd}/node_modules/.cache`;
export const swcCachePath = `${cachePath}/.swc`;

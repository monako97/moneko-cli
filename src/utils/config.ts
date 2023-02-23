import path from 'path';
import { readFileSync, __dirname } from '../file';
const nodeDir = path.join(path.dirname(process.execPath).replace(/(\s+)/g, '\\$1'), '/');
const anthor = 'moneko';
export const nodePath = process.platform === 'win32' ? '' : nodeDir;
export const cliPkgJson = JSON.parse(readFileSync(path.join(__dirname, '../package.json')));
export const runtimePackageName = `@${anthor}/core`;
export const mockPackageName = `@${anthor}/mock`;
export const commonPackageName = `@${anthor}/common`;
export const requestPackageName = `@${anthor}/request`;
export const postCssPackageName = `@${anthor}/postcss`;
export const reactLivePackageName = `@${anthor}/react-live`;
export const eslintPackageName = `eslint-config-neko`;
export const stylelintPackageName = `stylelint-config-${anthor}`;
export const changelogPackageName = `conventional-changelog-cli`;
export const cliName = cliPkgJson.name;
export const cliVersion = cliPkgJson.version;
export const cliAlias = Object.keys(cliPkgJson.bin)[0];

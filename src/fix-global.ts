import path from 'path';

/** 将 cjs 模块的设置的 global 添加到 mjs 中
 * @param {string} runtimePackageName runtimePackageName
 * @constructor
 */
export default (runtimePackageName: string) => {
  const commonPath = path.resolve(
    process.cwd(),
    `./node_modules/${runtimePackageName}/build/common.js`
  );

  delete require.cache[require.resolve(commonPath)];
  require(commonPath);
};

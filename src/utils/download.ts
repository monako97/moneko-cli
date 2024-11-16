import https from 'https';
import http from 'http';
import zlib from 'zlib';
import { createWriteStream, unlink } from 'fs';
import { isFunc } from './get-pkg.js';

global.templates = {};

// 文件下载
export const downloadFile = (
  url: string,
  dest = null,
  cb: (
    status?: 'error' | 'data' | 'finish:data' | 'finish:file' | number,
    message?: string,
    currProgress?: string,
    total?: string
  ) => void
) => {
  const fetchFunction = url.startsWith('https:') ? https : http;

  fetchFunction.get(url, (res) => {
    // fix: 重定向
    if (res.statusCode === 302 || res.statusCode === 301) {
      const redirectUrl = res.headers.location;
      if (redirectUrl) {
        return downloadFile(redirectUrl, dest, cb);
      }
    }
    if (res.statusCode !== 200) return isFunc(cb) && cb(res.statusCode);
    // 进度
    const len = parseInt(res.headers['content-length'] || '0'); // 文件总长度
    let cur = 0,
      data: Uint8Array[] = [];
    const total = (len / 1024).toFixed(2); // 转为k - bytes in  1k

    res.on('data', async (chunk) => {
      cur += chunk.length;
      data.push(chunk);
      const progress = ((100.0 * cur) / len).toFixed(2); // 当前进度
      const currProgress = (cur / 1024).toFixed(2); // 当前多少k

      cb('data', progress, currProgress, total);
    });
    res.on('end', () => {
      const buffList = zlib
        .unzipSync(Buffer.concat(data))
        .toString('utf-8')
        // eslint-disable-next-line no-control-regex
        .replace(/\x00/g, '')
        .split(/0006.*? 0ustar00000000 000000 /);

      for (let i = 0, lent = buffList.length; i < lent; i++) {
        const isFilename = /package\/.*?/.exec(buffList[i]);

        if (isFilename) {
          global.templates[isFilename.input.substring(isFilename.index)] = buffList[i + 1].replace(
            /package\/.*?$/,
            ''
          );
        }
      }
      // 数据请求完成
      cb('finish:data');
    });
    // 下载到本地
    // 确保路径存在
    if (dest) {
      const file = createWriteStream(dest);
      // 超时,结束等

      file
        .on('finish', () => {
          // 文件写入完成
          return file.close((err) => {
            if (!err) {
              isFunc(cb) && cb('finish:file');
            }
          });
        })
        .on('error', (err) => {
          unlink(dest, () => {});
          return isFunc(cb) && cb('error', err.message);
        });

      res.pipe(file);
    }
  });
};

import readline from 'readline';
import chalk from 'chalk';

const totalBar = 24;

/**
 * 进度条
 * @param {Number} num 当前进度 100进制
 * @param {String} title 进度条标题（默认：下载中）
 * @param {String} info 详细信息
 * @constructor
 */
export function progress(num: number = 0, title: string = '下载中: ', info: string = '') {
  const currBar = parseInt(((totalBar * num) / 100).toFixed());
  const bar =
    chalk.bgBlueBright(new Array(currBar).fill('').join(' ')) +
    chalk.bgGray(new Array(totalBar - currBar).fill('').join('⠂'));

  readline.cursorTo(process.stdout, 0);
  process.stdout.write(title + bar + ' ' + num + '% ' + chalk.grey(info));
}

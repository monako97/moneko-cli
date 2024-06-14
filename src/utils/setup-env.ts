import { join, relative } from 'path';
import { cwd } from './config.js';
import { config } from 'dotenv';
import { __dirname } from '../file.js';
import { updateFileSync } from '@moneko/utils';

function setupEnv(mode: string, type: string, framework: string) {
  const envPath = join(__dirname, `.${mode}.env`);

  updateFileSync(envPath, `NODE_ENV=${mode}\nAPPTYPE=${type}\nFRAMEWORK=${framework}`);
  const envs = [
    envPath,
    relative(cwd, '.env'),
    relative(cwd, '.env/.env'),
    relative(cwd, `.env/.${mode === 'production' ? 'prod' : 'dev'}.env`),
  ];

  envs.forEach((env) => {
    config({
      path: env,
      override: true,
    }).parsed;
  });
}

export default setupEnv;

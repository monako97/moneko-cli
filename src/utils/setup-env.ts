import { writeFileSync } from 'fs';
import { join, relative } from 'path';
import { cwd } from './config.js';
import { config } from 'dotenv';
import { __dirname } from '../file.js';

function setupEnv(mode: string, type: string, framework: string) {
  const envPath = join(__dirname, `.${mode}.env`);

  writeFileSync(envPath, `NODE_ENV=${mode}\nAPPTYPE=${type}\nFRAMEWORK=${framework}`, {
    encoding: 'utf-8',
  });
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

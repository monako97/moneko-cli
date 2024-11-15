import { loadFile } from '@moneko/utils';

async function setupEnv(mode: string, type: string, framework: string) {
  const envPaths = ['.env','.env/.env', `.env/.${mode === 'production' ? 'prod' : 'dev'}.env`];
  const obj = {
    NODE_ENV: mode,
    APPTYPE: type,
    FRAMEWORK: framework,
  };
  const envs = await Promise.all(envPaths.map(loadFile));

  envs.forEach((env) => {
    if (env) {
      const parsed = env.split('\n').reduce<Record<string, unknown>>((acc, line) => {
        // 跳过空行和注释
        if (!line || line.trim().startsWith('#')) {
          return acc;
        }
        // 分割键值对
        const [key, ...values] = line.split('=');

        if (!key) return acc;

        // 合并可能包含 = 的值
        const value = values.join('=').trim();

        // 移除引号并添加到对象
        acc[key.trim()] = value.replace(/^["']|["']$/g, '');
        return acc;
      }, {});

      Object.assign(obj, parsed);
    }
  });
  return obj;
}

export default setupEnv;

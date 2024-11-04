import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import { input, checkbox, select } from '@inquirer/prompts';
import { __dirname } from './file.js';
import {
  cliAlias,
  cliName,
  commonPackageName,
  corePackageName,
  cssPackageName,
  cwd,
  eslintPackageName,
  huskyPackageName,
  reactPackageName,
  requestPackageName,
  solidJsPackageName,
  stylelintPackageName,
  vuePackageName,
} from './utils/config.js';
import { getLastVersion, objectSort } from './utils/get-pkg.js';
import { fetchTemplate } from './utils/template.js';
import { loadFileSync, saveFile } from '@moneko/utils';

type Framework = 'react' | 'vue' | 'solid';
type AppType = 'admin-panel' | 'web-portal' | 'micro-frontend' | 'mobile-app' | 'component-library';
const genFiles = (options: {
  name: string;
  type: AppType;
  framework: Framework;
  author: string;
  tools: string[];
  destination?: string;
}) => {
  const { name, type, framework, tools } = options;
  const isLibrary = type === 'component-library';
  const appTypeName = {
    'admin-panel': 'backstage',
    'web-portal': 'site',
    'micro-frontend': 'micro',
    'mobile-app': 'mobile',
    'component-library': 'library',
  }[type];
  const templateName = `templet-${appTypeName}-${framework}`;
  const _destination = options.destination;
  // 项目指定生成目录，如果命令中没有有配置目录，则在当前命令运行的目录下生成以项目名称为名字的新目录
  const destination = _destination ? path.resolve(_destination) : path.resolve(cwd, name);

  // 检查项目目录是否存在于当前目录中。
  if (!fs.existsSync(destination)) fs.mkdirSync(destination);
  const hasEslint = tools.includes(eslintPackageName),
    hasStylelint = tools.includes(stylelintPackageName),
    hasChangelog = tools.includes('changelog'),
    hasHusky = tools.includes(huskyPackageName),
    hasCommitlint = tools.includes('commitlint'),
    packagePath = `${destination}/package.json`,
    ignoreConfig = JSON.parse(loadFileSync(path.join(__dirname, '../conf/ignore.json')) || '{}');
  const pkgJsonFetch = [
    cliName,
    corePackageName,
    requestPackageName,
    ...tools.filter((t) => !['changelog', 'commitlint'].includes(t)),
  ];
  const dependencies: string[] = [];

  switch (framework) {
    case 'react':
      dependencies.push('react', 'react-dom', reactPackageName);
      pkgJsonFetch.push('react', 'react-dom', '@types/react', reactPackageName);
      if (hasEslint) {
        pkgJsonFetch.push('eslint-plugin-react-hooks', 'eslint-plugin-react');
      }
      break;
    case 'solid':
      dependencies.push('solid-js', solidJsPackageName);
      pkgJsonFetch.push('solid-js', solidJsPackageName);
      if (hasEslint) {
        pkgJsonFetch.push('eslint-plugin-solid');
      }
      break;
    default:
      break;
  }

  if (hasCommitlint) {
    pkgJsonFetch.push('@commitlint/cli');
    pkgJsonFetch.push('@commitlint/config-conventional');
  }
  // 读取模版资源
  fetchTemplate(templateName, () => {
    if (isLibrary) {
      const tscJson = JSON.parse(global.templates['package/tsconfig.json']);
      const tscpaths = tscJson.compilerOptions.paths || {};

      Object.assign(tscpaths, {
        [`${name}/*`]: ['components/*'],
      });
      tscJson.compilerOptions.paths = tscpaths;
      global.templates['package/tsconfig.json'] = JSON.stringify(tscJson, null, 4);
    }
    for (const key in global.templates) {
      if (Object.hasOwnProperty.call(global.templates, key)) {
        const filename = key.replace('package/', '');

        global.templates[key] = global.templates[key]
          .replace(/PackageNameByCli/g, cliName)
          .replace(/PackageNameByCore/g, corePackageName)
          .replace(/PackageNameByCommon/g, commonPackageName)
          .replace(/PackageNameByRequest/g, requestPackageName)
          .replace(/PackageNameByStylelint/g, stylelintPackageName)
          .replace(/PackageNameByEslint/g, eslintPackageName)
          .replace(/PackageNameByReact/g, reactPackageName)
          .replace(/PackageNameByCSS/g, cssPackageName)
          .replace(/PackageNameBySolid/g, solidJsPackageName)
          .replace(/PackageNameByVue/g, vuePackageName)
          .replace(/libraryNameTemplate/g, name);
        saveFile(path.join(destination, filename), global.templates[key]);
      }
    }

    const pkgJson = JSON.parse(global.templates['package/package.json']);

    if (!pkgJson.dependencies) {
      pkgJson.dependencies = {};
    }
    saveFile(
      `${destination}/README.md`,
      loadFileSync(path.join(__dirname, '../conf/README.md'))!
        .replace(/libraryNameTemplate/g, name)
        .replace(/libraryDescriptionTemplate/g, pkgJson.description)
    );
    pkgJson.name = options.name;
    pkgJson.author = options.author;
    pkgJson.scripts.start = `${cliAlias} start ${appTypeName} ${framework}`;
    pkgJson.scripts.build = `${cliAlias} build ${appTypeName} ${framework}`;
    pkgJson.version = '1.0.0';
    pkgJson.main = 'index.js';
    pkgJson.files = undefined;
    const lints = [
      hasStylelint && 'npm run stylelint',
      hasEslint && 'npm run eslint',
      hasChangelog && 'npm run changelog',
    ].filter(Boolean);
    let lintDir = ['src'];

    if (isLibrary) {
      lintDir = ['components', 'site'];
      pkgJson.files = ['LICENSE', 'README.md', 'es', 'lib', 'types'];
      pkgJson.main = 'lib/index.js';
      pkgJson.module = 'es/index.js';
      pkgJson.types = 'types/index.d.ts';
      pkgJson.exports = {
        '.': {
          require: './lib/index.js',
          import: './es/index.js',
        },
        './*': ['./*'],
      };
    }

    if (hasStylelint) {
      pkgJson.scripts.stylelint = lintDir.map((dir) => `${cliAlias} stylelint ${dir}`).join(' && ');
    }
    if (hasEslint) {
      const lintStr = lintDir.length > 1 ? `{${lintDir.join(',')}}` : lintDir[0];
      pkgJson.scripts.eslint = `${cliAlias} eslint ${lintStr}`;
    }
    if (hasChangelog) {
      pkgJson.scripts.changelog = `${cliAlias} changelog CHANGELOG.md && git add CHANGELOG.md`;
    }
    if (hasHusky) {
      pkgJson.scripts.prepare = `${cliAlias} githooks pre-commit="yarn precommit" commit-msg="npx --no -- commitlint --edit \${1}"`;
      pkgJson.scripts.precommit = lints.join(' && ');
    }
    pkgJsonFetch.forEach((toolName: string) => {
      getLastVersion(toolName, function (version) {
        pkgJsonFetch.splice(pkgJsonFetch.indexOf(toolName), 1);
        if (dependencies.includes(toolName)) {
          pkgJson.dependencies[toolName] = version;
        } else {
          pkgJson.devDependencies[toolName] = version;
        }
        return version;
      });
    });

    Object.keys(ignoreConfig).forEach((ignore) => {
      const ignoreSrc = `${destination}/${ignore}`;
      let ignoreVal: string[] = ignoreConfig[ignore];

      if (ignore.includes('eslint.config.mjs')) {
        if (framework === 'solid') {
          ignoreVal.unshift("import solid from 'eslint-plugin-solid/configs/typescript';");
          ignoreVal = ignoreVal.map((v, i) =>
            i === ignoreVal.length - 1 ? 'export default conf.concat(solid);' : v
          );
        } else if (framework === 'react') {
          ignoreVal.unshift(
            "import react from 'eslint-plugin-react';",
            "import hooks from 'eslint-plugin-react-hooks';"
          );
          const exportVal =
            "export default conf.concat(react.configs.flat.recommended).concat({ settings: { react: { version: 'detect' } }, plugins: { 'react-hooks': hooks }, rules: hooks.configs.recommended.rules });";

          ignoreVal = ignoreVal.map((v, i) => (i === ignoreVal.length - 1 ? exportVal : v));
        }
      }
      const ignoreStr = ignoreVal.join('\n').replace(/libraryNameTemplate/g, name);

      if (ignore.includes('prettier') || ignore.includes('eslint')) {
        if (hasEslint) {
          saveFile(ignoreSrc, ignoreStr);
        }
      } else if (ignore.includes('stylelint')) {
        if (hasStylelint) {
          saveFile(ignoreSrc, ignoreStr);
        }
      } else if (ignore.includes('commitlintrc')) {
        if (hasHusky) {
          saveFile(ignoreSrc, ignoreStr);
        }
      } else {
        saveFile(ignoreSrc, ignoreStr);
      }
    });

    const timer = setInterval(() => {
      if (!pkgJsonFetch.length) {
        clearInterval(timer);
        pkgJson.dependencies = objectSort(pkgJson.dependencies);
        pkgJson.devDependencies = objectSort(pkgJson.devDependencies);
        saveFile(packagePath, JSON.stringify(pkgJson, null, 4));
      }
    }, 500);
  });
};

async function handleCreate(
  params: { name: string; destination?: string },
  options: Record<string, string | boolean | number>
) {
  const author = await input({
    message: '请输入开发者名称?',
    default: cliName,
  });
  const type = await select<AppType>({
    message: '您想创建一个什么类型的项目呢?',
    choices: [
      {
        name: '后台管理平台',
        value: 'admin-panel',
        description:
          '适用于创建功能齐全的后台管理界面，无论是企业级应用还是个人网站，均可实现高效的数据管理和操作流程',
      },
      {
        name: '信息门户',
        value: 'web-portal',
        description:
          '适合构建内容丰富的门户网站，无论是企业官网还是个人网站，都能提供统一的风格和多样化的信息展示功能',
      },
      {
        name: '微前端应用',
        value: 'micro-frontend',
        description:
          '微前端是一种架构模式，通过将大型应用拆分为多个独立的小型应用模块，提升开发灵活性与效率，适合复杂的前端项目',
      },
      {
        name: '移动端应用',
        value: 'mobile-app',
        description: '适用于开发跨平台移动应用，使用 Flutter 打包成 App，提供优质的用户体验',
      },
      {
        name: '组件库',
        value: 'component-library',
        description:
          '组件库是一组可复用的功能模块集合，经过深度打磨，能够帮助开发者快速构建高质量的应用，从而提升开发效率并降低成本',
      },
    ],
    loop: false,
  });
  const framework = await select<Framework>({
    message: '您希望使用什么 JavaScript 框架',
    choices: [
      {
        name: 'React',
        value: 'react',
        description:
          'React 是一个用于构建 Web 和原生交互界面的库，广泛应用于开发灵活且高效的用户界面',
      },
      {
        name: 'Solid',
        value: 'solid',
        description:
          'Solid 是一个现代化的 JavaScript 框架，专注于构建响应迅速且高性能的用户界面（UI），以其简单且可预测的开发体验，适合各个层次的开发者',
      },
      {
        name: 'Vue',
        value: 'vue',
        description:
          'Vue 是一个用于构建用户界面的渐进式框架。与其他大型框架不同，Vue 设计为自下而上逐层应用。核心库专注于视图层，易于上手，并且能够与第三方库或现有项目轻松集成。此外，结合现代工具链和各种支持库，Vue 也能驱动复杂的单页应用',
        disabled: '敬请期待!',
      },
    ],
    loop: false,
  });
  const tools = await checkbox({
    message: '请选择需要开启的开发辅助功能',
    choices: [
      {
        name: 'CSS 代码风格检查',
        value: stylelintPackageName,
        checked: true,
      },
      {
        name: 'JavaScript / TypeScript 代码质量检查',
        value: eslintPackageName,
        checked: true,
      },
      {
        name: '自动生成变更日志',
        value: 'changelog',
      },
      {
        name: 'Git 提交信息规范',
        value: 'commitlint',
      },
      {
        name: 'Git Hooks (Husky)',
        value: huskyPackageName,
      },
    ],
    loop: false,
  });

  // 根据回答以及选项，参数来生成项目文件
  genFiles({ author, type, framework, tools, ...params, ...options });
}

program
  .command('create <name> [destination]')
  .description('创建一个新项目')
  .action((name, destination) => {
    try {
      handleCreate({ name, destination }, program.opts());
    } catch (error) {
      //
    }
  });

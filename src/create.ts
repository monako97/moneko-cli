import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import inquirer from 'inquirer';
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
const genFiles = (options: {
  name: string;
  type: string;
  framework: Framework;
  author: string;
  tools: string[];
  destination?: string;
}) => {
  const { name, type, framework, tools } = options;
  const isLibrary = type === 'library';
  const templateName = `templet-${type}-${framework}`;
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
    pkgJson.scripts.start = `${cliAlias} start ${type} ${framework}`;
    pkgJson.scripts.build = `${cliAlias} build ${type} ${framework}`;
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
      let ignoreVal = ignoreConfig[ignore];

      if (ignore.includes('eslintrc')) {
        let frameworkLint: string[] = [];

        if (framework === 'solid') {
          frameworkLint = ['  - plugin:solid/recommended', 'plugins:', '  - solid'];
        } else if (framework === 'react') {
          frameworkLint = [
            '  - plugin:react/recommended',
            '  - plugin:react-hooks/recommended',
            'plugins:',
            '  - react',
            '  - react-hooks',
          ];
        }
        ignoreVal = [
          ...ignoreVal,
          ...frameworkLint,
          'rules:',
          '  import/no-unresolved:',
          '    - 2',
          '    - ignore:',
          '      - \\?raw$',
          '      - ^@/',
          '      - ^@app',
          '      - ^@moneko/common',
          '      - ^@moneko/css',
          isLibrary && '      - ^@pkg',
          isLibrary && '      - ^libraryNameTemplate',
        ].filter(Boolean);
      }
      ignoreVal = ignoreVal.join('\n').replace(/libraryNameTemplate/g, name);

      if (ignore.includes('prettier') || ignore.includes('eslint')) {
        if (hasEslint) {
          saveFile(ignoreSrc, ignoreVal);
        }
      } else if (ignore.includes('stylelint')) {
        if (hasStylelint) {
          saveFile(ignoreSrc, ignoreVal);
        }
      } else if (ignore.includes('commitlintrc')) {
        if (hasHusky) {
          saveFile(ignoreSrc, ignoreVal);
        }
      } else {
        saveFile(ignoreSrc, ignoreVal);
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

const handleCreate = (
  params: Record<string, string | boolean | number>,
  options: Record<string, string | boolean | number>
) => {
  inquirer
    // 用户交互
    .prompt([
      {
        type: 'input',
        name: 'author',
        message: '请输入开发者名称?',
        default: cliName,
      },
      {
        type: 'list',
        name: 'type',
        message: '您想创建一个什么类型的项目呢?',
        choices: [
          {
            key: 'type',
            name: '后台管理(Backstage)',
            value: 'backstage',
          },
          {
            key: 'type',
            name: '门户网站(site)',
            value: 'site',
          },
          {
            key: 'type',
            name: '微前端(Micro Frontends)',
            value: 'micro',
          },
          {
            key: 'type',
            name: '移动端 H5应用(Mobile)',
            value: 'mobile',
          },
          {
            key: 'type',
            name: '组件库(Component Library)',
            value: 'library',
          },
        ],
      },
      {
        type: 'list',
        name: 'framework',
        message: '框架',
        choices: [
          {
            key: 'framework',
            name: 'React',
            value: 'react',
          },
          {
            key: 'framework',
            name: 'Solid.js',
            value: 'solid',
          },
        ],
      },
      {
        type: 'checkbox',
        name: 'tools',
        message: '请选择需要开启的开发辅助功能',
        choices: [
          {
            key: 'tools',
            name: 'css代码规范',
            value: stylelintPackageName,
          },
          {
            key: 'tools',
            name: 'javascript、typescript代码规范',
            value: eslintPackageName,
          },
          {
            key: 'tools',
            name: '根据 commit 信息生成 Changelog',
            value: 'changelog',
          },
          {
            key: 'tools',
            name: 'Git commit 规范',
            value: 'commitlint',
          },
          {
            key: 'tools',
            name: 'Git hooks(使用husky)',
            value: huskyPackageName,
          },
        ],
        default: [stylelintPackageName, eslintPackageName],
      },
    ])
    .then((answers) => {
      // 根据回答以及选项，参数来生成项目文件
      genFiles({ ...answers, ...params, ...options });
    })
    .catch((error) => {
      throw new Error(error);
    });
};

program
  .command('create <name> [destination]')
  .description('创建一个新项目')
  .action((name, destination) => {
    handleCreate({ name, destination }, program.opts());
  });

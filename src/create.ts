import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import inquirer from 'inquirer';
import { getLastVersion } from './utils/get-pkg.js';
import { writeFile, readFileSync, __dirname } from './file.js';
import {
  cliAlias,
  cliName,
  runtimePackageName,
  commonPackageName,
  stylelintPackageName,
  eslintPackageName,
  postCssPackageName,
  mockPackageName,
  requestPackageName,
  reactLivePackageName,
  changelogPackageName,
} from './utils/config.js';
import { fetchTemplate } from './utils/template.js';

const genFiles = (options: {
  name: string;
  type: string;
  author: string;
  tools: string[];
  destination?: string;
}) => {
  const { name, type, tools } = options;
  const isLibrary = type === 'library';
  const isSingleComponent = type === 'single-component';
  const templateName = `template-${isLibrary ? 'component-library' : type}`;
  const _destination = options.destination;
  // 项目指定生成目录，如果命令中没有有配置目录，则在当前命令运行的目录下生成以项目名称为名字的新目录
  const destination = _destination ? path.resolve(_destination) : path.resolve(process.cwd(), name);

  // 检查项目目录是否存在于当前目录中。
  if (!fs.existsSync(destination)) fs.mkdirSync(destination);

  const hasEslint = tools.includes(eslintPackageName),
    hasStylelint = tools.includes(stylelintPackageName),
    hasPostCSS = tools.includes(postCssPackageName),
    hasChangelog = tools.includes(changelogPackageName),
    hasHusky = tools.includes('husky'),
    packagePath = destination + '/package.json',
    ignoreConfig = JSON.parse(readFileSync(path.join(__dirname, '../conf/ignore.json')));
  const dependencies = ['react', 'react-dom', commonPackageName];
  let pkgJsonFetch = [
    cliName,
    runtimePackageName,
    requestPackageName,
    commonPackageName,
    mockPackageName,
    'react',
    'react-dom',
    ...tools,
  ];

  if (hasStylelint && !hasPostCSS) {
    pkgJsonFetch.push(postCssPackageName);
  }
  if (hasHusky) {
    pkgJsonFetch.push('@commitlint/cli');
    pkgJsonFetch.push('@commitlint/config-conventional');
  }
  // 读取模版资源
  fetchTemplate(templateName, () => {
    if (isLibrary) {
      const tscJson = JSON.parse(global.templates['package/tsconfig.json']);
      const tscpaths = tscJson.compilerOptions.paths || {};

      Object.assign(tscpaths, {
        [name + '/*']: ['components/*'],
      });
      tscJson.compilerOptions.paths = tscpaths;
      global.templates['package/tsconfig.json'] = JSON.stringify(tscJson, null, 4);
    }
    for (const key in global.templates) {
      if (Object.hasOwnProperty.call(global.templates, key)) {
        const filename = key.replace('package/', '');

        global.templates[key] = global.templates[key]
          .replace(/PackageNameByCli/g, cliName)
          .replace(/PackageNameByCore/g, runtimePackageName)
          .replace(/PackageNameByMock/g, mockPackageName)
          .replace(/PackageNameByCommon/g, commonPackageName)
          .replace(/PackageNameByRequest/g, requestPackageName)
          .replace(/PackageNameByStylelint/g, stylelintPackageName)
          .replace(/PackageNameByEslint/g, eslintPackageName)
          .replace(/PackageNameByPostCss/g, postCssPackageName)
          .replace(/PackageNameByReactLive/g, reactLivePackageName)
          .replace(/libraryNameTemplate/g, name);
        writeFile(path.join(destination, filename), global.templates[key]);
      }
    }

    const pkgJson = JSON.parse(global.templates['package/package.json']);

    writeFile(
      destination + '/README.md',
      [
        `# ${options.name}\n`,
        `> ${pkgJson.description}\n`,
        `[![version][version-tag]][npm-url]`,
        `[![install size][size-tag]][size-url]`,
        `[![download][download-tag]][npm-url]\n`,
        `## 使用\n`,
        `[![${options.name}][install-tag]][npm-url]\n`,
        `[npm-url]: https://npmjs.org/package/${options.name}`,
        `[install-tag]: https://nodei.co/npm/${options.name}.png`,
        `[version-tag]: https://img.shields.io/npm/v/${options.name}/latest.svg?logo=npm`,
        `[size-tag]: https://packagephobia.com/badge?p=${options.name}@latest`,
        `[size-url]: https://packagephobia.com/result?p=${options.name}@latest`,
        `[download-tag]: https://img.shields.io/npm/dm/${options.name}.svg?logo=docusign\n`,
        '## 安装依赖\n',
        '```shell',
        'npm install',
        '# or',
        'yarn install',
        '```\n',
        '## 启动项目\n',
        '```shell',
        'npm start',
        '# or',
        'yarn start',
        '```\n',
        '## 打包项目\n',
        '```shell',
        'npm run build',
        '# or',
        'yarn build',
        '```\n',
        '## 打包项目`使用自定义配置`\n',
        '> 在打包其它有特殊配置的bundle时, 可以通过命令行参数来加载额外的配置文件;\n',
        '例如: 使用 **config/index.ts** 与 **config/prod.ts** 合并后的配置进行编译.\n',
        '```shell',
        'npm run build --config=prod',
        '# or',
        'yarn build config=prod',
        '```\n',
      ].join('\n')
    );
    pkgJson.name = options.name;
    pkgJson.author = options.author;
    pkgJson.scripts.start = cliAlias + ' start ' + type;
    pkgJson.scripts.build = cliAlias + ' build ' + type;
    pkgJson.version = '1.0.0';
    pkgJson.files = undefined;
    const lints = [
      hasStylelint && 'yarn stylelint',
      hasEslint && 'yarn eslint',
      hasChangelog && 'yarn changelog'
    ].filter(Boolean);
    let lintDir = ['src'];
    if (isLibrary) {
      lintDir = ['site', 'components'];
      pkgJson.files = ['lib', 'es', 'README.md', 'LICENSE'];
    }
    if (isSingleComponent) {
      lintDir = ['src', 'example'];
      pkgJson.files = ['lib', 'umd', 'example', 'README.md'];
    }

    if (hasStylelint) {
      pkgJson.scripts['stylelint'] = lintDir
        .map((dir) => `${cliAlias} stylelint ${dir}`)
        .join(' && ');
    }
    if (hasEslint) {
      pkgJson.scripts['eslint'] = `${cliAlias} eslint {${lintDir.join(',')}}`;
    }
    if (hasChangelog) {
      pkgJson.scripts.changelog = 'conventional-changelog -p angular -u -i CHANGELOG.md -s -r 0 && git add CHANGELOG.md';
    }
    if (hasHusky) {
      pkgJson.scripts.prepare =
        cliAlias +
        ' githooks pre-commit="yarn precommit" commit-msg="npx --no -- commitlint --edit \\${1}"';
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
      const ignoreSrc = destination + '/' + ignore;
      let ignoreVal = ignoreConfig[ignore];

      if (isLibrary) {
        ignoreVal = [
          ...ignoreVal,
          'rules:',
          '  import/no-unresolved:',
          '    - 2',
          '    - ignore:',
          '      - \\?raw$',
          '      - ^@pkg',
          '      - ^@/',
          '      - components',
          '      - ^libraryNameTemplate',
        ];
      }
      ignoreVal = ignoreVal.join('\n').replace(/libraryNameTemplate/g, name);

      if (ignore.includes('prettier') || ignore.includes('eslint')) {
        if (hasEslint) {
          writeFile(ignoreSrc, ignoreVal);
        }
      } else if (ignore.includes('stylelint')) {
        if (hasStylelint) {
          writeFile(ignoreSrc, ignoreVal);
        }
      } else if (ignore.includes('commitlintrc')) {
        if (hasHusky) {
          writeFile(ignoreSrc, ignoreVal);
        }
      } else {
        writeFile(ignoreSrc, ignoreVal);
      }
    });

    const timer = setInterval(() => {
      if (!pkgJsonFetch.length) {
        clearInterval(timer);
        writeFile(packagePath, JSON.stringify(pkgJson, null, 4));
      }
    }, 1000);
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
            name: '后台管理(back-stage)',
            value: 'back-stage',
          },
          {
            key: 'type',
            name: '门户网站(site)',
            value: 'site',
          },
          {
            key: 'type',
            name: '微应用(single-spa)',
            value: 'single-spa',
          },
          {
            key: 'type',
            name: '移动端 H5应用(mobile)',
            value: 'mobile',
          },
          {
            key: 'type',
            name: '独立组件(npm package)',
            value: 'single-component',
          },
          {
            key: 'type',
            name: '组件库(npm package)',
            value: 'library',
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
            name: 'css后处理(压缩、Hack、单位换算等)',
            value: postCssPackageName,
          },
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
            name: 'Git hooks(使用husky)',
            value: 'husky',
          },
          {
            key: 'tools',
            name: '从git commit生成Changelog',
            value: changelogPackageName,
          },
        ],
        default: [postCssPackageName, stylelintPackageName, eslintPackageName],
      },
    ])
    .then((answers) => {
      // 根据回答以及选项，参数来生成项目文件
      genFiles({ ...answers, ...params, ...options });
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
    });
};

program
  .command('create <name> [destination]')
  .description('创建一个新项目')
  .action((name, destination) => {
    handleCreate({ name, destination }, program.opts());
  });

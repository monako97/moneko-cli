import { join } from 'path';
import { __dirname } from '../file.js';
import require from './require.js';
import { updateFileSync } from '@moneko/utils';

const swcrcPath = join(__dirname, `.swcrc`);

function setupSwcRc(framework: 'react' | 'solid') {
  const isSolid = framework === 'solid';
  const isReact = framework === 'react';
  updateFileSync(
    swcrcPath,
    JSON.stringify({
      $schema: 'https://json.schemastore.org/swcrc',
      module: {
        type: 'es6',
      },
      minify: true,
      jsc: {
        minify: {
          mangle: true,
          compress: true,
          format: {
            comments: 'some',
          },
        },
        parser: {
          syntax: 'typescript',
          decorators: true,
          dynamicImport: true,
          tsx: true,
        },
        loose: true,
        target: 'es2022',
        externalHelpers: false,
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          react: {
            runtime: 'automatic',
            throwIfNamespace: true,
            useBuiltins: true,
            refresh: isReact,
            development: false,
            importSource: isSolid ? 'solid-js/h' : void 0,
          },
        },
        experimental: {
          plugins: [
            [
              require.resolve('@moneko/transform-imports'),
              {
                '@moneko/common': {
                  transform: '@moneko/common/lib/${member}',
                },
                lodash: {
                  transform: 'lodash/${member}',
                },
                '@ant-design/icons': {
                  transform: 'es/icons/${member}',
                },
                antd: {
                  transform: 'es/${member}',
                  memberTransformers: ['dashed_case'],
                },
                'neko-ui': {
                  transform: 'es/${member}',
                  memberTransformers: ['dashed_case'],
                },
              },
            ],
            isSolid && [
              require.resolve('@moneko/jsx-dom-expressions'),
              {
                moduleName: 'solid-js/web',
                builtIns: [
                  'For',
                  'Show',
                  'Switch',
                  'Match',
                  'Suspense',
                  'SuspenseList',
                  'Portal',
                  'Index',
                  'Dynamic',
                  'ErrorBoundary',
                ],
                contextToCustomElements: true,
                wrapConditionals: true,
                generate: 'dom',
                hydratable: false,
              },
            ],
          ].filter(Boolean),
        },
      },
      sourceMaps: true,
      exclude: ['__tests__/', 'examples/'],
    })
  );
  return swcrcPath;
}

export default setupSwcRc;

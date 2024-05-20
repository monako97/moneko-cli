import { writeFileSync } from 'fs';
import { join } from 'path';
import { __dirname } from '../file.js';
import require from './require-reslove.js';

const swcrcPath = join(__dirname, `.swcrc`);

function setupSwcRc(framework: 'react' | 'solid') {
  const isSolid = framework === 'solid';
  const isReact = framework === 'react';

  const swcrc = {
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
  };

  writeFileSync(swcrcPath, JSON.stringify(swcrc), {
    encoding: 'utf-8',
  });

  return swcrcPath;
}

export default setupSwcRc;

import { join } from 'path';

export default {
  entry: join(process.cwd(), 'src/index.ts'),
  output: {
    path: join(process.cwd(), 'lib'),
    filename: 'index.js',
    clean: true,
    library: {
        name: 'mo',
        type: 'umd',
        umdNamedDefine: true,
      },
  },
  mode: 'production',
  target: 'node',
  resolve: {
    extensions: ['...', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(cj|mj|t|j)s(|x)$/i,
        use: [
          {
            loader: 'swc-loader',
            options: {
              module: {
                type: 'es6',
                resolveFully: true,
              },
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                  decorators: true,
                  dynamicImport: true,
                },
                loose: true,
                target: 'es2017',
                externalHelpers: false,
                transform: {
                  legacyDecorator: true,
                  decoratorMetadata: true,
                  optimizer: {
                    simplify: false,
                  },
                },
                experimental: {
                  emitAssertForImportAttributes: true,
                },
              },
              env: void 0,
              sourceMaps: true,
              parseMap: true,
            },
          },
        ],
      },
    ],
  },
};

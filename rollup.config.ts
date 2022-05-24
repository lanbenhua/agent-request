import { RollupOptions } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';

// rollup.config.js (building more than one bundle)
const path = require('path');
const rollupTypescript = require('@rollup/plugin-typescript');
const terser = require('rollup-plugin-terser').terser;

const cwd = (pathname: string): string => path.resolve(process.cwd(), pathname);

const config: RollupOptions[] = [
  {
    input: cwd('./src/index.ts'),
    plugins: [
      nodeResolve(),
      rollupTypescript({
        tsconfig: cwd('./tsconfig.esm.json'),
      }),
      terser(),
    ],
    output: {
      dir: cwd('./esm'),
      format: 'es',
    },
  },
  // {
  //   input: cwd('./src/index.ts'),
  //   plugins: [nodeResolve(), rollupTypescript({
  //     tsconfig: cwd('./tsconfig.esm.es6.json')
  //   })],
  //   output: {
  //     format: "es",
  //     file: cwd('./esm/es6.js')
  //   }
  // },
  {
    input: cwd('./src/index.ts'),
    plugins: [
      nodeResolve(),
      rollupTypescript({
        tsconfig: cwd('./tsconfig.umd.json'),
      }),
      terser(),
    ],
    output: {
      format: 'umd',
      name: 'Agent',
      exports: 'named',
      dir: cwd('./lib'),
    },
  },
  // {
  //   input: cwd('./src/index.ts'),
  //   plugins: [nodeResolve(), rollupTypescript({
  //     tsconfig: cwd('./tsconfig.umd.es6.json')
  //   })],
  //   output: {
  //     format: "umd",
  //     name: 'Agent',
  //     exports: "named",
  //     file: cwd('./lib/es6.js')
  //   }
  // }
];

export default config;

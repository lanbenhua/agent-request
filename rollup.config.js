// rollup.config.js (building more than one bundle)

const rollupTypescript = require('@rollup/plugin-typescript');

export default [
  {
    input: './src/index.ts', 
    plugins: [rollupTypescript({
      tsconfig: './tsconfig.cjs.json'
    })],
    output: {
      dir: './lib',
      format: "cjs",
      exports: 'auto'
    }
  },
  {
    input: './src/index.ts', 
    plugins: [rollupTypescript({
      tsconfig: './tsconfig.esm.json'
    })],
    output: {
      dir: './esm',
      format: "es"
    }
  },
  {
    input: './src/index.ts', 
    plugins: [rollupTypescript({
      tsconfig: './tsconfig.umd.json'
    })],
    output: {
      dir: './umd',
      format: "umd",
      name: 'Agent',
      exports: "named"
    }
  }
];
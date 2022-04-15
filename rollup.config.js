// rollup.config.js (building more than one bundle)

const rollupTypescript = require('@rollup/plugin-typescript');

export default [
  {
    input: './src/index.ts', 
    plugins: [rollupTypescript({
      tsconfig: './tsconfig.esm.json'
    })],
    output: {
      dir: './esm',
      format: "es",
    }
  },
  {
    input: './src/index.ts', 
    plugins: [rollupTypescript({
      tsconfig: './tsconfig.umd.json'
    })],
    output: {
      dir: './lib',
      format: "umd",
      name: 'Agent',
      exports: "named"
    }
  }
];
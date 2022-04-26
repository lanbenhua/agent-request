// rollup.config.js (building more than one bundle)
const path = require('path');
const rollupTypescript = require('@rollup/plugin-typescript');
const terser = require("rollup-plugin-terser").terser;

const cwd = (pathname) => path.resolve(process.cwd(), pathname)

export default [
  {
    input: cwd('./src/index.ts'), 
    plugins: [rollupTypescript({
      tsconfig: cwd('./tsconfig.esm.json')
    }), terser()],
    output: {
      dir: cwd('./esm'),
      format: "es",
    }
  },
  {
    input: cwd('./src/index.ts'), 
    plugins: [rollupTypescript({
      tsconfig: cwd('./tsconfig.esm.es6.json')
    }), terser()],
    output: {
      format: "es",
      file: cwd('./esm/es6.js')
    }
  },
  {
    input: cwd('./src/index.ts'), 
    plugins: [rollupTypescript({
      tsconfig: cwd('./tsconfig.umd.json')
    }), terser()],
    output: {
      dir: cwd('./lib'),
      format: "umd",
      name: 'Agent',
      exports: "named"
    }
  },
  {
    input: cwd('./src/index.ts'), 
    plugins: [rollupTypescript({
      tsconfig: cwd('./tsconfig.umd.es6.json')
    }), terser()],
    output: {
      format: "umd",
      name: 'Agent',
      exports: "named",
      file: cwd('./lib/es6.js')
    }
  }
];
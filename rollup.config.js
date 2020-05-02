import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from 'rollup-plugin-commonjs';

import pkg from './package.json';

export default [
  {
    input: 'src/main.js',
    output: {
      file: pkg.main.replace(/\.js$/, '.umd.min.js'),
      format: 'umd',
      name: 'hypo'
    },
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**'
      }),
      terser()
    ]
  },
  {
    input: 'src/main.js',
    output: {
      file: pkg.main,
      format: 'cjs'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }
];
import typescript from '@rollup/plugin-typescript'

export default {
  input: './src/index.ts',
  output: [
    {
      format: 'cjs',
      file: 'dist/mashy-mini-vue.cjs.js'
    },
    {
      format: 'es',
      file: 'dist/mashy-mini-vue.esm.js'
    }
  ],

  plugins: [typescript()]
}

// mini-vue 出口
export * from './runtime-dom'

import { baseCompile } from './compiler-core/src'
import * as runtimeDom from './runtime-dom'

function complier2Function(template) {
  const { code } = baseCompile(template)
  const render = new Function('Vue', code)(runtimeDom)
  return render
}

runtimeDom.registerRuntimeCompiler(complier2Function)

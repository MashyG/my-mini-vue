// mini-vue 出口
export * from '@mashy-mini-vue/runtime-dom'

import { baseCompile } from '@mashy-mini-vue/complier-core'
import * as runtimeDom from '@mashy-mini-vue/runtime-dom'

function complier2Function(template) {
  const { code } = baseCompile(template)
  const render = new Function('Vue', code)(runtimeDom)
  return render
}

runtimeDom.registerRuntimeCompiler(complier2Function)

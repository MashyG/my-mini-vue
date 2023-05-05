import { createVNode } from './vnode'

export function createAppApi(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        console.log('mount ----- rootContainer  >>>>', rootContainer)
        // 先转化为 vnode：component -> vnode
        // 所有逻辑操作都会基于 vnode 做处理
        const vnode = createVNode(rootComponent)
        console.log('mount ----- vnode  >>>>', vnode)

        render(vnode, rootContainer)
      }
    }
  }
}

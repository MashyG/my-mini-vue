import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { createAppApi } from './createApp'
import { Fragment, Text } from './vnode'

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProps: hostPatchProps,
    insert: hostInsert
  } = options || {}
  function render(vnode, rootContainer) {
    // patch
    patch(vnode, rootContainer, null)
  }

  function patch(vnode, container, parent) {
    console.log('patch ----- vnode  >>>>', vnode)
    const { type = '', shapeFlags } = vnode || {}

    switch (type) {
      case Fragment:
        processFragment(vnode, container, parent)
        break

      case Text:
        processText(vnode, container)
        break

      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parent)
        } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(vnode, container, parent)
        }
        break
    }
  }

  // 处理 Fragment 节点
  function processFragment(vnode, container, parent) {
    mountChildren(vnode, container, parent)
  }

  // 处理 Text 节点
  function processText(vnode, container) {
    const { children } = vnode || {}
    const textVNode = (vnode.el = document.createTextNode(children))
    container.append(textVNode)
  }

  // 处理 Element 类型
  function processElement(vnode, container, parent) {
    mountElement(vnode, container, parent)
  }

  function mountElement(vnode, container, parent) {
    console.log('processElement ----- vnode  >>>>', vnode)
    const { type, children, props, shapeFlags } = vnode || {}
    // createElement
    const el = hostCreateElement(type)
    vnode.el = el

    // children -> String, Array<vnode>
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parent)
    }

    // props
    for (const key in props) {
      const val = props[key]
      // patchProps
      hostPatchProps(el, key, val)
    }
    // insert
    hostInsert(el, container)
  }

  function mountChildren(vnode, container, parent) {
    vnode?.children?.forEach((v) => {
      patch(v, container, parent)
    })
  }

  // 处理组件类型
  function processComponent(vnode, container, parent) {
    console.log('processComponent ----- vnode  >>>>', vnode)
    mountComponent(vnode, container, parent)
  }

  // 挂载组件
  function mountComponent(initialVNode, container, parent) {
    const instance = createComponentInstance(initialVNode, parent)
    console.log('mountComponent ----- instance 111 >>>>', instance)

    setupComponent(instance)
    console.log('mountComponent ----- instance 222 >>>>', instance)

    setupRenderEffect(instance, initialVNode, container)
  }

  // 调用 render，进行拆箱操作
  function setupRenderEffect(instance, initialVNode, container) {
    // subTree -> initialVNode
    const subTree = instance.render.call(instance.proxy)
    console.log('setupRenderEffect ----- subTree  >>>>', subTree)
    // initialVNode -> patch
    // initialVNode -> element 类型 -> mountElement 渲染
    patch(subTree, container, instance)

    // mount 完成之后才可以获取到虚拟 DOM 的el
    initialVNode.el = subTree.el
  }

  return {
    createApp: createAppApi(render)
  }
}

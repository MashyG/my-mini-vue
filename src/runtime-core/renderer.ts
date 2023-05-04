import { isObject } from '../shared/index'
import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { Fragment, Text } from './vnode'

export function render(vnode, rootContainer) {
  // patch
  patch(vnode, rootContainer)
}

function patch(vnode, container) {
  console.log('patch ----- vnode  >>>>', vnode)
  const { type = '', shapeFlags } = vnode || {}

  switch (type) {
    case Fragment:
      processFragment(vnode, container)
      break

    case Text:
      processText(vnode, container)
      break

    default:
      if (shapeFlags & ShapeFlags.ELEMENT) {
        processElement(vnode, container)
      } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container)
      }
      break
  }
}

// 处理 Fragment 节点
function processFragment(vnode, container) {
  mountChildren(vnode, container)
}

// 处理 Text 节点
function processText(vnode, container) {
  const { children } = vnode || {}
  const textVNode = (vnode.el = document.createTextNode(children))
  container.append(textVNode)
}

// 处理 Element 类型
function processElement(vnode, container) {
  mountElement(vnode, container)
}

function mountElement(vnode, container) {
  console.log('processElement ----- vnode  >>>>', vnode)
  const { type, children, props, shapeFlags } = vnode || {}
  const el = document.createElement(type)
  vnode.el = el

  // children -> String, Array<vnode>
  if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el)
  }

  // props
  for (const key in props) {
    const val = props[key]
    const isEvent = (k: string) => /^on[A-Z]/.test(k)
    if (isEvent(key)) {
      const event = key.slice(2).toLocaleLowerCase()
      el.addEventListener(event, val)
    } else {
      el.setAttribute(key, val)
    }
  }

  container.append(el)
}

function mountChildren(vnode, container) {
  vnode?.children?.forEach((v) => {
    patch(v, container)
  })
}

// 处理组件类型
function processComponent(vnode, container) {
  console.log('processComponent ----- vnode  >>>>', vnode)
  mountComponent(vnode, container)
}

// 挂载组件
function mountComponent(initialVNode, container) {
  const instance = createComponentInstance(initialVNode)
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
  patch(subTree, container)

  // mount 完成之后才可以获取到虚拟 DOM 的el
  initialVNode.el = subTree.el
}

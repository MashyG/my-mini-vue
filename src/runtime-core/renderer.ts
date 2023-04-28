import { isObject } from '../shared/index'
import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'

export function render(vnode, rootContainer) {
  // patch
  patch(vnode, rootContainer)
}

function patch(vnode, container) {
  console.log('patch ----- vnode  >>>>', vnode)
  // TODO 处理 Element 类型
  //
  console.log(vnode)
  const { type = '', shapeFlags } = vnode || {}
  if (shapeFlags & ShapeFlags.ELEMENT) {
    processElement(vnode, container)
  } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container)
  }
}

// 处理 Element 类型
function processElement(vnode, container) {
  mountElement(vnode, container)
}

function mountElement(vnode, container) {
  console.log('processElement ----- vnode  >>>>', vnode)
  const { type, children, props, shapeFlags } = vnode || {}
  // if (type) {
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
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      const val = props[key]
      el.setAttribute(key, val)
    }
  }

  container.append(el)
  // }
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

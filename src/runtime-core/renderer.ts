import { effect } from '../reactivity/effect'
import { EMPTY_OBJECT } from '../shared'
import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { createAppApi } from './createApp'
import { Fragment, Text } from './vnode'

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProps: hostPatchProps,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText
  } = options || {}
  function render(vnode, rootContainer) {
    // patch
    patch(null, vnode, rootContainer, null)
  }

  // n1 旧节点；n2 新节点
  function patch(n1, n2, container, parentComponent) {
    console.log('patch ----- n1, n2  >>>>', n1, n2)
    const { type = '', shapeFlags } = n2 || {}

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break

      case Text:
        processText(n1, n2, container)
        break

      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent)
        }
        break
    }
  }

  // 处理 Fragment 节点
  function processFragment(n1, n2, container, parentComponent) {
    mountChildren(n2.children, container, parentComponent)
  }

  // 处理 Text 节点
  function processText(n1, n2, container) {
    const { children } = n2 || {}
    const textVNode = (n2.el = document.createTextNode(children))
    container.append(textVNode)
  }

  // 处理 Element 类型
  function processElement(n1, n2, container, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent)
    } else {
      patchElement(n1, n2, container, parentComponent)
    }
  }

  // 初始化 Element
  function mountElement(vnode, container, parentComponent) {
    console.log('processElement ----- vnode  >>>>', vnode)
    const { type, children, props, shapeFlags } = vnode || {}
    // createElement
    const el = (vnode.el = hostCreateElement(type))

    // children -> String, Array<vnode>
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent)
    }

    // props
    for (const key in props) {
      const val = props[key]
      // patchProps
      console.log('patchProps ========= val ----', props, val)
      hostPatchProps(el, key, null, val)
    }
    // insert
    hostInsert(el, container)
  }
  function mountChildren(children, container, parentComponent) {
    children?.forEach((v) => {
      patch(null, v, container, parentComponent)
    })
  }

  // 更新 Element
  function patchElement(n1, n2, container, parentComponent) {
    console.log('patchElement ==== n1, n2 >>>>>', n1, n2)
    const oldProps = n1.props || EMPTY_OBJECT
    const newProps = n2.props || EMPTY_OBJECT

    const el = (n2.el = n1.el)

    patchChildren(n1, n2, el, parentComponent)
    patchProps(el, oldProps, newProps)
  }
  function patchChildren(n1, n2, container, parentComponent) {
    const { shapeFlags: prevShapeFlags, children: prevChildren } = n1 || {}
    const { shapeFlags: nextShapeFlags, children: nextChildren } = n2 || {}

    if (nextShapeFlags & ShapeFlags.TEXT_CHILDREN) {
      // 新节点为 Text
      if (prevShapeFlags & ShapeFlags.ARRAY_CHILDREN) {
        // 旧节点为 Array
        // 1. 移除旧节点
        unmountChildren(prevChildren)
        hostSetElementText(container, nextChildren)
      }
      // 2. 插入新节点；
      // 两节点不一致时，替换新节点
      if (prevChildren !== nextChildren) {
        hostSetElementText(container, nextChildren)
      }
    } else {
      // 新节点为 Array
      if (prevShapeFlags & ShapeFlags.TEXT_CHILDREN) {
        // 旧节点为 Text
        // 1. 移除旧节点
        hostSetElementText(container, '')
        // 2. 插入新节点；
        mountChildren(nextChildren, container, parentComponent)
      } else {
        // 旧节点为 Array
      }
    }
  }
  function unmountChildren(children) {
    ;(children || []).forEach((child) => {
      const { el } = child || {}
      hostRemove(el)
    })
  }
  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProps = oldProps[key]
        const nextProps = newProps[key]

        if (prevProps !== nextProps) {
          hostPatchProps(el, key, prevProps, nextProps)
        }
      }
      if (oldProps !== EMPTY_OBJECT) {
        for (const key in oldProps) {
          const prevProps = oldProps[key]
          if (!(key in newProps)) {
            hostPatchProps(el, key, prevProps, null)
          }
        }
      }
    }
  }

  // 处理组件类型
  function processComponent(n1, n2, container, parentComponent) {
    console.log('processComponent ----- n2  >>>>', n2)
    mountComponent(n2, container, parentComponent)
  }

  // 挂载组件
  function mountComponent(initialVNode, container, parentComponent) {
    const instance = createComponentInstance(initialVNode, parentComponent)
    console.log('mountComponent ----- instance 111 >>>>', instance)

    setupComponent(instance)
    console.log('mountComponent ----- instance 222 >>>>', instance)

    setupRenderEffect(instance, initialVNode, container)
  }

  // 调用 render，进行拆箱操作
  function setupRenderEffect(instance, initialVNode, container) {
    effect(() => {
      const { proxy, isMounted } = instance || {}
      if (!isMounted) {
        // subTree -> initialVNode
        const subTree = (instance.subTree = instance.render.call(proxy))
        console.log('setupRenderEffect ----- init subTree  >>>>', subTree)
        // initialVNode -> patch
        // initialVNode -> element 类型 -> mountElement 渲染
        patch(null, subTree, container, instance)

        // mount 完成之后才可以获取到虚拟 DOM 的el
        initialVNode.el = subTree.el
        instance.isMounted = true
      } else {
        const subTree = instance.render.call(proxy)
        const prevSubTree = instance.subTree
        console.log(
          'setupRenderEffect ----- update prevSubTree subTree  >>>>',
          prevSubTree,
          subTree
        )
        instance.subTree = subTree

        patch(prevSubTree, subTree, container, instance)
      }
    })
  }

  return {
    createApp: createAppApi(render)
  }
}

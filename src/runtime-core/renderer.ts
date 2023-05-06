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
    patch(null, vnode, rootContainer, null, null)
  }

  // n1 旧节点；n2 新节点
  function patch(n1, n2, container, parentComponent, anchor) {
    console.log('patch ----- n1, n2  >>>>', n1, n2)
    const { type = '', shapeFlags } = n2 || {}

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor)
        break

      case Text:
        processText(n1, n2, container)
        break

      default:
        if (shapeFlags & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor)
        } else if (shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent, anchor)
        }
        break
    }
  }

  // 处理 Fragment 节点
  function processFragment(n1, n2, container, parentComponent, anchor) {
    mountChildren(n2.children, container, parentComponent, anchor)
  }

  // 处理 Text 节点
  function processText(n1, n2, container) {
    const { children } = n2 || {}
    const textVNode = (n2.el = document.createTextNode(children))
    container.append(textVNode)
  }

  // 处理 Element 类型
  function processElement(n1, n2, container, parentComponent, anchor) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor)
    } else {
      patchElement(n1, n2, container, parentComponent, anchor)
    }
  }

  // 初始化 Element
  function mountElement(vnode, container, parentComponent, anchor) {
    console.log('processElement ----- vnode  >>>>', vnode)
    const { type, children, props, shapeFlags } = vnode || {}
    // createElement
    const el = (vnode.el = hostCreateElement(type))

    // children -> String, Array<vnode>
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent, anchor)
    }

    // props
    for (const key in props) {
      const val = props[key]
      // patchProps
      console.log('patchProps ========= val ----', props, val)
      hostPatchProps(el, key, null, val)
    }
    // insert
    hostInsert(el, container, anchor)
  }
  function mountChildren(children, container, parentComponent, anchor) {
    children?.forEach((v) => {
      patch(null, v, container, parentComponent, anchor)
    })
  }

  // 更新 Element
  function patchElement(n1, n2, container, parentComponent, anchor) {
    console.log('patchElement ==== n1, n2 >>>>>', n1, n2)
    const oldProps = n1.props || EMPTY_OBJECT
    const newProps = n2.props || EMPTY_OBJECT

    const el = (n2.el = n1.el)

    patchProps(el, oldProps, newProps)

    patchChildren(n1, n2, el, parentComponent, anchor)
  }
  // 对比 props
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

  // 对比 children
  function patchChildren(n1, n2, container, parentComponent, anchor) {
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
        mountChildren(nextChildren, container, parentComponent, anchor)
      } else {
        // 旧节点为 Array
        patchKeyedChildren(
          prevChildren,
          nextChildren,
          container,
          parentComponent,
          anchor
        )
      }
    }
  }
  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    const l2 = c2.length
    let i = 0
    let e1 = c1.length - 1
    let e2 = l2 - 1

    function isSomeVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key
    }

    // 1. 左侧开始对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      i++
    }

    // 2. 右侧开始对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      e1--
      e2--
    }

    // 3. 新的比旧的多 -> 创建
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1
        const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // 3. 旧的比新的多 -> 删除
      while (i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 6,7 中间对比
      const s1 = i
      const s2 = i

      // 需要处理的节点
      const toBePatched = e2 - s2 + 1
      // 处理过的节点
      let patched = 0
      // 新节点的映射表
      const key2NewIndexMap = new Map()
      // 新节点于旧节点的映射表
      const newIndex2OldIndexMap = new Array(toBePatched)
      // 是否需要移动
      let moved = false
      let maxNewIndexSoFar = 0

      for (let i = 0; i < toBePatched; i++) {
        newIndex2OldIndexMap[i] = 0
      }
      // 遍历新节点，得出映射关系
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i] || {}
        key2NewIndexMap.set(nextChild.key, i)
      }
      // 遍历旧节点，判断 key，或者遍历新节点来判断是否存在于旧节点中
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i] || {}

        if (patched >= toBePatched) {
          hostRemove(prevChild.el)
          continue
        }

        let newIndex
        if (prevChild.key != null) {
          // 通过映射表选取
          newIndex = key2NewIndexMap.get(prevChild.key)
        } else {
          // 通过遍历新节点
          for (let j = s2; j <= e2; j++) {
            if (isSomeVNodeType(prevChild, c2[j])) {
              newIndex = j
              break
            }
          }
        }
        // 是否存在旧节点
        if (!newIndex) {
          // 不存在则删除
          hostRemove(prevChild.el)
        } else {
          // 新节点大于等于已记录的节点时，不需要移动
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            moved = true
          }
          newIndex2OldIndexMap[newIndex - s2] = i + 1
          patch(prevChild, c2[newIndex], container, parentComponent, null)
          patched++
        }
      }

      // 获取最长递增子序列
      const increasingNewIndexSequence = moved
        ? getSequence(newIndex2OldIndexMap)
        : []
      let j = increasingNewIndexSequence.length - 1
      // 倒序遍历，从后面开始插入，因为后面的节点已确定
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2
        const nextChild = c2[nextIndex]
        const nextPos = nextIndex + 1
        const anchor = nextPos < l2 ? c2[nextPos].el : null

        if (newIndex2OldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor)
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[i]) {
            hostInsert(nextChild.el, container, anchor)
          } else {
            j--
          }
        }
      }
    }
  }
  function unmountChildren(children) {
    ;(children || []).forEach((child) => {
      const { el } = child || {}
      hostRemove(el)
    })
  }

  // 处理组件类型
  function processComponent(n1, n2, container, parentComponent, anchor) {
    console.log('processComponent ----- n2  >>>>', n2)
    mountComponent(n2, container, parentComponent, anchor)
  }

  // 挂载组件
  function mountComponent(initialVNode, container, parentComponent, anchor) {
    const instance = createComponentInstance(initialVNode, parentComponent)
    console.log('mountComponent ----- instance 111 >>>>', instance)

    setupComponent(instance)
    console.log('mountComponent ----- instance 222 >>>>', instance)

    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  // 调用 render，进行拆箱操作
  function setupRenderEffect(instance, initialVNode, container, anchor) {
    effect(() => {
      const { proxy, isMounted } = instance || {}
      if (!isMounted) {
        // subTree -> initialVNode
        const subTree = (instance.subTree = instance.render.call(proxy))
        console.log('setupRenderEffect ----- init subTree  >>>>', subTree)
        // initialVNode -> patch
        // initialVNode -> element 类型 -> mountElement 渲染
        patch(null, subTree, container, instance, anchor)

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

        patch(prevSubTree, subTree, container, instance, anchor)
      }
    })
  }

  return {
    createApp: createAppApi(render)
  }
}

// 获取最长递增子序列
function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

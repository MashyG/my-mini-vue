import { effect } from '../reactivity/effect'
import { EMPTY_OBJECT } from '../shared'
import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { createAppApi } from './createApp'
import { shouldUpdateComponent } from './updateComponentUtils'
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
        // 如果是这种情况的话就说明 e2 也就是新节点的数量大于旧节点的数量
        // 也就是说新增了 vnode
        // 应该循环 c2
        // 锚点的计算：新的节点有可能需要添加到尾部，也可能添加到头部，所以需要指定添加的问题
        // 要添加的位置是当前的位置(e2 开始)+1
        // 因为对于往左侧添加的话，应该获取到 c2 的第一个元素
        // 所以我们需要从 e2 + 1 取到锚点的位置
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
      // 是否需要移动
      let moved = false
      let maxNewIndexSoFar = 0
      // 先把 key 和 newIndex 绑定好，方便后续基于 key 找到 newIndex
      // 时间复杂度是 O(1)
      // 遍历新节点，得出映射关系
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i] || {}
        key2NewIndexMap.set(nextChild.key, i)
      }

      // 初始化 从新的index映射为老的index
      // 创建数组的时候给定数组的长度，这个是性能最快的写法
      // 新节点针对旧节点的映射表
      const newIndex2OldIndexMap = new Array(toBePatched)
      // 初始化为 0 , 后面处理的时候 如果发现是 0 的话，那么就说明新值在老的里面不存在
      for (let i = 0; i < toBePatched; i++) {
        newIndex2OldIndexMap[i] = 0
      }

      // 遍历旧节点，判断 key 是否能找到 newIndex，或者遍历新节点来判断是否存在于旧节点中
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i] || {}

        // 优化点
        // 如果老的节点大于新节点的数量的话，那么这里在处理老节点的时候就直接删除即可
        if (patched >= toBePatched) {
          hostRemove(prevChild.el)
          continue
        }

        let newIndex
        if (prevChild.key != null) {
          // 通过映射表选取
          // 时间复杂度O(1)
          newIndex = key2NewIndexMap.get(prevChild.key)
        } else {
          // 通过遍历新节点
          // 时间复杂度O(n)
          for (let j = s2; j <= e2; j++) {
            if (isSomeVNodeType(prevChild, c2[j])) {
              newIndex = j
              break
            }
          }
        }
        // 是否存在旧节点
        if (newIndex === undefined) {
          // 不存在则删除
          hostRemove(prevChild.el)
        } else {
          // 把新节点的索引和老的节点的索引建立映射关系
          // { 新节点索引: 旧节点索引 }
          // i + 1 是因为 i 有可能是0 (0 的话会被认为新节点在老的节点中不存在)
          newIndex2OldIndexMap[newIndex - s2] = i + 1
          // 来确定中间的节点是不是需要移动
          // 新的 newIndex 如果一直是升序的话，那么就说明没有移动
          // 所以我们可以记录最后一个节点在新的里面的索引，然后看看是不是升序
          // 不是升序的话，我们就可以确定节点移动过了
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            moved = true
          }
          patch(prevChild, c2[newIndex], container, parentComponent, null)
          patched++
        }
      }

      // 利用最长递增子序列来优化移动逻辑
      // 因为元素是升序的话，那么这些元素就是不需要移动的
      // 而我们就可以通过最长递增子序列来获取到升序的列表
      // 在移动的时候我们去对比这个列表，如果对比上的话，就说明当前元素不需要移动
      // 通过 moved 来进行优化，如果没有移动过的话 那么就不需要执行算法
      // getSequence 返回的是 newIndexToOldIndexMap 的索引值
      // 所以后面我们可以直接遍历索引值来处理，也就是直接使用 toBePatched 即可
      const increasingNewIndexSequence = moved
        ? getSequence(newIndex2OldIndexMap)
        : []
      let j = increasingNewIndexSequence.length - 1

      // 倒序遍历，从后面开始插入，因为后面的节点已确定
      // 遍历新节点
      // 1. 需要找出老节点没有，而新节点有的 -> 需要把这个节点创建
      // 2. 最后需要移动一下位置，比如 [c,d,e] -> [e,c,d]

      // 这里倒循环是因为在 insert 的时候，需要保证锚点是处理完的节点（也就是已经确定位置了）
      // 因为 insert 逻辑是使用的 insertBefore()
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 确定当前要处理的节点索引
        const nextIndex = i + s2
        const nextChild = c2[nextIndex]
        // 锚点等于当前节点索引+1
        // 也就是当前节点的后面一个节点(又因为是倒遍历，所以锚点是位置确定的节点)
        const nextPos = nextIndex + 1
        const anchor = nextPos < l2 ? c2[nextPos].el : null

        if (newIndex2OldIndexMap[i] === 0) {
          // 说明新节点在老的里面不存在，需要创建
          patch(null, nextChild, container, parentComponent, anchor)
        } else if (moved) {
          // 需要移动
          // 1. j 已经没有了 说明剩下的都需要移动了
          // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            hostInsert(nextChild.el, container, anchor)
          } else {
            // 这里就是命中了  index 和 最长递增子序列的值
            // 所以可以移动指针了
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
    if (!n1) {
      mountComponent(n2, container, parentComponent, anchor)
    } else {
      updateComponent(n1, n2)
    }
  }

  // 挂载组件
  function mountComponent(initialVNode, container, parentComponent, anchor) {
    // 存储 component，供后续更新组件使用
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ))
    console.log('mountComponent ----- instance 111 >>>>', instance)

    setupComponent(instance)
    console.log('mountComponent ----- instance 222 >>>>', instance)

    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  // 更新组件
  function updateComponent(n1, n2) {
    const instance = (n2.component = n1.component)
    console.log('updateComponent ----- instance >>>>', instance)
    // 判断是否需要更新组件
    if (shouldUpdateComponent(n1, n2)) {
      // 暂存下次需要更新的 vnode
      instance.next = n2
      // 这里的 update 是在 setupRenderEffect 里面初始化的，update 函数除了当内部的响应式对象发生改变的时候会调用
      // 还可以直接主动的调用(这是属于 effect 的特性)
      // 调用 update 再次更新调用 patch 逻辑
      // 在update 中调用的 next 就变成了 n2了
      // ps：可以详细的看看 update 中 next 的应用
      instance.update()
    } else {
      // 不需要更新的话，那么只需要覆盖下面的属性即可
      n2.el = n1.el
      instance.vnode = n2
    }
  }

  // 调用 render，进行拆箱操作
  function setupRenderEffect(instance, initialVNode, container, anchor) {
    // effect 返回的 runner 供后续更新组件使用
    instance.update = effect(() => {
      const { proxy, isMounted, next, vnode } = instance || {}
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
        // 需要一个待更新的 vnode
        if (next) {
          next.el = vnode.el
          updateComponentPreRender(instance, next)
        }
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

function updateComponentPreRender(instance, nextVNode) {
  instance.vnode = nextVNode
  instance.next = null
  // props 简单实现赋值
  instance.props = nextVNode.props
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

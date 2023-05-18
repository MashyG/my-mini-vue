import { NodeTypes } from '../ast'
import { isText } from '../utils'

export function transformText(node: any) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const children = node.children
      const { length } = children || []
      let currentContainer

      for (let i = 0; i < length; i++) {
        const child = children[i]
        // 看看下一个节点是不是 text 类
        if (isText(child)) {
          for (let j = i + 1; j < length; j++) {
            const nextChild = children[j]
            if (isText(nextChild)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child]
                }
              }

              currentContainer.children.push(' + ', nextChild)
              children.splice(j, 1)
              j--
            } else {
              currentContainer = undefined
              break
            }
          }
        }
      }
    }
  }
}

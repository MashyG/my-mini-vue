import { NodeTypes } from './ast'
import { TO_DISPLAY_STRING } from './runtimeHelpers'

interface NodeTransforms {
  nodeTransforms: any[]
}
interface TransformContext {
  root: any
  nodeTransforms: NodeTransforms[]
  helpers: any
  helper: any
}

export function transform(root: any, options: NodeTransforms | any = {}) {
  const context = createTransformContext(root, options)
  // 1. 深度优先遍历
  traverseNode(root, context)

  // root.codegenNode
  createRootCodegen(root)

  root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root: any) {
  const child = root.children[0]
  if (child.type === NodeTypes.ELEMENT) {
    root.codegenNode = child.codegenNode
  } else {
    root.codegenNode = child
  }
}

function createTransformContext(
  root: any,
  options: NodeTransforms
): TransformContext {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key) {
      context.helpers.set(key, 1)
    }
  }
  return context
}

function traverseNode(node: any, context: TransformContext) {
  const exitFns: any = []
  const { nodeTransforms } = context || {}
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transformFunc: any = nodeTransforms[i]
    const onExit = transformFunc(node, context)
    if (onExit) {
      exitFns.push(onExit)
    }
  }
  // console.log('node', node)

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node.children, context)
      break
    default:
      break
  }

  let i = exitFns.length
  // i-- 这个很巧妙
  // 使用 while 是要比 for 快 (可以使用 https://jsbench.me/ 来测试一下)
  while (i--) {
    exitFns[i]()
  }
}

function traverseChildren(children: any, context: TransformContext) {
  if (children) {
    for (let j = 0; j < children.length; j++) {
      const childNode = children[j]
      traverseNode(childNode, context)
    }
  }
}

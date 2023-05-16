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
  root.codegenNode = root.children[0]
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
  const { nodeTransforms } = context || {}
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transformFunc: any = nodeTransforms[i]
    transformFunc(node)
  }
  console.log('node', node)

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
}

function traverseChildren(children: any, context: TransformContext) {
  if (children) {
    for (let j = 0; j < children.length; j++) {
      const childNode = children[j]
      traverseNode(childNode, context)
    }
  }
}

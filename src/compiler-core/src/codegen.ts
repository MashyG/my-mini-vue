import { isString } from '../../shared'
import { NodeTypes } from './ast'
import {
  CREATE_ELEMENT_VNODE,
  TO_DISPLAY_STRING,
  helperMapName
} from './runtimeHelpers'

export function generate(ast) {
  // console.log('ast === ', ast)

  const context = createCodegenContext()
  const { push } = context || {}

  genFunctionPreamble(ast, context)
  push('return ')

  const functionName = 'render'
  const args = ['_ctx', '_cache']
  const signature = args.join(', ')

  push(`function ${functionName}(${signature}) {\n`)
  push(`return `)
  genNode(ast.codegenNode, context)
  push(`\n`)
  push(`}`)

  // console.log('context.code ---->>>>> ', context.code)

  return {
    code: context.code
  }
}

function createCodegenContext() {
  const context = {
    code: '',
    push(source) {
      context.code += source
    },
    helper(key) {
      return `_${helperMapName[key]}`
    }
  }
  return context
}

function genFunctionPreamble(ast, context) {
  const { helpers } = ast || {}
  const { length } = helpers || []

  if (length > 0) {
    const VueBinging = 'Vue'
    const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`
    context.push(
      `const { ${helpers.map(aliasHelper).join(', ')} } = ${VueBinging}\n`
    )
  }
}

function genNode(node: any, context) {
  // console.log('genNode === ', node)
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.ELEMENT:
      genElement(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    default:
      break
  }
}

// 纯字符串
function genText(node, context) {
  context.push(`'${node.content}'`)
}

// 插值
function genInterpolation(node, context) {
  const { push, helper } = context || {}
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}

// 表达式
function genExpression(node, context) {
  context.push(`${node.content}`)
}

// 标签
function genElement(node, context) {
  const { push, helper } = context || {}
  const { tag, props, children } = node || {}
  console.log('genElement -- node', node)

  push(`${helper(CREATE_ELEMENT_VNODE)}(`)

  genNodeList(genNullableArgs([tag, props, children]), context)

  push(')')
}
function genNullableArgs(args) {
  // 把末尾为null 的都删除掉
  // vue3源码中，后面可能会包含 patchFlag、dynamicProps 等编译优化的信息
  // 而这些信息有可能是不存在的，所以在这边的时候需要删除掉
  let i = args.length

  // 这里 i-- 用的还是特别的巧妙的
  // 当为0 的时候自然就退出循环了
  while (i--) {
    if (args[i] != null) break
  }

  // 把为 falsy 的值都替换成 "null"
  return args.slice(0, i + 1).map((arg) => arg || 'null')
}
function genNodeList(nodes: any, context) {
  const { push } = context || {}
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else {
      genNode(node, context)
    }

    // node 和 node 之间需要加上 逗号(,)
    // 但是最后一个不需要 "div", [props], [children]
    if (i < node.length - 1) {
      push(', ')
    }
  }
}

// 复合类型：hi~{{data}}
function genCompoundExpression(node, context) {
  console.log('genCompoundExpression', node)
  const { push } = context || {}
  const children = node.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (isString(child)) {
      push(child)
    } else {
      genNode(child, context)
    }
  }
}

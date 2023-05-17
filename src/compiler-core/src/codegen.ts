import { NodeTypes } from './ast'
import {
  CREATE_ELEMENT_VNODE,
  TO_DISPLAY_STRING,
  helperMapName
} from './runtimeHelpers'

export function generate(ast) {
  console.log('ast === ', ast)

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

  console.log('context.code ---->>>>> ', context.code)

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
  console.log('genNode === ', node)
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

function genElement(node, context) {
  const { push, helper } = context || {}
  const { tag, children } = node || {}
  console.log('genElement -- children', children)
  push(`${helper(CREATE_ELEMENT_VNODE)}('${tag}', null, `)

  for (let i = 0; i < children.length; i++) {
    const element = children[i]
    genNode(element, context)
  }

  push(')')
}
